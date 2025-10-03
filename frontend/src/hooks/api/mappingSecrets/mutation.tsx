import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@app/config/request";
import { dashboardKeys } from "@app/hooks/api/dashboard/queries";
import { mappingSecretKeys } from "./queries";
import { TUpdateMappingSecretDTO, TDeleteMappingSecretDTO } from "./types";

export const useUpdateMappingSecret = () => {
  const queryClient = useQueryClient();

  return useMutation<object, object, TUpdateMappingSecretDTO>({
    mutationFn: async ({ environment, value, projectId, secretPath, newValue, secretKey }) => {
      const { data } = await apiRequest.patch(`/api/v2/secret-mappings/${secretKey}`, {
        newValue,
        environment,
        secretPath,
        projectId,
        value,
        secretKey
      });
      return data;
    },

    onSuccess: (_, { environment, projectId, secretPath, mappingId, secretKey }) => {
      queryClient.invalidateQueries({
        queryKey: mappingSecretKeys.detail({ projectId, mappingId })
      });
      queryClient.invalidateQueries({
        queryKey: mappingSecretKeys.getSecretImportSecrets({
          projectId,
          environment,
          path: secretPath
        })
      });
      queryClient.invalidateQueries({
        queryKey: dashboardKeys.getDashboardSecrets({
          projectId,
          secretPath: secretPath ?? "/"
        })
      });
    }
  });
};

export const useDeleteMappingSecret = () => {
  const queryClient = useQueryClient();

  return useMutation<string, object, TDeleteMappingSecretDTO>({
    mutationFn: async ({ mappingId, projectId }) => {
      const { data } = await apiRequest.delete<{ mappingSecrets: string }>(
        `/api/v2/secret-mappings/${mappingId}`,
        {
          data: { projectId }
        }
      );
      return data.mappingSecrets;
    },

    onSuccess: (_, { projectId, mappingId }) => {
      queryClient.invalidateQueries({
        queryKey: mappingSecretKeys.detail({ projectId, mappingId })
      });
      queryClient.invalidateQueries({
        queryKey: mappingSecretKeys.list({ projectId })
      });
    }
  });
};
