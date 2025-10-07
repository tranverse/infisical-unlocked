import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  PageHeader,
  Pagination
} from "@app/components/v2";
import { Helmet } from "react-helmet";
import { useTranslation } from "react-i18next";
import { FolderBreadCrumbs } from "./components/FolderBreadCrumbs";
import { useState, useEffect } from "react";
import { TableContainer, Table, THead, TBody, Tr, Td, TFoot, Th } from "@app/components/v2";
import { useGetMappingSecrets } from "@app/hooks/api";
import { useProject, useProjectPermission } from "@app/context";
import SecretReferenceRow from "./components/SecretReferenceRow";
import { useNavigate } from "@tanstack/react-router";
import { ROUTE_PATHS } from "@app/const/routes";
import SearchInput from "./components/SearchInput";
import { twMerge } from "tailwind-merge";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFilter, faCheckCircle, faRotate } from "@fortawesome/free-solid-svg-icons";
import { useGetSameValueSecretWithoutMappingSecret } from "../../../hooks/api/secrets/queries";
import { ProjectPermissionSecretActions } from "@app/context/ProjectPermissionContext/types";
import { subject } from "@casl/ability";
import { ProjectPermissionSub } from "@app/context";
export const ReferenceSecretPage = () => {
  const { t } = useTranslation();
  const { currentProject } = useProject();
  const { data: refeneceSecrets } = useGetMappingSecrets({ projectId: currentProject.id });
  const [filterReferenceSecrets, setFilterReferenceSecrets] = useState<any[]>([]);
  const navigate = useNavigate({ from: ROUTE_PATHS.SecretManager.ReferenceSecretPage.path });
  const { permission } = useProjectPermission();
  const [filteredEnvs, setFilteredEnvs] = useState<string[]>([]);
  const [filteredServices, setFilteredServices] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: sameValueSecrets } = useGetSameValueSecretWithoutMappingSecret({
    projectId: currentProject.id
  });
  console.log(sameValueSecrets);
  const secretPath = "/";

  const handleClickReferenceSecret = (mappingId: string) => {
    navigate({
      to: "/projects/secret-management/$projectId/reference-secrets/detail/$mappingId",
      params: { projectId: currentProject.id, mappingId }
    });
  };
  const canReadEnv = permission.can(
    ProjectPermissionSecretActions.ReadValue,
    subject(ProjectPermissionSub.Secrets, {})
  );

  console.log(canReadEnv);
  const handleSecretWithSameValue = () => {
    navigate({
      to: "/projects/secret-management/$projectId/reference-secrets/secret-value",
      params: { projectId: currentProject.id }
    });
  };

  const handleEnvSelect = (envName: string) => {
    setFilteredEnvs((prev) =>
      prev.includes(envName) ? prev.filter((name) => name !== envName) : [...prev, envName]
    );
  };

  const handleServiceSelect = (serviceName: string) => {
    setFilteredServices((prev) =>
      prev.includes(serviceName)
        ? prev.filter((name) => name !== serviceName)
        : [...prev, serviceName]
    );
  };

  console.log(refeneceSecrets);

  useEffect(() => {
    if (!refeneceSecrets) return;

    let filtered = [...refeneceSecrets];

    // Search text
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((secretItem) => {
        const matchesBasic =
          secretItem.key?.toLowerCase().includes(term) ||
          secretItem.environment?.toLowerCase().includes(term) ||
          secretItem.services?.some((s) => s.folderName?.toLowerCase().includes(term));

        const matchesSecretKey = secretItem.secrets?.some((s) =>
          s.secretKey?.toLowerCase().includes(term)
        );
        if (canReadEnv) {
          return matchesBasic || matchesSecretKey;
        } else {
          return [];
        }
      });
    }

    // Filter environment
    if (filteredEnvs.length > 0) {
      filtered = filtered.filter((secret) => filteredEnvs.includes(secret.environment));
    }

    // Filter services
    if (filteredServices.length > 0) {
      filtered = filtered.filter((secret) =>
        secret.services?.some((s) => filteredServices.includes(s.folderName.toLowerCase()))
      );
    }

    setFilterReferenceSecrets(filtered);
  }, [searchTerm, refeneceSecrets, filteredEnvs, filteredServices]);

  const userAvailableEnvs = currentProject?.environments || [];

  // Build service list
  const allServices = Array.from(
    new Set(
      refeneceSecrets?.flatMap(
        (secret) => secret.services?.map((s) => s.folderName.toLowerCase()) || []
      ) || []
    )
  );

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
        <PageHeader title="Reference secret" />

        <div className="flex justify-between text-mineshaft-50">
          <FolderBreadCrumbs secretPath={secretPath} />

          <div className="flex items-center gap-2">
            {(filteredEnvs.length > 0 || filteredServices.length > 0) && (
              <button
                className="font-semibold"
                onClick={() => {
                  setFilteredEnvs([]);
                  setFilteredServices([]);
                }}
              >
                Clear filter
              </button>
            )}
            {/* Dropdown Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline_bg"
                  className={twMerge(
                    "flex h-[2.5rem]",
                    (filteredEnvs.length > 0 || filteredServices.length > 0) &&
                      "border border-yellow-400 text-white"
                  )}
                  leftIcon={<FontAwesomeIcon icon={faFilter} />}
                >
                  Filters
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                className="thin-scrollbar max-h-[70vh] overflow-y-auto"
                align="end"
                sideOffset={2}
              >
                {/* Environment Filter */}
                {/* <DropdownMenuLabel>Filter by Environment</DropdownMenuLabel>
                {userAvailableEnvs.map((availableEnv) => {
                  const { id: envId, name } = availableEnv;
                  const isEnvSelected = filteredEnvs.includes(name);

                  return (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.preventDefault();
                        handleEnvSelect(name);
                      }}
                      key={envId}
                      icon={isEnvSelected && <FontAwesomeIcon icon={faCheckCircle} />}
                      iconPos="right"
                    >
                      {name}
                    </DropdownMenuItem>
                  );
                })} */}
                <DropdownMenuLabel>Filter by Environment</DropdownMenuLabel>
                {userAvailableEnvs.map((availableEnv) => {
                  const { id: envId, name } = availableEnv;
                  const isEnvSelected = filteredEnvs.includes(name);

                  return (
                    <DropdownMenuItem
                      key={envId}
                      disabled={!canReadEnv}
                      onClick={(e) => {
                        if (!canReadEnv) return;
                        e.preventDefault();
                        handleEnvSelect(name);
                      }}
                      icon={isEnvSelected && <FontAwesomeIcon icon={faCheckCircle} />}
                      iconPos="right"
                    >
                      {name}
                    </DropdownMenuItem>
                  );
                })}

                <DropdownMenuLabel>Filter by Service</DropdownMenuLabel>
                {allServices.map((service) => {
                  const isServiceSelected = filteredServices.includes(service);

                  return (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.preventDefault();
                        handleServiceSelect(service);
                      }}
                      key={service}
                      icon={isServiceSelected && <FontAwesomeIcon icon={faCheckCircle} />}
                      iconPos="right"
                    >
                      {service}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Search Box */}
            <SearchInput
              placeholder="Search by secret key"
              searchValue={searchTerm}
              onChange={(val) => setSearchTerm(val)}
              secrets={refeneceSecrets}
              projectId={currentProject?.id}
              canReadEnv={canReadEnv}
            />
          </div>
        </div>

        {/* Table */}
        <div className="mt-4">
          {filterReferenceSecrets?.length > 0 ? (
            <TableContainer>
              <Table>
                <THead>
                  <Tr className="text-md text-center">
                    <Th>Name</Th>
                    <Th>Service</Th>
                    <Th>Environment</Th>
                  </Tr>
                </THead>

                <TBody>
                  {filterReferenceSecrets.map((ref, index) => (
                    <SecretReferenceRow
                      key={index}
                      referenceSecret={ref}
                      itemKey={index.toString()}
                      onClick={handleClickReferenceSecret}
                      searchTerm={searchTerm}
                    />
                  ))}
                </TBody>

                <TFoot>
                  <Tr className="sticky bottom-0 z-10 border-0 bg-mineshaft-800">
                    <Td className="sticky left-0 z-10 border-0 bg-mineshaft-800 p-0">
                      <div
                        className={twMerge(
                          "flex w-full items-center border-r border-t border-mineshaft-600 p-4 text-sm italic"
                        )}
                        style={{ height: "45px" }}
                      ></div>
                    </Td>
                  </Tr>
                </TFoot>
              </Table>
            </TableContainer>
          ) : sameValueSecrets?.sameValueSecret?.length > 0 ? (
            <div className="mt-4">
              <p
                className="cursor-pointer text-center font-semibold text-yellow-300 underline hover:text-blue-400"
                style={{ fontSize: "13px" }}
                onClick={handleSecretWithSameValue}
              >
                View secret with same value
              </p>
            </div>
          ) : (
            <div className="mt-auto flex flex-1 items-center justify-center font-semibold text-yellow-300">
              No referenced secrets
            </div>
          )}
        </div>
      </div>
    </>
  );
};
