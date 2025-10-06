import { ProjectEnv } from "../projects/types";
import { SecretV3RawSanitized } from "../secrets/types";
export type TGetMappingSecretDTO = {
  projectId: string;
};

export type TGetSecretsAndMappingSecretDTO = {
  projectId: string;
  mappingId: string;
};

export type TMappingSecret = {
  id: string;
  value: string;
  key: string;
  createdAt: string;
  updatedAt: string;
};

export type TMappingSecretDTO = {
  mappingSecrets: TMappingSecret[];
};

export type TSecretAndMappingSecret = {
  mappingSecret: TMappingSecret;
  secrets: SecretV3RawSanitized[];
};

export type TUpdateMappingSecretDTO = {
  secretKey: string;
  value: string;
  newValue: string;
  environment: string;
  projectId: string;
  secretPath: string;
  mappingId: string;
  secretData: {
    mappingSecret: any;
    secrets: any[];
  };
};

export type TDeleteMappingSecretDTO = {
  mappingId: string;
  projectId: string;
};

export type TCreateMappingSecretDTO = {
  value: string;
  secrets: [];
  projectId: string;
};
