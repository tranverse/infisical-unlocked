import { OrderByDirection, TProjectPermission } from "@app/lib/types";

export type TCreateSecretMappingDTO = {
  secretName: String;
  value: String;
} & TProjectPermission;

export type TUpdateMappingSecretDTO = TProjectPermission & {
  secretKey: string;
  value: string;
  newValue: string;
  projectId: string;
  secretPath: string;
  environment: string;
};

export type TGetMappingSecretDTO = TProjectPermission & {
  projectId: string;
};

export type TDeleteMappingSecretDTO = TProjectPermission & {
  mappingId: string;
  projectId: string;
};

export type TGetSecretsAndMappingSecretDTO = TProjectPermission & {
  mappingId: string;
  projectId: string;
  environment: string;
};

export type TCreateMappingSecretDTO = TProjectPermission & {
  value: string;
  secrets: [];
  projectId: string;
};
