import { useMutation, useQueryClient, MutationOptions } from "@tanstack/react-query";
import { apiRequest } from "@app/config/request";
import { dashboardKeys } from "@app/hooks/api/dashboard/queries";
import { mappingSecretKeys } from "./queries";
import { TUpdateMappingSecretDTO, TDeleteMappingSecretDTO, TCreateMappingSecretDTO } from "./types";
import { commitKeys } from "../folderCommits/queries";
import { secretApprovalRequestKeys } from "../secretApprovalRequest/queries";
import { PendingAction } from "../secretFolders/types";
import { secretSnapshotKeys } from "../secretSnapshots/queries";
import { secretKeys } from "../secrets/queries";
import { TUpdateSecretsV3DTO } from "../types";
import { da } from "date-fns/locale";

export const useUpdateMappingSecret = ({
  options
}: {
  options?: Omit<MutationOptions<object, object, TUpdateMappingSecretDTO>, "mutationFn">;
} = {}) => {
  const queryClient = useQueryClient();

  return useMutation<object, object, TUpdateMappingSecretDTO>({
    mutationFn: async ({
      environment,
      value,
      projectId,
      secretPath = "/",
      newValue,
      secretKey,
      mappingId,
      secretData
    }) => {
      const { data } = await apiRequest.patch(`/api/v2/secret-mappings/${secretKey}`, {
        newValue,
        environment,
        secretPath,
        projectId,
        value,
        secretKey
      });
      console.log("data", data);
      return data;
    },

    onSuccess: async (data, { environment, projectId, mappingId, secretData }) => {
      console.log("data from mutationFn:", data);
      try {
        queryClient.invalidateQueries({
          queryKey: mappingSecretKeys.detail({ projectId, mappingId })
        });
        queryClient.invalidateQueries({
          queryKey: mappingSecretKeys.list({ projectId })
        });
        await invalidateMappingSecrets({
          queryClient,
          projectId,
          mappingSecretData: data
        });
      } catch (err) {
        console.error("Error in onSuccess", err);
      }
    },

    ...options
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

export const useCreateMappingSecret = () => {
  const queryClient = useQueryClient();

  return useMutation<object, object, TCreateMappingSecretDTO>({
    mutationFn: async ({ secrets, value, projectId }) => {
      console.log(value, secrets);

      const { data } = await apiRequest.post(`/api/v2/secret-mappings/create`, {
        secrets,
        projectId,
        value
      });
      return data;
    }
  });
};

// export const invalidateMappingSecrets = ({
//   queryClient,
//   projectId,
//   mappingSecretData
// }: {
//   queryClient: ReturnType<typeof useQueryClient>;
//   projectId: string;
//   mappingSecretData: { secrets: any[]; updateMappingSecret: any };
// }) => {
//   const { secrets, updateMappingSecret } = mappingSecretData;
//   const uniqueKeys = new Set<string>();
//   console.log(updateMappingSecret);
//   for (const sec of secrets) {
//     const environment = sec.environment;
//     const secretPath = sec.folderName ? `/${sec.folderName}` : "/";
//     const secretKey = sec.secretKey || sec.key;
//     console.log(sec);
//     const cacheKey = `${projectId}-${environment}-${secretPath}-${secretKey}`;
//     if (uniqueKeys.has(cacheKey)) continue;
//     uniqueKeys.add(cacheKey);

//     const queryKey = dashboardKeys.getSecretValue({
//       projectId,
//       environment,
//       secretPath,
//       secretKey: sec.newSecretName ?? sec.secretKey,
//       isOverride: false
//     });

//     console.log("🔍 Setting queryClient data for:", queryKey);
//     console.log("New secret value:", sec.secretValue);

//     queryClient.setQueryData(queryKey, { value: sec.secretValue });
//     const currentData = queryClient.getQueryData(queryKey);
//     console.log("✅ Current queryClient data:", currentData);
//     console.log("Invalidate secret:", {
//       projectId,
//       environment,
//       secretPath,
//       secretKey,
//       queryKey: secretKeys.getProjectSecret({
//         projectId,
//         environment,
//         secretPath
//       })
//     });
//     queryClient.invalidateQueries({
//       queryKey: dashboardKeys.getSecretValue({
//         projectId,
//         environment,
//         secretPath,
//         secretKey: sec.newSecretName ?? sec.secretKey,
//         isOverride: false
//       }),
//       exact: true
//     });

//     queryClient.invalidateQueries({
//       queryKey: secretKeys.getProjectSecret({
//         projectId,
//         environment,
//         secretPath
//       }),
//       exact: false,
//       refetchActive: true
//     });

//     queryClient.invalidateQueries({
//       queryKey: secretKeys.getSecretAccessList({
//         projectId,
//         environment,
//         secretPath,
//         secretKey
//       }),
//       exact: false,
//       refetchActive: true
//     });

//     queryClient.invalidateQueries({
//       queryKey: dashboardKeys.getDashboardSecrets({
//         projectId,
//         secretPath
//       }),
//       exact: false,
//       refetchActive: true
//     });
//   }

//   // Invalidate mapping secret queries
//   console.log("♻️ Invalidate mapping secrets:", updateMappingSecret.id);

//   queryClient.invalidateQueries({
//     queryKey: mappingSecretKeys.all,
//     exact: false,
//     refetchActive: true
//   });

//   queryClient.invalidateQueries({
//     queryKey: mappingSecretKeys.detail({
//       projectId,
//       mappingId: updateMappingSecret.id
//     }),
//     exact: false,
//     refetchActive: true
//   });

//   queryClient.invalidateQueries({
//     queryKey: mappingSecretKeys.list({ projectId }),
//     exact: false,
//     refetchActive: true
//   });
// };

export const invalidateMappingSecrets = ({
  queryClient,
  projectId,
  mappingSecretData
}: {
  queryClient: ReturnType<typeof useQueryClient>;
  projectId: string;
  mappingSecretData: { secrets: any[]; updateMappingSecret: any };
}) => {
  const { secrets, updateMappingSecret } = mappingSecretData;
  const uniqueKeys = new Set<string>();

  for (const sec of secrets) {
    const environment = sec.environment;
    const secretPath = sec.folderName ? `/${sec.folderName}` : "/";
    const secretKey = sec.secretKey || sec.key;
    const cacheKey = `${projectId}-${environment}-${secretPath}-${secretKey}`;
    if (uniqueKeys.has(cacheKey)) continue;
    uniqueKeys.add(cacheKey);

    const queryKey = dashboardKeys.getSecretValue({
      environment,
      secretPath,
      secretKey: sec.secretKey,
      isOverride: false
    });

    console.log("🔍 Setting queryClient data for:", queryKey);
    console.log("New secret value:", sec.secretValue);

    // Optimistic update: set giá trị mới trước
    queryClient.setQueryData(queryKey, { value: sec.secretValue });

    // Chỉ invalidate những query cần thiết
    // queryClient.invalidateQueries({
    //   queryKey: secretKeys.getProjectSecret({
    //     projectId,
    //     environment,
    //     secretPath,
    //     viewSecretValue: false
    //   }),
    //   exact: false
    // });
    // queryClient.invalidateQueries({
    //   queryKey: dashboardKeys.getSecretValuesRoot()
    // });
    // queryClient.invalidateQueries(queryKey, { refetchActive: true, refetchInactive: true });
  }

  console.log("♻️ Invalidate mapping secrets:", updateMappingSecret.id);
  queryClient.invalidateQueries({
    queryKey: mappingSecretKeys.detail({
      projectId,
      mappingId: updateMappingSecret.id
    }),
    exact: false
  });
};
