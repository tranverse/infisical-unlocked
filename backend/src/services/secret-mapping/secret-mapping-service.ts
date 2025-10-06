import TSecretMappingDALFactory from "./secret-mapping-dal";
import TSecretV2BridgeDALFactory from "../secret-v2-bridge/secret-v2-bridge-dal";
import {
  TUpdateMappingSecretDTO,
  TGetMappingSecretDTO,
  TGetSecretsAndMappingSecretDTO,
  TCreateMappingSecretDTO
} from "./secret-mapping-types";
import { TKmsServiceFactory } from "../kms/kms-service";
import { BadRequestError, ForbiddenRequestError, NotFoundError } from "@app/lib/errors";
import { KmsDataKey } from "../kms/kms-types";
import { reshapeBridgeSecret } from "../secret-v2-bridge/secret-v2-bridge-fns";
import { ActionProjectType } from "@app/db/schemas";
import { TPermissionServiceFactory } from "@app/ee/services/permission/permission-service-types";
import { TSecretV2BridgeDALFactory } from "./secret-v2-bridge-dal";
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
    console.log("projectId", projectId);
    console.log("mappingSecret", mappingSecret);

    const returnSecret = mappingSecret.map((secret) => {
      console.log(secret.value);
      return {
        ...secret,
        value: secret.value ? secretManagerDecryptor({ cipherTextBlob: secret.value }).toString() : ""
      };
    });
    console.log("returnSecret", returnSecret);

    return returnSecret;
  };
  const getSecretsAndMappingSecretInProject = async ({
    actor,
    actorId,
    actorOrgId,
    actorAuthMethod,
    projectId,
    mappingId,
    environment = "env",
    secretPath = "/"
  }: TGetSecretsAndMappingSecretDTO) => {
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

    const { mappingSecret, secrets } = await secretMappingDAL.getSecretsAndMappingSecretInProject(mappingId);
    console.log("mappingSecret", mappingSecret);

    const returnMappingSecret = {
      ...mappingSecret,
      value: mappingSecret.value ? secretManagerDecryptor({ cipherTextBlob: mappingSecret.value }).toString() : ""
    };

    const returnSecrets = secrets.map((secret) => {
      return reshapeBridgeSecret(projectId, secret.env, secretPath, {
        ...secret,
        value: secret.encryptedValue
          ? secretManagerDecryptor({ cipherTextBlob: secret.encryptedValue }).toString()
          : "",
        comment: secret.encryptedComment
          ? secretManagerDecryptor({ cipherTextBlob: secret.encryptedComment }).toString()
          : "",
        folderName: secret.folderName,
        env: secret.env,
        secretKey: secret.secretKey,
        secretPath: secretPath
      });
    });
    console.log("returnSecrets", returnSecrets);

    return {
      returnMappingSecret,
      returnSecrets
    };
  };

  const createMappingSecretInProject = async ({
    actor,
    actorId,
    projectId,
    actorOrgId,
    actorAuthMethod,
    secretPath,
    secrets,
    value
  }: TCreateMappingSecretDTO) => {
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
    console.log("input secret", secrets);
    const { encryptor: secretManagerEncryptor, decryptor: secretManagerDecryptor } =
      await kmsService.createCipherPairWithDataKey({ type: KmsDataKey.SecretManager, projectId });

    const encryptedValue = secretManagerEncryptor({ plainText: Buffer.from(value) }).cipherTextBlob;

    const secretMappingKey = await secretMappingDAL.generateSecretMappingKey();

    console.log("secrets.secrets", secrets);
    let newMappingSecret = await secretMappingDAL.createSecretMapping({
      key: secretMappingKey,
      value: encryptedValue
    });
    let mappingId = newMappingSecret.id;

    for (const secretId of secrets) {
      console.log("secretId", secretId);
      console.log("mappingId", mappingId);

      const update = await secretDAL.updateMappingIdById(secretId, mappingId);
      console.log("update:", update);
    }

    return "Created";
  };
  const updateValueMappingSecret = async ({
    actor,
    actorId,
    environment,
    projectId,
    actorOrgId,
    actorAuthMethod,
    secretPath,
    ...inputSecret
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
    const oldMappingSecret = await secretMappingDAL.findOneByKey(inputSecret.secretKey);
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
    const reshapedSecrets = secrets.map((secret) => {
      return reshapeBridgeSecret(projectId, secret.env, secretPath, {
        ...secret,
        value: secret.encryptedValue
          ? secretManagerDecryptor({ cipherTextBlob: secret.encryptedValue }).toString()
          : "",
        comment: secret.encryptedComment
          ? secretManagerDecryptor({ cipherTextBlob: secret.encryptedComment }).toString()
          : "",
        folderName: secret.folderName
      });
    });
    console.log("reshapedSecrets", reshapedSecrets);

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
    const mappingSecret = await secretMappingDAL.deleteSecretMappingById(mappingId);
    return "Deleted";
  };

  return {
    updateValueMappingSecret,
    getMappingSecretsInProject,
    deleteMappingSecretsInProject,
    getSecretsAndMappingSecretInProject,
    createMappingSecretInProject
  };
};
