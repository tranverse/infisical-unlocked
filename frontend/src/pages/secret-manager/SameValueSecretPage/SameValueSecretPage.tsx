/* eslint-disable no-case-declarations */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet";
import { useTranslation } from "react-i18next";
import { subject } from "@casl/ability";
import { faArrowDown, faArrowUp, faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { twMerge } from "tailwind-merge";
import { getHeaderStyle } from "@app/pages/secret-manager/OverviewPage/components/utils";
import { createNotification } from "@app/components/notifications";

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
  faPlus,
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

import { Filter, RowType } from "../SecretDashboardPage/SecretMainPage.types";
import { useSecretsAndMappingSecret } from "../../../hooks/utils/secrets-overview";
import {
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
  const { currentProject } = useProject();

  // get mapping secret and secret
  const { data: sameValueSecrets } = useGetSameValueSecretWithoutMappingSecret({
    projectId: currentProject.id
  });
  const getSecretByKey = (env: string, key: string, folderName: string, secrets: []) => {
    const sec = secrets?.find(
      (s) => s.env === env && s.secretKey === key && s.folderName === folderName
    );
    return sec;
  };
  const [scrollOffset, setScrollOffset] = useState(0);
  const [debouncedScrollOffset] = useDebounce(scrollOffset);
  const [showSameValue, setShowSameValue] = useState(false);
  const navigate = useNavigate({ from: ROUTE_PATHS.SecretManager.MappingSecretPage.path });
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
  const reshapedSameValue = useMemo(() => {
    if (!sameValueSecrets?.sameValueSecret || sameValueSecrets?.sameValueSecret.length === 0)
      return [];
    const shape = new Map();
    sameValueSecrets?.sameValueSecret.forEach((same) => {
      const val = same.secretValue;
      if (!shape.has(val)) shape.set(val, []);
      shape.get(val).push(same);
    });
    return Array.from(shape, ([value, secrets]) => ({ value, secrets }));
  }, [sameValueSecrets]);
  console.log(reshapedSameValue);

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
  const secretPath = "Same value secrets";
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

  return (
    <div>
      <div className="relative mx-auto max-w-7xl text-mineshaft-50 dark:[color-scheme:dark]">
        <div className="flex w-full items-baseline justify-between">
          <PageHeader
            title="Secrets Overview"
            description={
              <p className="text-md text-bunker-300">
                Inject your secrets using
                <a
                  className="ml-1 text-mineshaft-300 underline decoration-primary-800 underline-offset-4 duration-200 hover:text-mineshaft-100 hover:decoration-primary-600"
                  href="https://infisical.com/docs/cli/overview"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Infisical CLI
                </a>
                ,
                <a
                  className="ml-1 text-mineshaft-300 underline decoration-primary-800 underline-offset-4 duration-200 hover:text-mineshaft-100 hover:decoration-primary-600"
                  href="https://infisical.com/docs/documentation/getting-started/api"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Infisical API
                </a>
                ,
                <a
                  className="ml-1 text-mineshaft-300 underline decoration-primary-800 underline-offset-4 duration-200 hover:text-mineshaft-100 hover:decoration-primary-600"
                  href="https://infisical.com/docs/sdks/overview"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Infisical SDKs
                </a>
                , and
                <a
                  className="ml-1 text-mineshaft-300 underline decoration-primary-800 underline-offset-4 duration-200 hover:text-mineshaft-100 hover:decoration-primary-600"
                  href="https://infisical.com/docs/documentation/getting-started/introduction"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  more
                </a>
                . Click the Explore button to view the secret details section.
              </p>
            }
          />
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <FolderBreadCrumbs secretPath={secretPath} onResetSearch={handleResetSearch} />
      </div>
      {reshapedSameValue?.map((sec, index) => {
        const filter = filteredSecrets(sec?.secrets);

        return (
          <>
            <div className="mt-4 rounded-md border border-gray-700 bg-gray-900 p-3">
              <div className="flex items-center justify-between gap-3 rounded-md border border-gray-700 bg-mineshaft-800 p-3">
                {/* Label */}
                <div className="min-w-[4rem] text-sm font-medium text-gray-200">Value</div>

                {/* Input */}
                <input
                  type="text"
                  readOnly
                  value={sec.value}
                  onChange={(e) => setEditedValue(e.target.value)}
                  className="flex-1 rounded-md bg-gray-800 px-3 py-2 font-mono text-sm text-gray-100 outline-none focus:bg-gray-700 focus:ring-1 focus:ring-blue-500"
                />

                {/* Badge */}
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs font-medium text-white">
                    {sec.secrets.length}
                  </span>
                  <span>same value</span>
                </div>
              </div>
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
                      className="sticky top-0 z-20 border-0"
                      style={{ height: collapseEnvironments ? headerHeight : undefined }}
                    >
                      <Th
                        className="sticky left-0 z-20 min-w-[20rem] border-b-0 p-0"
                        style={{ height: collapseEnvironments ? headerHeight : undefined }}
                      >
                        <div
                          className={twMerge(
                            "flex h-full border-b border-mineshaft-600 pb-3 pl-3 pr-5",
                            !collapseEnvironments && "border-r pt-3.5"
                          )}
                        ></div>
                      </Th>

                      <Th>Service</Th>
                      {visibleEnvs?.map(({ name, slug }, index) => {
                        const envSecKeyCount = getEnvSecretKeyCount(slug, sec.secrets);
                        const importedSecKeyCount = getEnvImportedSecretKeyCount(slug);
                        const missingKeyCount =
                          sec.secrets.length - envSecKeyCount - importedSecKeyCount;

                        const isLast = index === visibleEnvs.length - 1;

                        return (
                          <Th
                            className={twMerge(
                              "min-table-row border-b-0 p-0 text-xs",
                              collapseEnvironments && index === visibleEnvs.length - 1 && "!mr-8",
                              !collapseEnvironments && "min-w-[11rem] text-center"
                            )}
                            style={
                              collapseEnvironments
                                ? {
                                    height: headerHeight,
                                    width: "w-[1rem]"
                                  }
                                : undefined
                            }
                            key={`secret-overview-${name}-${index + 1}`}
                          >
                            <Tooltip
                              content={
                                collapseEnvironments ? (
                                  <p className="whitespace-break-spaces">{name}</p>
                                ) : (
                                  ""
                                )
                              }
                              side="bottom"
                              sideOffset={-1}
                              align="end"
                              className="max-w-xl text-xs normal-case"
                              rootProps={{
                                disableHoverableContent: true
                              }}
                            >
                              <div
                                className={twMerge(
                                  "border-b border-mineshaft-600",
                                  collapseEnvironments
                                    ? "relative"
                                    : "flex items-center justify-center px-5 pb-[0.82rem] pt-3.5",
                                  collapseEnvironments && isLast && "overflow-clip"
                                )}
                                style={{
                                  height: collapseEnvironments ? headerHeight : undefined,
                                  minWidth: collapseEnvironments ? "2.9rem" : undefined
                                  // width: collapseEnvironments && isLast ? headerHeight * 0.3 : undefined
                                }}
                              >
                                <div
                                  className={twMerge(
                                    "border-mineshaft-600",
                                    collapseEnvironments
                                      ? "-skew-x-[16rad] transform border-l text-xs"
                                      : "flex items-center justify-center"
                                  )}
                                  style={{
                                    height: collapseEnvironments ? headerHeight : undefined,
                                    marginLeft: collapseEnvironments
                                      ? headerHeight * 0.145
                                      : undefined
                                  }}
                                />
                                <button
                                  type="button"
                                  className={twMerge(
                                    "duration-100 hover:text-mineshaft-100",
                                    collapseEnvironments
                                      ? "absolute -rotate-[72.75deg] text-left text-sm font-normal"
                                      : "flex items-center text-center text-sm font-medium"
                                  )}
                                  style={getHeaderStyle({
                                    collapseEnvironments,
                                    // isLast,
                                    headerHeight
                                  })}
                                  onClick={() => handleExploreEnvClick(slug)}
                                >
                                  <p className="truncate font-medium underline">{name}</p>
                                </button>
                                {/* {!collapseEnvironments && missingKeyCount > 0 && (
                            <Tooltip
                              className="max-w-none lowercase"
                              content={`${missingKeyCount} secrets missing\n compared to other environments`}
                            >
                              <div className="ml-2 flex h-[1.1rem] cursor-default items-center justify-center rounded-sm border border-red-400 bg-red-600 p-1 text-xs font-medium text-bunker-100">
                                <span className="text-bunker-100">{missingKeyCount}</span>
                              </div>
                            </Tooltip>
                          )} */}
                              </div>
                            </Tooltip>
                          </Th>
                        );
                      })}
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
                            onToggleSecretSelect={() => toggleSelectedEntry(EntryType.SECRET, key)}
                            secretPath={key.folderName == "root" ? "/" : "/" + key.folderName}
                            // getImportedSecretByKey={getImportedSecretByKey}
                            // isImportedSecretPresentInEnv={handleIsImportedSecretPresentInEnv}
                            // onSecretCreate={handleSecretCreate}
                            // onSecretDelete={handleSecretDelete}
                            onSecretUpdate={handleSecretUpdate}
                            key={`overview-${key}-${index + 1}`}
                            environments={visibleEnvs}
                            secretKey={key.secretKey}
                            getSecretByKey={getSecretByKey}
                            scrollOffset={debouncedScrollOffset}
                            // importedBy={importedBy}
                            folderName={key?.folderName}
                            projectId={currentProject.id}
                            userAvailableEnvs={userAvailableEnvs}
                            secrets={sec?.secrets}
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
              {/* {totalCount > 0 && (
          <Pagination
            startAdornment={
              <SecretTableResourceCount
                dynamicSecretCount={totalDynamicSecretCount}
                secretCount={totalSecretCount}
                folderCount={totalFolderCount}
                importCount={totalImportCount}
                secretRotationCount={totalSecretRotationCount}
              />
            }
            className="rounded-b-md border-t border-solid border-t-mineshaft-600"
            count={totalCount}
            page={page}
            perPage={perPage}
            onChangePage={(newPage) => setPage(newPage)}
            onChangePerPage={handlePerPageChange}
          />
        )} */}
            </div>
          </>
        );
      })}
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
