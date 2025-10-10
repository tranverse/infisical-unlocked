import { SearchModal } from "./SearchModal";
import { useState } from "react";

type ModalProps = {
  value: string;
  className?: string;
  placeholder: string;
  onChange: (value: string) => void;
  secrets: [];
  searchValue: string;
  projectId: string;
  canReadSecret: boolean;
};

const SearchInput = ({
  placeholder,
  value,
  onChange,
  secrets,
  searchValue,
  projectId,
  canReadSecret
}: ModalProps) => {
  const [isOpenModal, setIsOpenModal] = useState(false);

  const handleSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      setIsOpenModal(true);
    }
  };

  const handleCloseModal = () => {
    setIsOpenModal(false);
  };

  return (
    <div className="flex w-80 items-center rounded border border-mineshaft-500 bg-mineshaft-800 px-2 py-1 text-mineshaft-50">
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleSearchKey}
        className="w-full bg-transparent p-1 text-sm text-mineshaft-50 placeholder-gray-400 outline-none"
      />

      {isOpenModal && (
        <SearchModal
          isOpen={isOpenModal}
          onOpenChange={setIsOpenModal}
          onClose={handleCloseModal}
          initialValue={searchValue}
          secrets={secrets}
          projectId={projectId}
          canReadSecret={canReadSecret}
        />
      )}
    </div>
  );
};

export default SearchInput;
