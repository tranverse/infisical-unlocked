/* eslint-disable no-case-declarations */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet";
import { useTranslation } from "react-i18next";
import { subject } from "@casl/ability";
import { faArrowDown, faArrowUp, faInfoCircle, faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { twMerge } from "tailwind-merge";
import { getHeaderStyle } from "@app/pages/secret-manager/OverviewPage/components/utils";
import { createNotification } from "@app/components/notifications";
import { ProjectPermissionCan } from "@app/components/permissions";

import {
  Button,
  Checkbox,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  EmptyState,
  IconButton,
  Lottie,
  Modal,
  ModalContent,
  PageHeader,
  Pagination,
  Table,
  TableContainer,
  TableSkeleton,
  TBody,
  Td,
  TFoot,
  Th,
  THead,
  Tooltip,
  Tr
} from "@app/components/v2";
import {
  faAngleDown,
  faArrowDown,
  faArrowLeft,
  faArrowRight,
  faArrowRightToBracket,
  faArrowUp,
  faFilter,
  faFingerprint,
  faFolder,
  faFolderBlank,
  faFolderPlus,
  faKey,
  faRotate,
  faCheck,
  faTrash
} from "@fortawesome/free-solid-svg-icons";
import { ROUTE_PATHS } from "@app/const/routes";
import {
  ProjectPermissionActions,
  ProjectPermissionDynamicSecretActions,
  ProjectPermissionSub,
  useProject,
  useProjectPermission
} from "@app/context";
import {
  ProjectPermissionCommitsActions,
  ProjectPermissionSecretActions,
  ProjectPermissionSecretRotationActions
} from "@app/context/ProjectPermissionContext/types";
import {
  getUserTablePreference,
  PreferenceKey,
  setUserTablePreference
} from "@app/helpers/userTablePreferences";
import {
  useGetImportedSecretsSingleEnv,
  useGetSecretApprovalPolicyOfABoard,
  useGetWorkspaceSnapshotList,
  useGetWsSnapshotCount,
  useGetWsTags,
  useGetImportedSecretsAllEnvs
} from "@app/hooks/api";
import { useGetProjectSecretsDetails } from "@app/hooks/api/dashboard";
import { DashboardSecretsOrderBy } from "@app/hooks/api/dashboard/types";
import { OrderByDirection } from "@app/hooks/api/generic/types";
import { ProjectVersion } from "@app/hooks/api/projects/types";

import { usePathAccessPolicies } from "@app/hooks/usePathAccessPolicies";
import { useResizableColWidth } from "@app/hooks/useResizableColWidth";
import { hasSecretReadValueOrDescribePermission } from "@app/lib/fn/permission";

import { SecretV2MigrationSection } from "../OverviewPage/components/SecretV2MigrationSection";
import { EnvironmentTabs } from "../SecretDashboardPage/components/EnvironmentTabs";
import { FolderBreadCrumbs } from "./components/FolderBreadCrumbs";

import { SecretImportListView } from "../SecretDashboardPage/components/SecretImportListView";
import { SecretListView } from "../SecretDashboardPage/components/SecretListView";
import {
  PendingChanges,
  PopUpNames,
  StoreProvider,
  useBatchMode,
  useBatchModeActions,
  usePopUpAction,
  usePopUpState,
  useSelectedSecretActions,
  useSelectedSecrets
} from "../SecretDashboardPage/SecretMainPage.store";
import { ProjectPermissionReferenceSecretActions } from "@app/context/ProjectPermissionContext/types";
import { Filter, RowType } from "../SecretDashboardPage/SecretMainPage.types";
import { useSecretsAndMappingSecret } from "../../../hooks/utils/secrets-overview";
import {
  useCreateMappingSecret,
  useGetMappingSecrets,
  useGetSecretAndMappingSecrets
} from "../../../hooks/api/mappingSecrets";
import {
  useDebounce,
  usePagination,
  usePopUp,
  useResetPageHelper,
  useResizableHeaderHeight,
  useToggle
} from "@app/hooks";
import {
  useDynamicSecretOverview,
  useFolderOverview,
  useSecretOverview,
  useSecretRotationOverview,
  useMappingSecretOverview
} from "@app/hooks/utils";
export enum EntryType {
  FOLDER = "folder",
  SECRET = "secret",
  MAPPING = "mapping"
}

import { MappingSecretOverviewTableRow } from "./components/MappingSecretOverviewTableRow";
import {
  useDeleteMappingSecret,
  useUpdateMappingSecret
} from "../../../hooks/api/mappingSecrets/mutation";
import { useGetSameValueSecretWithoutMappingSecret } from "../../../hooks/api/secrets/queries";
const Page = () => {
  const params = useParams({
    strict: false
  });
  const blurClass = "blur-sm opacity-50 cursor-not-allowed";

  const { currentProject } = useProject();
  const { data: sameValueSecrets } = useGetSameValueSecretWithoutMappingSecret({
    projectId: currentProject.id
  });
  const { permission } = useProjectPermission();

  const canReadSecretValue = hasSecretReadValueOrDescribePermission(
    permission,
    ProjectPermissionSecretActions.ReadValue
  );
  const canCreateReferenceSecret = permission.can(
    ProjectPermissionReferenceSecretActions.Create,
    subject(ProjectPermissionSub.ReferenceSecrets, {})
  );
  const getSecretByKey = (env: string, key: string, folderName: string, secrets: []) => {
    const sec = secrets?.find(
      (s) => s.env === env && s.secretKey === key && s.folderName === folderName
    );
    return sec;
  };
  const [scrollOffset, setScrollOffset] = useState(0);
  const [debouncedScrollOffset] = useDebounce(scrollOffset);
  const [showSameValue, setShowSameValue] = useState(false);
  const navigate = useNavigate({ from: ROUTE_PATHS.SecretManager.ReferenceSecretPage.path });
  const reshapedSameValue = useMemo(() => {
    if (!sameValueSecrets?.sameValueSecret || sameValueSecrets?.sameValueSecret.length === 0)
      return [];
    const shape = new Map();
    sameValueSecrets?.sameValueSecret.forEach((same) => {
      const val = same.secretValue;
      const env = same.environment;
      const key = `${val}-${env}`;
      if (!shape.has(key)) shape.set(key, []);
      shape.get(key).push(same);
    });
    return Array.from(shape, ([value, secrets]) => ({ value, secrets }));
  }, [sameValueSecrets]);

  const getEnvSecretKeyCount = (env: string, secrets) => {
    return (
      secrets?.filter((secret) =>
        secret.sourceEnv ? secret.sourceEnv === env : secret.env === env
      ).length ?? 0
    );
  };

  const [totalCount, setTotalCount] = useState(0);
  const tableRef = useRef<HTMLDivElement>(null);
  const [collapseEnvironments, setCollapseEnvironments] = useToggle(
    Boolean(localStorage.getItem("overview-collapse-environments"))
  );
  const routerQueryParams = useSearch({
    from: ROUTE_PATHS.SecretManager.SameValueSecretPage.id
  });
  const userAvailableEnvs = currentProject?.environments || [];
  const secretPath = "/";
  const {
    secretImports,
    isImportedSecretPresentInEnv,
    getImportedSecretByKey,
    getEnvImportedSecretKeyCount
  } = useGetImportedSecretsAllEnvs({
    projectId: currentProject.id,
    path: secretPath,
    environments: (userAvailableEnvs || []).map(({ slug }) => slug)
  });

  const secretImportsShaped = secretImports
    ?.flatMap(({ data }) => data)
    .filter(Boolean)
    .flatMap((item) => item?.secrets || []);
  const [filteredEnvs, setFilteredEnvs] = useState<ProjectEnv[]>([]);
  const visibleEnvs = filteredEnvs.length ? filteredEnvs : userAvailableEnvs;

  // const handleIsImportedSecretPresentInEnv = (envSlug: string, secretName: string) => {
  //   if (secrets?.secrets?.some((s) => s.key === secretName && s.env === envSlug)) {
  //     return false;
  //   }
  //   if (secretImportsShaped.some((s) => s.key === secretName && s.sourceEnv === envSlug)) {
  //     return true;
  //   }
  //   return isImportedSecretPresentInEnv(envSlug, secretName);
  // };
  const handleSecretUpdate = async (
    env: string,
    key: string,
    value: string,
    secretValueHidden: false,
    type = SecretType.Shared
  ) => {
    let secretValue: string | undefined = value;

    if (
      secretValueHidden &&
      (value === HIDDEN_SECRET_VALUE_API_MASK || value === HIDDEN_SECRET_VALUE)
    ) {
      secretValue = undefined;
    }

    try {
      const result = await updateSecretV3({
        environment: env,
        projectId,
        secretPath,
        secretKey: key,
        secretValue,
        type
      });
      console.log(result);
      if ("approval" in result) {
        createNotification({
          type: "info",
          text: "Requested change has been sent for review"
        });
      } else {
        createNotification({
          type: "success",
          text: "Successfully updated secret"
        });
      }
    } catch (error) {
      console.log(error);
      createNotification({
        type: "error",
        text: "Failed to update secret"
      });
    }
  };
  const DEFAULT_COLLAPSED_HEADER_HEIGHT = 120;

  const storedHeight = Number.parseInt(
    localStorage.getItem("overview-header-height") ?? DEFAULT_COLLAPSED_HEADER_HEIGHT.toString(),
    10
  );
  const { headerHeight, handleMouseDown, isResizing } = useResizableHeaderHeight({
    initialHeight: Number.isNaN(storedHeight) ? DEFAULT_COLLAPSED_HEADER_HEIGHT : storedHeight,
    minHeight: DEFAULT_COLLAPSED_HEADER_HEIGHT,
    maxHeight: 288
  });
  const [selectedEntries, setSelectedEntries] = useState<{
    // selectedEntries[name/key][envSlug][resource]
    [EntryType.FOLDER]: Record<string, Record<string, TSecretFolder>>;
    [EntryType.SECRET]: Record<string, Record<string, SecretV3RawSanitized>>;
    [EntryType.MAPPING]: Record<string, Record<string, TMappingSecret>>;
  }>({
    [EntryType.FOLDER]: {},
    [EntryType.SECRET]: {},
    [EntryType.MAPPING]: {}
  });
  const handleResetSearch = (path: string) => {
    const restore = filterHistory.get(path);
    setFilter(restore?.filter ?? DEFAULT_FILTER_STATE);
    const el = restore?.searchFilter ?? "";
    setSearchFilter(el);
    setDebouncedSearchFilter(el);
  };
  const canViewOverviewPage = Boolean(userAvailableEnvs.length);
  const isTableEmpty = totalCount === 0;
  const filteredSecrets = (secrets) => {
    return secrets?.filter(
      (s, index, self) =>
        index ===
        self.findIndex((t) => t.secretKey === s.secretKey && t.folderName === s.folderName)
    );
  };
  const createMappingSecret = useCreateMappingSecret();

  const handleCreateReferenceSecret = (value, secrets) => {
    const map = secrets.map((secret) => secret.id);

    createMappingSecret.mutate(
      {
        secrets: map,
        value,
        projectId: currentProject.id
      },
      {
        onSuccess: () => {
          createNotification({
            text: "Successfully created reference secret values",
            type: "success"
          });

          navigate({
            to: "/projects/secret-management/$projectId/reference-secrets",
            params: { projectId: currentProject.id }
          });
        },
        onError: (error) => {
          createNotification({
            type: "error",
            text: `Failed to create reference secret: ${error.message || error}`
          });
        }
      }
    );
  };
  console.log("reshapedSameValue", reshapedSameValue);
  return (
    <div>
      <div className="relative mx-auto max-w-7xl text-mineshaft-50 dark:[color-scheme:dark]">
        <div className="flex w-full items-baseline justify-between">
          <PageHeader title="Same value secret" />
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <FolderBreadCrumbs secretPath={secretPath} onResetSearch={handleResetSearch} />
      </div>
      {sameValueSecrets?.sameValueSecret?.length > 0 ? (
        reshapedSameValue?.map((sec, index) => {
          const filter = filteredSecrets(sec?.secrets);
          console.log("reshapedSameValue", sec);

          return (
            <>
              <div className="mt-4 rounded-md border border-gray-700 bg-gray-900 p-3">
                <TableContainer className="thin-scrollbar max-h-[66vh] overflow-y-auto rounded-b-none border border-gray-700">
                  <Table className="w-full table-auto border-collapse">
                    <THead className="sticky top-0 z-20 bg-gray-900 text-center">
                      <Tr>
                        {["Value", "Environment", "Action"].map((title, idx) => (
                          <Th
                            key={idx}
                            className="min-table-row border-b-0 p-2 text-center text-xs font-semibold text-white"
                          >
                            {title}
                          </Th>
                        ))}
                      </Tr>
                    </THead>

                    <TBody>
                      {reshapedSameValue && (
                        <Tr className="text-center hover:bg-gray-800">
                          <Td className="relative">
                            {canReadSecretValue ? (
                              <input
                                type="password"
                                value={sec?.secrets[0]?.secretValue}
                                className="w-full rounded border border-none border-gray-600 bg-gray-800 px-2 py-1 text-center text-white focus:border-blue-500 focus:outline-none"
                                onFocus={(e) => (e.currentTarget.type = "text")}
                                onBlur={(e) => (e.currentTarget.type = "password")}
                              />
                            ) : (
                              <div className="flex items-center justify-center">
                                <span className="italic text-gray-400">••••••••</span>
                                <Tooltip content="You don't have permission to view this value">
                                  <span className="ml-2 flex cursor-help items-center text-gray-400">
                                    <FontAwesomeIcon icon={faInfoCircle} />
                                  </span>
                                </Tooltip>
                              </div>
                            )}
                          </Td>

                          <Td className={!canReadSecretValue ? blurClass : "text-center"}>
                            {!canReadSecretValue ? (
                              <Tooltip content="You don't have permission to view environment">
                                <span>{sec?.environment || "—"}</span>
                              </Tooltip>
                            ) : (
                              sec?.secrets[0].environment
                            )}
                          </Td>

                          <Td>
                            {canCreateReferenceSecret ? (
                              <div
                                className="flex cursor-pointer items-center justify-center gap-2 rounded border border-blue-800 p-1 shadow"
                                onClick={() =>
                                  handleCreateReferenceSecret(
                                    sec.secrets[0].secretValue,
                                    sec.secrets
                                  )
                                }
                              >
                                <FontAwesomeIcon icon={faPlus} />
                                <span>Create secret</span>
                              </div>
                            ) : (
                              <Tooltip content="You do not have permission to create this reference secret">
                                <div className="flex cursor-not-allowed items-center justify-center gap-2 rounded border border-blue-800 p-1 shadow">
                                  <FontAwesomeIcon icon={faPlus} />
                                  <span>Create secret</span>
                                </div>
                              </Tooltip>
                            )}
                          </Td>
                        </Tr>
                      )}
                    </TBody>
                  </Table>
                </TableContainer>
              </div>

              <div ref={tableRef} className="mt-4">
                <TableContainer
                  onScroll={(e) => setScrollOffset(e.currentTarget.scrollLeft)}
                  className="thin-scrollbar max-h-[66vh] overflow-y-auto rounded-b-none"
                >
                  <Table>
                    <THead
                      className="sticky top-0 z-20 text-center"
                      style={{ height: collapseEnvironments ? headerHeight : undefined }}
                    >
                      <Tr
                        className="sticky top-0 z-20 border-0 text-center"
                        style={{ height: collapseEnvironments ? headerHeight : undefined }}
                      >
                        <Th className="sticky left-0 z-20 min-w-[20rem] border-b-0 p-0">Name</Th>

                        <Th>Service</Th>
                      </Tr>
                      {collapseEnvironments && (
                        <HeaderResizer
                          onMouseDown={handleMouseDown}
                          isActive={isResizing}
                          scrollOffset={scrollOffset}
                          heightOffset={(tableRef.current?.clientTop ?? 0) + headerHeight - 2.5}
                        />
                      )}
                    </THead>
                    <TBody>
                      {visibleEnvs.length > 0 && (
                        <>
                          {filter?.map((key, index) => (
                            <MappingSecretOverviewTableRow
                              isSelected={Boolean(selectedEntries.secret[key])}
                              onToggleSecretSelect={() =>
                                toggleSelectedEntry(EntryType.SECRET, key)
                              }
                              secretPath={key.folderName == "root" ? "/" : "/" + key.folderName}
                              onSecretUpdate={handleSecretUpdate}
                              key={`overview-${key}-${index + 1}`}
                              environments={visibleEnvs}
                              secretKey={key.secretKey}
                              getSecretByKey={getSecretByKey}
                              scrollOffset={debouncedScrollOffset}
                              folderName={key?.folderName}
                              projectId={currentProject.id}
                              userAvailableEnvs={userAvailableEnvs}
                              secrets={sec?.secrets}
                              canReadSecretValue={canReadSecretValue}
                              blurClass={blurClass}
                            />
                          ))}
                        </>
                      )}
                    </TBody>
                    <TFoot>
                      <Tr className="sticky bottom-0 z-10 border-0 bg-mineshaft-800">
                        <Td className="sticky left-0 z-10 border-0 bg-mineshaft-800 p-0">
                          <div
                            className="w-full border border-mineshaft-600"
                            style={{ height: "45px" }}
                          />
                        </Td>
                      </Tr>
                    </TFoot>
                  </Table>
                </TableContainer>
              </div>
            </>
          );
        })
      ) : (
        <div>None secrets with same value</div>
      )}
    </div>
  );
};

export const SameValueSecretPage = () => {
  const { t } = useTranslation();

  return (
    <>
      <Helmet>
        <title>{t("common.head-title", { title: t("dashboard.title") })}</title>
        <link rel="icon" href="/infisical.ico" />
        <meta property="og:image" content="/images/message.png" />
        <meta property="og:title" content={String(t("dashboard.og-title"))} />
        <meta name="og:description" content={String(t("dashboard.og-description"))} />
      </Helmet>
      <div className="h-full">
        <StoreProvider>
          <Page />
        </StoreProvider>
      </div>
    </>
  );
};
