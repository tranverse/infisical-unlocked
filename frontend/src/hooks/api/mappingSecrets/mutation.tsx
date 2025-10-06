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
// export const useUpdateMappingSecret = () => {
//   const queryClient = useQueryClient();

//   return useMutation<object, object, TUpdateMappingSecretDTO>({
//     mutationFn: async ({
//       environment = "dev",
//       value,
//       projectId,
//       secretPath ="/",
//       newValue,
//       secretKey = "",
//       mappingId
//     }) => {

//       const { data } = await apiRequest.patch(`/api/v2/secret-mappings/${secretKey}`, {
//         newValue,
//         environment,
//         secretPath,
//         projectId,
//         value,
//         secretKey
//       });
//       return data;
//     },
//     onSuccess: (_, { environment, projectId, secretPath, mappingId, secretKey }) => {
//       console.log(
//         queryClient
//           .getQueryCache()
//           .getAll()
//           .map((q) => q.queryKey)
//       );
//       queryClient.invalidateQueries({
//         queryKey: dashboardKeys.getDashboardSecrets({ projectId, secretPath: "/" })
//       });
//       queryClient.invalidateQueries(
//         dashboardKeys.getSecretValue({
//           environment,
//           secretPath,
//           secretKey: secretKey,
//           isOverride: false
//         })
//       );
//       queryClient.invalidateQueries(
//         dashboardKeys.getProjectSecretsOverview({
//           projectId,
//           secretPath,
//           environments: ["dev", "prod", "stage"]
//         })
//       );
//       queryClient.invalidateQueries({
//         queryKey: secretKeys.getProjectSecret({
//           projectId,
//           environment: "env", // môi trường bạn đang dùng
//           secretPath: "/",
//           viewSecretValue: true
//         })
//       });
//       queryClient.invalidateQueries({
//         queryKey: dashboardKeys.getSecretValuesRoot()
//       });
//       queryClient.invalidateQueries({
//         queryKey: secretKeys.getProjectSecret({ projectId, environment, secretPath })
//       });
//       queryClient.invalidateQueries({ queryKey: secretApprovalRequestKeys.count({ projectId }) });
//       queryClient.invalidateQueries(mappingSecretKeys.all);

//       queryClient.invalidateQueries({
//         queryKey: mappingSecretKeys.detail({ projectId, mappingId })
//       });
//       queryClient.invalidateQueries({
//         queryKey: mappingSecretKeys.list({ projectId })
//       });
//       queryClient.invalidateQueries({
//         queryKey: mappingSecretKeys.getSecretImportSecrets({
//           projectId,
//           environment,
//           path: secretPath
//         })
//       });
//       queryClient.invalidateQueries({
//         queryKey: dashboardKeys.getDashboardSecrets({
//           projectId,
//           secretPath: secretPath ?? "/"
//         })
//       });
//     }
//   });
// };
export const useUpdateMappingSecret = ({
  options
}: {
  options?: Omit<MutationOptions<object, object, TUpdateMappingSecretDTO>, "mutationFn">;
} = {}) => {
  const queryClient = useQueryClient();

  return useMutation<object, object, TUpdateMappingSecretDTO>({
    mutationFn: async ({
      environment = "dev",
      value,
      projectId,
      secretPath = "/",
      newValue,
      secretKey = "",
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
      return data;
    },

    onSuccess: async (
      _,
      { environment = "dev", projectId, secretPath = "/", mappingId, secretData }
    ) => {
      try {
        queryClient.invalidateQueries({
          queryKey: mappingSecretKeys.detail({ projectId, mappingId })
        });
        queryClient.invalidateQueries({
          queryKey: mappingSecretKeys.list({ projectId })
        });
        queryClient.invalidateQueries({
          queryKey: mappingSecretKeys.getSecretImportSecrets({
            projectId,
            environment,
            path: secretPath
          })
        });
        await invalidateMappingSecrets({
          queryClient,
          projectId,
          mappingSecretData: secretData
        });
        console.log("UI refreshed after secret update");
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

export const invalidateMappingSecrets = ({
  queryClient,
  projectId,
  mappingSecretData
}: {
  queryClient: ReturnType<typeof useQueryClient>;
  projectId: string;
  mappingSecretData: { mappingSecret: any; secrets: any[] };
}) => {
  const { secrets, mappingSecret } = mappingSecretData;
  const uniqueKeys = new Set<string>();
  console.log(mappingSecret);
  for (const sec of secrets) {
    const environment = sec.environment || sec.env;
    const secretPath = sec.folderName ? `/${sec.folderName}` : "/";
    const secretKey = sec.secretKey || sec.key;

    const cacheKey = `${projectId}-${environment}-${secretPath}-${secretKey}`;
    if (uniqueKeys.has(cacheKey)) continue;
    uniqueKeys.add(cacheKey);

    console.log("Invalidate secret:", {
      projectId,
      environment,
      secretPath,
      secretKey,
      queryKey: secretKeys.getProjectSecret({
        projectId,
        environment,
        secretPath
      })
    });

    queryClient.invalidateQueries({
      queryKey: secretKeys.getProjectSecret({
        projectId,
        environment,
        secretPath
      }),
      exact: false,
      refetchActive: true
    });

    queryClient.invalidateQueries({
      queryKey: secretKeys.getSecretAccessList({
        projectId,
        environment,
        secretPath,
        secretKey
      }),
      exact: false,
      refetchActive: true
    });

    queryClient.invalidateQueries({
      queryKey: dashboardKeys.getDashboardSecrets({
        projectId,
        secretPath
      }),
      exact: false,
      refetchActive: true
    });

    queryClient.invalidateQueries({
      queryKey: secretSnapshotKeys.list({
        environment,
        projectId,
        directory: secretPath
      }),
      exact: false,
      refetchActive: true
    });

    queryClient.invalidateQueries({
      queryKey: secretSnapshotKeys.count({
        environment,
        projectId,
        directory: secretPath
      }),
      exact: false,
      refetchActive: true
    });

    queryClient.invalidateQueries({
      queryKey: commitKeys.count({
        projectId,
        environment,
        directory: secretPath
      }),
      exact: false,
      refetchActive: true
    });

    queryClient.invalidateQueries({
      queryKey: commitKeys.history({
        projectId,
        environment,
        directory: secretPath
      }),
      exact: false,
      refetchActive: true
    });

    queryClient.invalidateQueries({
      queryKey: secretApprovalRequestKeys.count({
        projectId
      }),
      exact: false,
      refetchActive: true
    });
  }

  // Invalidate mapping secret queries
  console.log("♻️ Invalidate mapping secrets:", mappingSecret.id);

  queryClient.invalidateQueries({
    queryKey: mappingSecretKeys.all,
    exact: false,
    refetchActive: true
  });

  queryClient.invalidateQueries({
    queryKey: mappingSecretKeys.detail({
      projectId,
      mappingId: mappingSecret.id
    }),
    exact: false,
    refetchActive: true
  });

  queryClient.invalidateQueries({
    queryKey: mappingSecretKeys.list({ projectId }),
    exact: false,
    refetchActive: true
  });
};
