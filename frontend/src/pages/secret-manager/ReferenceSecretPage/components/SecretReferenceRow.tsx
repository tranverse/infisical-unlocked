import React, { useState } from "react";
import { Tr, Td, Tooltip } from "@app/components/v2";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCopy, faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import { useProjectPermission } from "@app/context";
import { ProjectPermissionSub } from "@app/context";
import {
  ProjectPermissionSecretActions,
  ProjectPermissionReferenceSecretActions
} from "@app/context/ProjectPermissionContext/types";
import { subject } from "@casl/ability";

type Props = {
  referenceSecret: any;
  itemKey: string;
  onClick: (id: string) => void;
  searchTerm?: string;
  canReadReferenceSecret: boolean;
  blurClass: string;
};

const colors = [
  "bg-red-400",
  "bg-green-400",
  "bg-blue-400",
  "bg-yellow-400",
  "bg-purple-400",
  "bg-pink-400",
  "bg-indigo-400"
];

const SecretReferenceRow = ({
  referenceSecret,
  itemKey,
  onClick,
  searchTerm = "",
  blurClass
}: Props) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const { permission } = useProjectPermission();

  // const canReadEnv = permission.can(
  //   ProjectPermissionSecretActions.ReadValue,
  //   subject(ProjectPermissionSub.Secrets, { environment: referenceSecret.environment })
  // );
  const canReadKey = permission.can(
    ProjectPermissionSecretActions.ReadValue,
    subject(ProjectPermissionSub.Secrets, { secretName: referenceSecret.key })
  );
  const highlightText = (text: string) => {
    if (!searchTerm) return text;
    const regex = new RegExp(`(${searchTerm})`, "gi");
    const parts = text.split(regex);
    return (
      <>
        {parts.map((part, index) =>
          regex.test(part) ? (
            <span key={index} className="bg-yellow-600 text-center">
              {part}
            </span>
          ) : (
            part
          )
        )}
      </>
    );
  };

  const secretKeys = referenceSecret?.secrets
    ?.map((s: any) => s.secretKey)
    .filter(Boolean)
    .join(", ");

  const isKeyFiltered =
    searchTerm &&
    (referenceSecret.key?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      referenceSecret.secrets?.some((s: any) =>
        s.secretKey?.toLowerCase().includes(searchTerm.toLowerCase())
      ));

  return (
    <Tr key={itemKey} onClick={() => onClick(referenceSecret.id)} className="cursor-pointer">
      <Td className="sticky left-0 z-10 bg-mineshaft-800 bg-clip-padding p-0 group-hover:bg-mineshaft-700">
        <div className="flex h-full w-full items-center justify-between border-r border-mineshaft-600 px-5 py-2.5">
          <div className="flex items-center space-x-2">
            <FontAwesomeIcon icon={faCopy} className="text-bunker-300" />

            <div className={`} flex-1`}>{highlightText(referenceSecret.key)}</div>
          </div>

          {secretKeys && canReadKey && (
            <Tooltip content={secretKeys}>
              <span
                className="ml-2 cursor-help text-blue-400"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
              >
                <FontAwesomeIcon icon={faInfoCircle} />
              </span>
            </Tooltip>
          )}
        </div>
      </Td>

      <Td>
        <div className="flex h-full w-full flex-wrap gap-2 border-r border-mineshaft-600 px-5 py-2.5">
          {referenceSecret?.services?.map((service, index) => {
            const randomColor = colors[index % colors.length];
            return (
              <span
                key={index}
                className={`rounded-full px-3 py-1 text-xs font-medium text-black shadow-sm ${randomColor} `}
              >
                {highlightText(service.folderName)}
              </span>
            );
          })}
        </div>
      </Td>

      <Td>
        {/* {!canReadEnv ? (
          <Tooltip content="You don't have permission to view environment">
            <span className="cursor-not-allowed blur-sm">*******</span>
          </Tooltip>
        ) : ( */}
        {highlightText(referenceSecret?.environment)}
        {/* )} */}
      </Td>
    </Tr>
  );
};

export default SecretReferenceRow;
