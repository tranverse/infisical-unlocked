import { useCallback, useMemo } from "react";

import { DashboardProjectSecretsOverview } from "../api/dashboard/types";
import { TGetSecretAndMappingSecretDTO } from "../api/mappingSecrets";
import { TMappingSecret } from "../api/mappingSecrets";
type FolderNameAndDescription = {
  name: string;
  description?: string;
};

export const useFolderOverview = (folders: DashboardProjectSecretsOverview["folders"]) => {
  const folderNamesAndDescriptions = useMemo(() => {
    const namesAndDescriptions = new Map<string, FolderNameAndDescription>();

    folders?.forEach((folder) => {
      if (!namesAndDescriptions.has(folder.name)) {
        namesAndDescriptions.set(folder.name, {
          name: folder.name,
          description: folder.description
        });
      }
    });

    return Array.from(namesAndDescriptions.values());
  }, [folders]);

  const isFolderPresentInEnv = useCallback(
    (name: string, env: string) => {
      return Boolean(
        folders?.find(
          ({ name: folderName, environment }) => folderName === name && environment === env
        )
      );
    },
    [folders]
  );

  const getFolderByNameAndEnv = useCallback(
    (name: string, env: string) => {
      return folders?.find(
        ({ name: folderName, environment }) => folderName === name && environment === env
      );
    },
    [folders]
  );

  return { folderNamesAndDescriptions, isFolderPresentInEnv, getFolderByNameAndEnv };
};

export const useDynamicSecretOverview = (
  dynamicSecrets: DashboardProjectSecretsOverview["dynamicSecrets"]
) => {
  const dynamicSecretNames = useMemo(() => {
    const names = new Set<string>();
    dynamicSecrets?.forEach((dynamicSecret) => {
      names.add(dynamicSecret.name);
    });
    return [...names];
  }, [dynamicSecrets]);

  const isDynamicSecretPresentInEnv = useCallback(
    (name: string, env: string) => {
      return Boolean(
        dynamicSecrets?.find(
          ({ name: dynamicSecretName, environment }) =>
            dynamicSecretName === name && environment === env
        )
      );
    },
    [dynamicSecrets]
  );

  return { dynamicSecretNames, isDynamicSecretPresentInEnv };
};

export const useSecretRotationOverview = (
  secretRotations: DashboardProjectSecretsOverview["secretRotations"]
) => {
  const secretRotationNames = useMemo(() => {
    const names = new Set<string>();
    secretRotations?.forEach((secretRotation) => {
      names.add(secretRotation.name);
    });
    return [...names];
  }, [secretRotations]);

  const isSecretRotationPresentInEnv = useCallback(
    (name: string, env: string) => {
      return Boolean(
        secretRotations?.find(
          ({ name: secretRotationName, environment }) =>
            secretRotationName === name && environment.slug === env
        )
      );
    },
    [secretRotations]
  );

  const getSecretRotationByName = useCallback(
    (env: string, name: string) => {
      const secretRotation = secretRotations?.find(
        (rotation) => rotation.environment.slug === env && rotation.name === name
      );
      return secretRotation;
    },
    [secretRotations]
  );

  const getSecretRotationStatusesByName = useCallback(
    (name: string) =>
      secretRotations
        ?.filter((rotation) => rotation.name === name)
        .map((rotation) => rotation.rotationStatus),
    [secretRotations]
  );

  return {
    secretRotationNames,
    isSecretRotationPresentInEnv,
    getSecretRotationByName,
    getSecretRotationStatusesByName
  };
};

export const useSecretOverview = (secrets: DashboardProjectSecretsOverview["secrets"]) => {
  const secKeys = useMemo(() => {
    const keys = new Set<string>();
    secrets?.forEach((secret) => keys.add(secret.key));
    return [...keys];
  }, [secrets]);

  const getEnvSecretKeyCount = useCallback(
    (env: string) => {
      return (
        secrets?.filter((secret) =>
          secret.sourceEnv ? secret.sourceEnv === env : secret.env === env
        ).length ?? 0
      );
    },
    [secrets]
  );

  return { secKeys, getEnvSecretKeyCount };
};
export const useMappingSecretOverview = (
  mappingSecrets: DashboardProjectSecretsOverview["mappingSecrets"] = []
) => {
  const mappingKeys = useMemo(() => {
    return (mappingSecrets || []).map((secret) => secret.key).filter(Boolean);
  }, [mappingSecrets]);

  const getMappingValue = useCallback(
    (key: string) => {
      return mappingSecrets?.find((secret) => secret.key === key) ?? null;
    },
    [mappingSecrets]
  );

  return { mappingKeys, getMappingValue };
};

export const useSecretsAndMappingSecret = (data: TGetSecretAndMappingSecretDTO) => {
  const secretsMap = useMemo(() => {
    if (!data?.secrets) return {};
    return data.secrets.reduce<Record<string, SecretV3RawSanitized>>((acc, secret) => {
      if (secret.key) acc[secret.key] = secret;
      return acc;
    }, {});
  }, [data?.secrets]);

  const getSecretByKey = useCallback(
    (key: string) => {
      return secretsMap[key] ?? null;
    },
    [secretsMap]
  );

  return {
    mappingSecret: data.mappingSecret,
    secretsMap,
    getSecretByKey
  };
};
