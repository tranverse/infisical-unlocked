import TSecretMappingDALFactory from "./secret-mapping-dal";
import TSecretV2BridgeDALFactory from "../secret-v2-bridge/secret-v2-bridge-dal";
import { TUpdateMappingSecretDTO, TGetMappingSecretDTO } from "./secret-mapping-types";
import { TKmsServiceFactory } from "../kms/kms-service";
import { BadRequestError, ForbiddenRequestError, NotFoundError } from "@app/lib/errors";
import { KmsDataKey } from "../kms/kms-types";
import { reshapeBridgeSecret } from "../secret-v2-bridge/secret-v2-bridge-fns";
import { ActionProjectType } from "@app/db/schemas";
import { TPermissionServiceFactory } from "@app/ee/services/permission/permission-service-types";

type TSecretMappingServiceFactoryDep = {
  secretMappingDAL: TSecretMappingDALFactory;
  secretDAL: TSecretV2BridgeDALFactory;
  kmsService: Pick<TKmsServiceFactory, "createCipherPairWithDataKey" | "decryptWithInputKey" | "decryptWithRootKey">;
  permissionService: Pick<TPermissionServiceFactory, "getProjectPermission">;
};

export type TSecretMappingServiceFactory = ReturnType<typeof secretMappingServiceFactory>;

export const secretMappingServiceFactory = ({
  secretMappingDAL,
  secretDAL,
  kmsService,
  permissionService
}: TSecretMappingServiceFactoryDep) => {
  const getMappingSecretsInProject = async ({
    actor,
    actorId,
    actorOrgId,
    actorAuthMethod,
    projectId
  }: TGetMappingSecretDTO) => {
    const { permission } = await permissionService.getProjectPermission({
      actor,
      actorId,
      projectId,
      actorAuthMethod,
      actorOrgId,
      actionProjectType: ActionProjectType.SecretManager
    });

    const { encryptor: secretManagerEncryptor, decryptor: secretManagerDecryptor } =
      await kmsService.createCipherPairWithDataKey({ type: KmsDataKey.SecretManager, projectId });

    const mappingSecret = await secretMappingDAL.getAllSecretMappingInProject(projectId);
    console.log(secretMappingDAL);
    const returnSecret = mappingSecret.map((secret) => {
      return {
        ...secret,
        value: secret.value ? secretManagerDecryptor({ cipherTextBlob: secret.value }).toString() : ""
      };
    });
    console.log(returnSecret);

    return returnSecret;
  };

  const updateValueMappingSecret = async ({
    actor,
    actorId,
    environment,
    projectId,
    actorOrgId,
    actorAuthMethod,
    secretPath
  }: TUpdateMappingSecretDTO) => {
    const { permission } = await permissionService.getProjectPermission({
      actor,
      actorId,
      projectId,
      actorAuthMethod,
      actorOrgId,
      actionProjectType: ActionProjectType.SecretManager
    });
    // encrypt value
    console.log("project id", projectId);
    console.log("input secret", inputSecret);

    const { encryptor: secretManagerEncryptor, decryptor: secretManagerDecryptor } =
      await kmsService.createCipherPairWithDataKey({ type: KmsDataKey.SecretManager, projectId });

    const encryptedNewValue = secretManagerEncryptor({ plainText: Buffer.from(inputSecret.newValue) }).cipherTextBlob;
    const encryptedOldValue = secretManagerEncryptor({ plainText: Buffer.from(inputSecret.value) }).cipherTextBlob;

    let mappingSecret;
    let mappingSecretId: string;
    const oldMappingSecret = await secretMappingDAL.findOneByKey(secretKey);
    console.log("oldMappingSecret", oldMappingSecret);

    mappingSecretId = oldMappingSecret.id;
    mappingSecret = oldMappingSecret;

    if (encryptedNewValue) {
      const doesNewValueSecretExist = await secretMappingDAL.findOneByValue({
        value: encryptedNewValue
      });
      if (doesNewValueSecretExist.length >= 1)
        throw new BadRequestError({ message: "Value of Mapping Secret already exist" });
    }
    const { updateMappingSecret, secrets } = await secretMappingDAL.updateMappingSecretValue(
      encryptedNewValue,
      mappingSecretId
    );
    console.log("secrets", environment);
    console.log("updateMappingSecret", updateMappingSecret);
    const reshapedSecrets = secrets.map((secret) => {
      return reshapeBridgeSecret(projectId, environment, secretPath, {
        ...secret,
        value: secret.encryptedValue
          ? secretManagerDecryptor({ cipherTextBlob: secret.encryptedValue }).toString()
          : "",
        comment: secret.encryptedComment
          ? secretManagerDecryptor({ cipherTextBlob: secret.encryptedComment }).toString()
          : ""
      });
    });
    return {
      updateMappingSecret: {
        ...updateMappingSecret,
        value: updateMappingSecret.value
          ? secretManagerDecryptor({ cipherTextBlob: updateMappingSecret.value }).toString()
          : ""
      },
      secrets: reshapedSecrets
    };
  };

  const deleteMappingSecretsInProject = async ({
    actor,
    actorId,
    actorOrgId,
    actorAuthMethod,
    mappingId,
    projectId
  }: TDeleteMappingSecretDTO) => {
    const { permission } = await permissionService.getProjectPermission({
      actor,
      actorId,
      projectId,
      actorAuthMethod,
      actorOrgId,
      actionProjectType: ActionProjectType.SecretManager
    });

    const mappingSecretToDelete = await secretMappingDAL.findById(mappingId);
    if (!mappingSecretToDelete) throw new NotFoundError({ message: "Mapping secret not found" });
    console.log("secretMappingDAL", secretMappingDAL);
    const mappingSecret = await secretMappingDAL.deleteSecretMappingById(mappingId);
    console.log("deltete", mappingSecret);

    return "Deleted";
  };

  return {
    updateValueMappingSecret,
    getMappingSecretsInProject,
    deleteMappingSecretsInProject
  };
};
