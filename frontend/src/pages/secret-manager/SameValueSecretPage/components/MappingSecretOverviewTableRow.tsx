import { subject } from "@casl/ability";
import { faCircle } from "@fortawesome/free-regular-svg-icons";
import {
  faAngleDown,
  faCheck,
  faCodeBranch,
  faEye,
  faEyeSlash,
  faFileImport,
  faKey,
  faRotate,
  faXmark
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { twMerge } from "tailwind-merge";

import { Button, Checkbox, TableContainer, Td, Tooltip, Tr } from "@app/components/v2";
import { useProjectPermission } from "@app/context";
import {
  ProjectPermissionSecretActions,
  ProjectPermissionSub
} from "@app/context/ProjectPermissionContext/types";
import { useToggle } from "@app/hooks";
import { SecretType, SecretV3RawSanitized } from "@app/hooks/api/secrets/types";
import { ProjectEnv } from "@app/hooks/api/types";
import { getExpandedRowStyle } from "@app/pages/secret-manager/OverviewPage/components/utils";
import { HIDDEN_SECRET_VALUE } from "@app/pages/secret-manager/SecretDashboardPage/components/SecretListView/SecretItem";

import { SecretValueRow } from "./SecretValueRow";
import SecretRenameRow from "../../OverviewPage/components/SecretOverviewTableRow/SecretRenameRow";
import { useGetImportedSecretsAllEnvs } from "@app/hooks/api";
type Props = {
  secretKey: string;
  secretPath: string;
  environments: { name: string; slug: string }[];
  isSelected: boolean;
  canReadSecretValue: boolean;
  scrollOffset: number;
  importedBy?: {
    environment: { name: string; slug: string };
    folders: {
      name: string;
      secrets?: { secretId: string; referencedSecretKey: string; referencedSecretEnv: string }[];
      isImported: boolean;
    }[];
  }[];
  folderName: string;
  projectId: string;
  userAvailableEnvs: [];
  secrets: [];
  blurClass: string;
};

export const MappingSecretOverviewTableRow = ({
  secretKey,
  environments = [],
  secretPath,
  getSecretByKey,
  onSecretUpdate,
  onSecretCreate,
  onSecretDelete,
  // isImportedSecretPresentInEnv,
  canReadSecretValue,
  scrollOffset,
  onToggleSecretSelect,
  isSelected,
  importedBy,
  folderName,
  projectId,
  userAvailableEnvs,
  secrets,
  blurClass
}: Props) => {
  const {
    secretImports,
    isImportedSecretPresentInEnv,
    getImportedSecretByKey,
    getEnvImportedSecretKeyCount
  } = useGetImportedSecretsAllEnvs({
    projectId: projectId,
    path: secretPath,
    environments: (userAvailableEnvs || []).map(({ slug }) => slug)
  });
  const [isFormExpanded, setIsFormExpanded] = useToggle();
  const totalCols = environments.length + 1; 
  const [isSecretVisible, setIsSecretVisible] = useToggle();
  const { permission } = useProjectPermission();
  console.log(canReadSecretValue);
  const getDefaultValue = (
    secret: SecretV3RawSanitized | undefined,
    importedSecret: { secret?: SecretV3RawSanitized } | undefined
  ) => {
    const canEditSecretValue = permission.can(
      ProjectPermissionSecretActions.Edit,
      subject(ProjectPermissionSub.Secrets, {
        environment: secret?.env || "",
        secretPath: secret?.path || "",
        secretName: secret?.key || "",
        secretTags: ["*"]
      })
    );

    if (secret?.secretValueHidden && !secret?.valueOverride) {
      return canEditSecretValue ? HIDDEN_SECRET_VALUE : "";
    }
    return secret?.valueOverride || secret?.secretValue || importedSecret?.secret?.value || "";
  };
  return (
    <>
      <Tr isHoverable isSelectable onClick={() => setIsFormExpanded.toggle()} className="group">
        <Td
          className={`sticky left-0 z-10 bg-mineshaft-800 bg-clip-padding px-0 py-0 group-hover:bg-mineshaft-700 ${
            isFormExpanded && "border-t-2 border-mineshaft-500"
          }`}
        >
          <div className="h-full w-full border-r border-mineshaft-600 px-5 py-2.5">
            <div className="flex items-center space-x-5">
              <div className="text-bunker-300">
                <Checkbox
                  id={`checkbox-${secretKey}`}
                  isChecked={isSelected}
                  onCheckedChange={() => {
                    onToggleSecretSelect(secretKey);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  className={twMerge("hidden group-hover:flex", isSelected && "flex")}
                />
                <FontAwesomeIcon
                  className={twMerge("block group-hover:hidden", isSelected && "hidden")}
                  icon={isFormExpanded ? faAngleDown : faKey}
                />
              </div>
              <div
                title={secretKey}
                className={`${!canReadSecretValue ? blurClass : "text-center"}`}
              >
                {secretKey}
              </div>
            </div>
          </div>
        </Td>
        <Td>
          <div
            className={`h-full w-full border-r border-mineshaft-600 px-5 py-2.5 text-center ${!canReadSecretValue ? blurClass : "text-center"}`}
          >
            <div className="text-white">
              <div>{folderName}</div>
            </div>
          </div>
        </Td>
      </Tr>
      {/* {isFormExpanded && (
        <Tr>
          <Td
            colSpan={totalCols + 1}
            className={`bg-bunker-600 px-0 py-0 ${
              isFormExpanded && "border-b-2 border-mineshaft-500"
            }`}
          >
            <div className="ml-2 p-2" style={getExpandedRowStyle(scrollOffset)}>
              <SecretRenameRow
                secretKey={secretKey}
                environments={environments}
                secretPath={secretPath}
                getSecretByKey={getSecretByKey}
              />
              <TableContainer>
                <table className="secret-table">
                  <thead>
                    <tr className="h-10 border-b-2 border-mineshaft-600">
                      <th
                        style={{ padding: "0.5rem 1rem" }}
                        className="min-table-row min-w-[11rem]"
                      >
                        Environment
                      </th>
                      <th style={{ padding: "0.5rem 1rem" }} className="border-none">
                        Value
                      </th>
                    </tr>
                  </thead>
                  <tbody className="border-t-2 border-mineshaft-600">
                    {environments.map(({ name, slug }) => {
                      const secret = getSecretByKey(slug, secretKey, folderName, secrets);
                      const isCreatable = !secret;
                      const isImportedSecret = isImportedSecretPresentInEnv(slug, secretKey);
                      const importedSecret = getImportedSecretByKey(slug, secretKey);
                      const value = getDefaultValue(secret, importedSecret);
                      console.log(value);

                      return (
                        <tr
                          key={`secret-expanded-${slug}-${secretKey}`}
                          className="hover:bg-mineshaft-700"
                        >
                          <td
                            className="flex h-full items-center"
                            style={{ padding: "0.25rem 1rem" }}
                          >
                            <div title={name} className="flex h-8 w-[8rem] items-center space-x-2">
                              <span className="truncate">{name}</span>
                            </div>
                          </td>
                          <td className="col-span-2 h-8 w-full">
                            <SecretValueRow
                              defaultValue={getDefaultValue(secret, importedSecret)}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </TableContainer>
            </div>
          </Td>
        </Tr>
      )} */}
    </>
  );
};
