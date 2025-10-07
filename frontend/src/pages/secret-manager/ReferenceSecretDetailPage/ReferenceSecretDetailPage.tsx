import {
  PageHeader,
  Table,
  TableContainer,
  THead,
  Tr,
  TBody,
  Td,
  Th,
  TFoot,
  DeleteActionModal,
  Tooltip
} from "@app/components/v2";
import React, { useEffect, useState, useCallback } from "react";
import { FolderBreadCrumbs } from "../ReferenceSecretPage/components/FolderBreadCrumbs";
import { useGetSecretAndMappingSecrets } from "@app/hooks/api";
import { useProject } from "@app/context";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useNavigate, useParams, Link } from "@tanstack/react-router";
import { twMerge } from "tailwind-merge";
import { useToggle } from "@app/hooks";
import { createNotification } from "@app/components/notifications";
import { ProjectPermissionSecretActions } from "@app/context/ProjectPermissionContext/types";
import { subject } from "@casl/ability";
import { ProjectPermissionSub, useProjectPermission } from "@app/context";
import {
  useDeleteMappingSecret,
  useUpdateMappingSecret
} from "../../../hooks/api/mappingSecrets/mutation";
import { ROUTE_PATHS } from "../../../const/routes";
import { hasSecretReadValueOrDescribePermission } from "../../../lib/fn/permission";
import {
  faArrowDown,
  faArrowUp,
  faInfoCircle,
  faBan,
  faCheck,
  faTrash,   
  faLock,
  faUpRightFromSquare
} from "@fortawesome/free-solid-svg-icons";
const ReferenceSecretDetailPage = () => {
  const { currentProject } = useProject();
  const params = useParams({ strict: false });
  const { permission } = useProjectPermission();
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const { data: detailSecret } = useGetSecretAndMappingSecrets({
    projectId: params?.projectId,
    mappingId: params?.mappingId
  });

  console.log(detailSecret);

  const navigate = useNavigate({ from: ROUTE_PATHS.SecretManager.ReferenceSecretDetailPage.path });
  const [editedValue, setEditedValue] = useState(detailSecret?.mappingSecret?.value || "");

  const [secretPath, setSecretPath] = useState("");

  useEffect(() => {
    if (detailSecret?.mappingSecret?.key) {
      setSecretPath(detailSecret?.mappingSecret?.key);
    }
  }, [detailSecret]);

  const [isUpdate, setIsUpdate] = useState(false);

  const canReadSecretValue = hasSecretReadValueOrDescribePermission(
    permission,
    ProjectPermissionSecretActions.ReadValue
  );

  useEffect(() => {
    if (!detailSecret?.secrets) return;

    const hasEditableSecret = detailSecret.secrets.some((secret) =>
      permission.can(
        ProjectPermissionSecretActions.Edit,
        subject(ProjectPermissionSub.Secrets, {
          environment: secret?.env || "",
          secretPath: secret?.path || "",
          secretName: secret?.key || "",
          secretTags: ["*"]
        })
      )
    );

    setIsUpdate(hasEditableSecret);
  }, [detailSecret?.secrets]);

  const toggleModal = useCallback(() => {
    setIsModalOpen((prev) => !prev);
  }, []);

  useEffect(() => {
    setEditedValue(detailSecret?.mappingSecret?.value || "");
  }, [detailSecret]);

  const updateMappingSecret = useUpdateMappingSecret();

  const handleSave = async (mappingKey: string, oldValue: string, mappingId: string) => {
    try {
      updateMappingSecret.mutate({
        secretKey: mappingKey,
        environment: "env",
        value: oldValue,
        projectId: currentProject.id,
        secretPath: "/",
        newValue: editedValue,
        mappingId: mappingId,
        secretData: {
          mappingSecret: detailSecret?.mappingSecret,
          secrets: detailSecret?.secrets
        }
      });

      createNotification({
        text: "Successfully updated reference secret values",
        type: "success"
      });
    } catch (error) {
      createNotification({
        text: `Fail to updated reference secret values ${error}`,
        type: "error"
      });
    }
  };

  const deleteMappingSecretMutation = useDeleteMappingSecret();

  const handleDeleteMappingSecret = async (mappingId: string) => {
    setIsModalOpen(false);
    try {
      await deleteMappingSecretMutation.mutateAsync({
        mappingId,
        projectId: currentProject.id
      });
      createNotification({
        text: "Mapping secret deleted successfully",
        type: "success"
      });
      navigate({
        to: "/projects/secret-management/$projectId/reference-secrets",
        params: { projectId: currentProject.id }
      });
    } catch (error) {
      createNotification({
        text: `Failed to delete mapping secret: ${error}`,
        type: "error"
      });
    }
  };

  const handleChangeRoute = (env: string, secretPath: string) => {
    console.log(secretPath);
    navigate({
      to: "/projects/secret-management/$projectId/overview",
      params: {
        projectId: currentProject.id,
        envSlug: env
      },
      search: {
        secretPath: `/${secretPath}`
      }
    });
  };

  const blurClass = "blur-sm opacity-50 cursor-not-allowed";

  return (
    <div>
      <div className="relative mx-auto max-w-7xl text-mineshaft-50 dark:[color-scheme:dark]">
        <div className="flex w-full items-baseline justify-between">
          <PageHeader title="Reference secret" />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <FolderBreadCrumbs secretPath={secretPath} />
      </div>

      <div className="mt-4">
        {/* Table Mapping Secret */}
        <TableContainer className="thin-scrollbar max-h-[66vh] overflow-y-auto rounded-b-none border border-gray-700">
          <Table className="w-full table-auto border-collapse">
            <THead className="sticky top-0 z-20 bg-gray-900 text-center">
              <Tr>
                {["Reference Key", "Value", "Environment", "Action"].map((title, idx) => (
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
              {detailSecret?.mappingSecret && (
                <Tr className="text-center hover:bg-gray-800">
                  <Td>
                    <div className="text-center">{detailSecret?.mappingSecret.key || "—"}</div>
                  </Td>
                  <Td className="relative">
                    {canReadSecretValue ? (
                      <input
                        type="password"
                        value={editedValue}
                        onChange={(e) => setEditedValue(e.target.value)}
                        className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1 text-white focus:border-blue-500 focus:outline-none"
                        onFocus={(e) => (e.currentTarget.type = "text")}
                        onBlur={(e) => (e.currentTarget.type = "password")}
                      />
                    ) : (
                      <div className="flex items-center">
                        <span className="italic text-gray-400">••••••••</span>
                        <Tooltip content="You don't have permission to view this value">
                          <span className="ml-2 flex cursor-help items-center text-gray-400">
                            <FontAwesomeIcon icon={faUpRightFromSquare} />
                          </span>
                        </Tooltip>
                      </div>
                    )}
                  </Td>

                  <Td className={!canReadSecretValue ? blurClass : "text-center"}>
                    {!canReadSecretValue ? (
                      <Tooltip content="You don't have permission to view environment">
                        <span>{detailSecret?.secrets[0]?.environment || "—"}</span>
                      </Tooltip>
                    ) : (
                      detailSecret?.secrets[0]?.environment
                    )}
                  </Td>

                  <Td>
                    <div className="flex h-full items-center justify-center gap-4 p-2 text-center text-sm">
                      {editedValue !== detailSecret?.mappingSecret?.value &&
                        (isUpdate ? (
                          <FontAwesomeIcon
                            icon={faCheck}
                            className="cursor-pointer text-white"
                            onClick={() =>
                              handleSave(
                                detailSecret?.mappingSecret.key,
                                detailSecret?.mappingSecret.value,
                                detailSecret?.mappingSecret.id
                              )
                            }
                          />
                        ) : (
                          <Tooltip content="You don't have permission to update this secret">
                            <FontAwesomeIcon
                              icon={faBan}
                              className="cursor-not-allowed text-gray-400"
                            />
                          </Tooltip>
                        ))}
                      {isUpdate ? (
                        <FontAwesomeIcon
                          icon={faTrash}
                          className="cursor-pointer text-white"
                          onClick={toggleModal}
                        />
                      ) : (
                        <Tooltip content="You don't have permission to delete this secret">
                          <FontAwesomeIcon
                            icon={faTrash}
                            className="cursor-not-allowed text-gray-400"
                          />
                        </Tooltip>
                      )}
                    </div>
                  </Td>
                </Tr>
              )}
            </TBody>
          </Table>
        </TableContainer>
      </div>

      {/* Table Secrets */}
      <div className="mt-4">
        <TableContainer className="thin-scrollbar max-h-[66vh] overflow-y-auto rounded-b-none border border-gray-700">
          <Table className="w-full table-auto border-collapse">
            <THead>
              <Tr>
                <Th>Name</Th>
                <Th>Service</Th>
                <Th>Environment</Th>
              </Tr>
            </THead>
            <TBody>
              {detailSecret?.secrets.map((sec, index) => (
                <Tr
                  key={index}
                  onClick={() => handleChangeRoute(sec.env, sec.folderName)}
                  className="cursor-pointer"
                >
                  <Td className={!canReadSecretValue ? blurClass : ""}>
                    {!canReadSecretValue ? (
                      <Tooltip content="You don't have permission to read this secret">
                        <span>{sec.secretKey}</span>
                      </Tooltip>
                    ) : (
                      sec.secretKey
                    )}
                  </Td>
                  <Td className={!canReadSecretValue ? blurClass : ""}>
                    {!canReadSecretValue ? (
                      <Tooltip content="You don't have permission to view service">
                        <span>{sec.folderName}</span>
                      </Tooltip>
                    ) : (
                      sec.folderName
                    )}
                  </Td>
                  <Td className={!canReadSecretValue ? blurClass : ""}>
                    {!canReadSecretValue ? (
                      <Tooltip content="You don't have permission to view environment">
                        <span>{sec.environment}</span>
                      </Tooltip>
                    ) : (
                      sec.environment
                    )}
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </TableContainer>
      </div>

      <DeleteActionModal
        isOpen={isModalOpen}
        onClose={toggleModal}
        title="Do you want to delete the mapping selected secret?"
        deleteKey={detailSecret?.mappingSecret?.key}
        onDeleteApproved={() => handleDeleteMappingSecret(detailSecret?.mappingSecret?.id)}
      />
    </div>
  );
};

export default ReferenceSecretDetailPage;
