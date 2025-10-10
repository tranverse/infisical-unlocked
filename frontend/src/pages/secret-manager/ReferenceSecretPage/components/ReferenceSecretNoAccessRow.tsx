import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFilter,
  faCheckCircle,
  faRotate,
  faCopy,
  faInfoCircle,
  faLock
} from "@fortawesome/free-solid-svg-icons";
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
const blurClass = "blur-sm opacity-50 cursor-not-allowed";

type Props = {
  count: number;
};

const ReferenceSecretNoAccessRow = ({ count }) => {
  return (
    <>
      {Array.from(Array(count)).map((_, j) => (
        <Tr key={j} className="cursor-pointer">
          <Td className="sticky left-0 z-10 bg-mineshaft-800 bg-clip-padding p-0 group-hover:bg-mineshaft-700">
            <div className="flex h-full w-full items-center justify-between border-r border-mineshaft-600 px-5 py-2.5">
              <div className="flex items-center space-x-2">
                <Tooltip content="You dont have permission to access this reference secret">
                  <span className="flex items-center space-x-2">
                    <FontAwesomeIcon icon={faLock} className="text-bunker-300" />
                    <span className={`${blurClass}`}>*****</span>
                  </span>
                </Tooltip>
              </div>

              <Tooltip content="You dont have permission to access this reference secret">
                <span className="ml-2 cursor-help text-blue-400">
                  <FontAwesomeIcon icon={faInfoCircle} />
                </span>
              </Tooltip>
            </div>
          </Td>

          <Td>
            <Tooltip content="You dont have permission to access this reference secret">
              <div
                className={`flex h-full w-full flex-wrap gap-2 border-r border-mineshaft-600 px-5 py-2.5 ${blurClass}`}
              >
                *****
              </div>
            </Tooltip>
          </Td>

          <Td>
            <Tooltip content="You don't have permission to view environment">
              <span className="cursor-not-allowed blur-sm">*******</span>
            </Tooltip>
          </Td>
        </Tr>
      ))}
    </>
  );
};

export default ReferenceSecretNoAccessRow;
