import React from "react";
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
type Props = {
  count: number;
  blurClass: string;
};
const SecretNoAccessRow = ({ blurClass, count }: Props) => {
  return (
    <>
      {Array.from(Array(count)).map((_, index) => (
        <Tr
          key={index}
          onClick={() => handleChangeRoute(sec.env, sec.folderName)}
          className="cursor-pointer"
        >
          <Td className={blurClass}>
            <Tooltip content="You don't have permission to read this secret">
              <span>***</span>
            </Tooltip>
          </Td>
          <Td className={blurClass}>
            <Tooltip content="You don't have permission to view service">
              <span>****</span>
            </Tooltip>
          </Td>
          <Td className={blurClass}>
            <Tooltip content="You don't have permission to view environment">
              <span>***</span>
            </Tooltip>
          </Td>
        </Tr>
      ))}
    </>
  );
};

export default SecretNoAccessRow;
