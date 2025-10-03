import {
  faCheck,
  faFingerprint,
  faXmark,
  faObjectUngroup
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { twMerge } from "tailwind-merge";

import { Td, Tr } from "@app/components/v2";
import { VscReferences } from "react-icons/vsc";

type Props = {
  mappingSecretKey: string;
  getMappingValue: () => void;
  value: string;
  onClick: (path: string) => void;
};

export const SecretOverviewMappingSecretRow = ({
  mappingSecretKey,
  value,
  getMappingValue,
  onClick
}: Props) => {
  return (
    <Tr
      isHoverable
      isSelectable
      className="group"
      onClick={() => onClick(getMappingValue(mappingSecretKey).id)}
    >
      <Td className="sticky left-0 z-10 border-0 bg-mineshaft-800 bg-clip-padding p-0 group-hover:bg-mineshaft-700">
        <div className="flex items-center space-x-5 border-r border-mineshaft-600 px-5 py-2.5">
          <div className="text-yellow-700">
            <FontAwesomeIcon icon={faObjectUngroup} />{" "}
          </div>
          <div className="flex w-full items-center justify-between">
            <span>{mappingSecretKey}</span>
            <span className="text-center text-sm italic">Reference secrets</span>
          </div>
        </div>
      </Td>
      {/* {environments.map(({ slug }, i) => {
        const isPresent = isDynamicSecretInEnv(dynamicSecretName, slug);

        return (
          <Td
            key={`sec-overview-${slug}-${i + 1}-folder`}
            className={twMerge(
              "border-r border-mineshaft-600 py-3 group-hover:bg-mineshaft-700",
              isPresent ? "text-green-600" : "text-red-600"
            )}
          >
            <div className="mx-auto flex w-[0.03rem] justify-center">
              <FontAwesomeIcon
                // eslint-disable-next-line no-nested-ternary
                icon={isPresent ? faCheck : faXmark}
              />
            </div>
          </Td>
        );
      })} */}
    </Tr>
  );
};
