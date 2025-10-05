import {
  IMappingSecret,
  TGetMappingSecretDTO,
  TMappingSecretDTO,
  TGetSecretAndMappingSecretDTO,
  TMappingSecret
} from "./types";
import { apiRequest } from "@app/config/request";
import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { SecretV3RawSanitized } from "../secrets/types";
import {
  TGetMappingSecretDTO,
  TGetSecretAndMappingSecretDTO,
  TGetImportedSecrets,
  TGetImportedFoldersByEnvDTO
} from "./types";

const fetchMappingSecrets = async ({ projectId }: TGetMappingSecretDTO) => {
  const { data } = await apiRequest.get<TMappingSecretDTO>(`/api/v2/secret-mappings/${projectId}`);
  return data.mappingSecrets;
};

const fetchSecretsAndMappingSecret = async ({
  projectId,
  mappingId
}: TGetSecretAndMappingSecretDTO) => {
  const { data } = await apiRequest.get<TMappingSecretDTO>(
    `/api/v2/secret-mappings/all-secrets/${mappingId}?projectId=${projectId}`
  );
  console.log(data);
  return { mappingSecret: data.mappingSecrets, secrets: data.secrets };
};

export const mappingSecretKeys = {
  all: ["mapping-secrets"] as const,

  list: ({ projectId }: TGetMappingSecretDTO) =>
    [...mappingSecretKeys.all, "list", projectId] as const,

  detail: ({ projectId, mappingId }: TGetSecretAndMappingSecretDTO) =>
    [...mappingSecretKeys.all, "detail", projectId, mappingId] as const,

  getProjectSecretImports: ({ environment, projectId, path }: TGetSecretAndMappingSecretDTO) =>
    [{ projectId, path, environment }, "secrets-imports"] as const,

  getSecretImportSecrets: ({
    environment,
    projectId,
    path
  }: Omit<TGetImportedSecrets, "decryptFileKey">) =>
    [{ environment, path, projectId }, "secrets-import-sec"] as const,

  getImportedFoldersByEnv: ({ environment, projectId, path }: TGetImportedFoldersByEnvDTO) =>
    [{ environment, projectId, path }, "imported-folders"] as const,

  getImportedFoldersAllEnvs: ({ projectId, path, environment }: TGetImportedFoldersByEnvDTO) =>
    [{ projectId, path, environment }, "imported-folders-all-envs"] as const
};

export const useGetMappingSecrets = ({
  projectId,
  options = {}
}: TGetMappingSecretDTO & {
  option?: Omit<
    UseQueryOptions<
      IMappingSecret[],
      unknown,
      IMappingSecret[],
      ReturnType<typeof mappingSecretKeys.list>
    >,
    "queryKey" | "queryFn"
  >;
}) => {
  return useQuery({
    ...options,
    queryKey: mappingSecretKeys.list({ projectId }),
    enabled: Boolean(projectId) && (options?.enabled ?? true),
    queryFn: async () => fetchMappingSecrets({ projectId })
  });
};

  export const useGetSecretAndMappingSecrets = ({
    projectId,
    mappingId,
    options = {}
  }: TGetSecretAndMappingSecretDTO & {
    option?: Omit<
      UseQueryOptions<
        { mappingSecret: TMappingSecret; secrets: SecretV3RawSanitized[] },
        unknown,
        { mappingSecret: TMappingSecret; secrets: SecretV3RawSanitized[] },
        ReturnType<typeof mappingSecretKeys.detail>
      >,
      "queryKey" | "queryFn"
    >;
  }) => {
    return useQuery({
      ...options,
      queryKey: mappingSecretKeys.detail({ projectId, mappingId }),
      enabled: Boolean(projectId) && Boolean(mappingId) && (options?.enabled ?? true),
      queryFn: async () => fetchSecretsAndMappingSecret({ projectId, mappingId })
    });
  };
