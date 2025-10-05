import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@app/config/request";
import { dashboardKeys } from "@app/hooks/api/dashboard/queries";
import { mappingSecretKeys } from "./queries";
import { TUpdateMappingSecretDTO, TDeleteMappingSecretDTO } from "./types";
import { commitKeys } from "../folderCommits/queries";
import { secretApprovalRequestKeys } from "../secretApprovalRequest/queries";
import { PendingAction } from "../secretFolders/types";
import { secretSnapshotKeys } from "../secretSnapshots/queries";
import { secretKeys } from "../secrets/queries";
export const useUpdateMappingSecret = () => {
  const queryClient = useQueryClient();

  return useMutation<object, object, TUpdateMappingSecretDTO>({
    mutationFn: async ({
      environment,
      value,
      projectId,
      secretPath,
      newValue,
      secretKey,
      mappingId
    }) => {
      console.log(mappingId, projectId);

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
      console.log(
        queryClient
          .getQueryCache()
          .getAll()
          .map((q) => q.queryKey)
      );
      queryClient.invalidateQueries({
        queryKey: dashboardKeys.getDashboardSecrets({ projectId, secretPath: "/" })
      });
      queryClient.invalidateQueries(
        dashboardKeys.getSecretValue({
          environment,
          secretPath,
          secretKey: secretKey,
          isOverride: false
        })
      );
      queryClient.invalidateQueries(
        dashboardKeys.getProjectSecretsOverview({
          projectId,
          secretPath,
          environments: [environment]
        })
      );
      queryClient.invalidateQueries({
        queryKey: dashboardKeys.getSecretValuesRoot()
      });
      queryClient.invalidateQueries({
        queryKey: secretKeys.getProjectSecret({ projectId, environment, secretPath })
      });
      queryClient.invalidateQueries({ queryKey: secretApprovalRequestKeys.count({ projectId }) });
      queryClient.invalidateQueries(mappingSecretKeys.all);

      queryClient.invalidateQueries({
        queryKey: mappingSecretKeys.detail({ projectId, mappingId })
      });
      queryClient.invalidateQueries({
        queryKey: mappingSecretKeys.list({ projectId, mappingId })
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
      return data;
    },

    onSuccess: (_, { environment, projectId, secretPath, mappingId, secretKey }) => {
      queryClient.invalidateQueries({
        queryKey: dashboardKeys.getDashboardSecrets({ projectId, secretPath })
      });
      queryClient.invalidateQueries(
        dashboardKeys.getSecretValue({
          environment,
          secretPath,
          secretKey: secretKey,
          isOverride: false
        })
      );
      queryClient.invalidateQueries(
        dashboardKeys.getProjectSecretsOverview({
          projectId,
          secretPath,
          environments: [environment]
        })
      );
      queryClient.invalidateQueries({
        queryKey: dashboardKeys.getSecretValuesRoot()
      });
      queryClient.invalidateQueries({
        queryKey: secretKeys.getProjectSecret({ projectId, environment, secretPath })
      });
      queryClient.invalidateQueries({
        queryKey: secretSnapshotKeys.list({ environment, projectId, directory: secretPath })
      });
      queryClient.invalidateQueries({
        queryKey: secretSnapshotKeys.count({ environment, projectId, directory: secretPath })
      });
      queryClient.invalidateQueries({
        queryKey: commitKeys.count({ projectId, environment, directory: secretPath })
      });
      queryClient.invalidateQueries({
        queryKey: commitKeys.history({ projectId, environment, directory: secretPath })
      });
      queryClient.invalidateQueries({ queryKey: secretApprovalRequestKeys.count({ projectId }) });

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
