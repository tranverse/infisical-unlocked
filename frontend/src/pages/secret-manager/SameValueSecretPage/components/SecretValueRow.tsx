import { useCallback, useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { subject } from "@casl/ability";
import {
  faCheck,
  faCopy,
  faEyeSlash,
  faProjectDiagram,
  faTrash,
  faXmark
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useQueryClient } from "@tanstack/react-query";
import { twMerge } from "tailwind-merge";

import { usePopUp, useToggle } from "@app/hooks";

type Props = {
  defaultValue?: string | null;
};

export const SecretValueRow = ({ defaultValue }: Props) => {
  const { handlePopUpOpen, handlePopUpToggle, handlePopUpClose, popUp } = usePopUp([
    "editSecret"
  ] as const);
  console.log("defaultValue", defaultValue);

  const [isDeleting, setIsDeleting] = useToggle();
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const toggleModal = useCallback(() => {
    setIsModalOpen((prev) => !prev);
  }, []);

  return (
    <div className="group flex w-full cursor-text items-center space-x-2">
      <div className="flex-grow border-r border-r-mineshaft-600 pl-1 pr-2">
        <input type="text" value={defaultValue} className="bg-transparent outline-none" readOnly />
      </div>
    </div>
  );
};
export default SecretValueRow;
