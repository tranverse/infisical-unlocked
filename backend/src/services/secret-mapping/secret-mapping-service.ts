import TSecretMappingDALFactory from "./secret-mapping-dal";
import TSecretV2BridgeDALFactory from "../secret-v2-bridge/secret-v2-bridge-dal";
import { ForbiddenError, MongoAbility, PureAbility, subject } from "@casl/ability";
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
import { throwIfMissingReferenceSecretReadValueOrDescribePermission } from "@app/ee/services/permission/permission-fns";
import { TSecretFolderDALFactory } from "../secret-folder/secret-folder-dal";
import { TProjectDALFactory } from "../project/project-dal";
import { TProjectEnvDALFactory } from "../project-env/project-env-dal";
import { TPermissionServiceFactory } from "@app/ee/services/permission/permission-service-types";

import {
  ProjectPermissionActions,
  ProjectPermissionCommitsActions,
  ProjectPermissionReferenceSecretActions,
  ProjectPermissionSet,
  ProjectPermissionSub,
  ProjectPermissionSecretActions
} from "@app/ee/services/permission/project-permission";
type TSecretMappingServiceFactoryDep = {
  secretMappingDAL: TSecretMappingDALFactory;
  secretDAL: TSecretV2BridgeDALFactory;
  kmsService: Pick<TKmsServiceFactory, "createCipherPairWithDataKey" | "decryptWithInputKey" | "decryptWithRootKey">;
  folderDAL: TSecretFolderDALFactory;
  projectEnvDAL: TProjectEnvDALFactory;
  permissionService: Pick<TPermissionServiceFactory, "getProjectPermission" | "getProjectPermissions">;
};
import { recursivelyGetSecretPaths, reshapeBridgeSecret } from "../secret-v2-bridge/secret-v2-bridge-fns";
export type TSecretMappingServiceFactory = ReturnType<typeof secretMappingServiceFactory>;

export const secretMappingServiceFactory = ({
  secretMappingDAL,
  secretDAL,
  kmsService,
  permissionService,
  folderDAL,
  projectEnvDAL
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
    throwIfMissingReferenceSecretReadValueOrDescribePermission(permission);
    const { encryptor: secretManagerEncryptor, decryptor: secretManagerDecryptor } =
      await kmsService.createCipherPairWithDataKey({ type: KmsDataKey.SecretManager, projectId });

    let mappingSecret = await secretMappingDAL.getAllSecretMappingInProject(projectId);

    let groupMappingSecret: any[] = [];
    const updated = [];
    for (const sec of mappingSecret) {
      let service = await secretMappingDAL.getServicesOfMappingSecret(sec.id);

      let env = service[0].environment;
      let slug = service[0].slug;

      const secrets = await secretDAL.getSecretsByMappingId(sec.id);

      const returnSecrets = secrets.map((secret) => {
        return reshapeBridgeSecret(projectId, secret.environment, secret.folderName, {
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
          secretPath: `/${secret.folderName}`
        });
      });

      updated.push({
        ...sec,
        services: service,
        environment: env,
        slug: slug,
        secrets: returnSecrets
      });
    }

    mappingSecret = updated;
    const returnSecret = mappingSecret.map((secret) => {
      return {
        ...secret,
        value: secret.value ? secretManagerDecryptor({ cipherTextBlob: secret.value }).toString() : ""
      };
    });

    return returnSecret;
  };
  // count mapping secret in project
  const countMappingSecretsInProject = async ({
    actor,
    actorId,
    actorOrgId,
    actorAuthMethod,
    projectId
  }: TGetMappingSecretDTO) => {
    let mappingSecret = await secretMappingDAL.getAllSecretMappingInProject(projectId);
    console.log("mapping", mappingSecret.length);
    return mappingSecret.length;
  };

  const getSecretsAndMappingSecretInProject = async ({
    actor,
    actorId,
    actorOrgId,
    actorAuthMethod,
    projectId,
    mappingId,
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
    const { decryptor: secretManagerDecryptor } = await kmsService.createCipherPairWithDataKey({
      type: KmsDataKey.SecretManager,
      projectId
    });

    const { mappingSecret, secrets } = await secretMappingDAL.getSecretsAndMappingSecretInProject(mappingId);

    const canReadSecrets = permission.can(
      ProjectPermissionSecretActions.DescribeSecret,
      subject(ProjectPermissionSub.Secrets, {})
    );

    if (!canReadSecrets) {
      return {
        returnMappingSecret: mappingSecret
          ? {
              ...mappingSecret,
              value: mappingSecret.value
                ? secretManagerDecryptor({ cipherTextBlob: mappingSecret.value }).toString()
                : ""
            }
          : null,
        returnSecrets: [],
        secretCount: secrets.length
      };
    }

    const returnMappingSecret = mappingSecret
      ? {
          ...mappingSecret,
          value: mappingSecret.value
            ? secretManagerDecryptor({
                cipherTextBlob: mappingSecret.value
              }).toString()
            : ""
        }
      : null;

    const returnSecrets = await Promise.all(
      secrets.map(async (secret) => {
        return reshapeBridgeSecret(projectId, secret.environment, secret?.folderName, {
          ...secret,
          value: secret.encryptedValue
            ? secretManagerDecryptor({
                cipherTextBlob: secret.encryptedValue
              }).toString()
            : "",
          comment: secret.encryptedComment
            ? secretManagerDecryptor({
                cipherTextBlob: secret.encryptedComment
              }).toString()
            : "",
          folderName: secret.folderName,
          env: secret.env,
          secretKey: secret.secretKey
        });
      })
    );

    return {
      returnMappingSecret,
      returnSecrets,
      secretCount: secrets.length
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
    const { encryptor: secretManagerEncryptor, decryptor: secretManagerDecryptor } =
      await kmsService.createCipherPairWithDataKey({ type: KmsDataKey.SecretManager, projectId });

    const encryptedValue = secretManagerEncryptor({ plainText: Buffer.from(value) }).cipherTextBlob;

    const secretMappingKey = await secretMappingDAL.generateSecretMappingKey();

    let newMappingSecret = await secretMappingDAL.createSecretMapping({
      key: secretMappingKey,
      value: encryptedValue
    });
    let mappingId = newMappingSecret.id;
    let environment = secrets[0].environment;
    for (const secretId of secrets) {
      const update = await secretDAL.updateMappingIdById(secretId, mappingId);
    }
    newMappingSecret = {
      ...newMappingSecret,
      value: newMappingSecret.value ? secretManagerDecryptor({ cipherTextBlob: newMappingSecret.value }).toString() : ""
    };

    return { environment, mappingId, key: secretMappingKey, newMappingSecret };
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

    const { encryptor: secretManagerEncryptor, decryptor: secretManagerDecryptor } =
      await kmsService.createCipherPairWithDataKey({ type: KmsDataKey.SecretManager, projectId });

    const encryptedNewValue = secretManagerEncryptor({ plainText: Buffer.from(inputSecret.newValue) }).cipherTextBlob;
    const encryptedOldValue = secretManagerEncryptor({ plainText: Buffer.from(inputSecret.value) }).cipherTextBlob;

    let mappingSecret;
    let mappingSecretId: string;
    const oldMappingSecret = await secretMappingDAL.findOneByKey(inputSecret.secretKey);

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
    let service = await secretMappingDAL.getServicesOfMappingSecret(updateMappingSecret.id);
    let env = service[0].environment;
    let slug = service[0].slug;
    let returnUpdateMappingSecret = {
      ...updateMappingSecret,
      services: service,
      environment: env,
      slug: slug
    };

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

    return {
      returnUpdateMappingSecret: {
        ...returnUpdateMappingSecret,
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

    const environment = await secretMappingDAL.getEnvironmentOfMappingSecret(mappingId);
    const mappingSecretToDelete = await secretMappingDAL.findById(mappingId);

    if (!mappingSecretToDelete) throw new NotFoundError({ message: "Mapping secret not found" });
    const mappingSecret = await secretMappingDAL.deleteSecretMappingById(mappingId);
    return { mappingId, environment, key: mappingSecret.key };
  };

  return {
    updateValueMappingSecret,
    getMappingSecretsInProject,
    deleteMappingSecretsInProject,
    getSecretsAndMappingSecretInProject,
    createMappingSecretInProject,
    countMappingSecretsInProject
  };
};
