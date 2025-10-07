import { useState } from "react";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { EmptyState, Input, Table, TableContainer, Modal, ModalContent } from "@app/components/v2";
import { useDebounce } from "@app/hooks";
import { ProjectEnv } from "@app/hooks/api/projects/types";
import { WsTag } from "@app/hooks/api/tags/types";
import { SearchSecretItem } from "./SearchSecretItem";

export type SearchModalProps = {
  environments: ProjectEnv[];
  projectId: string;
  tags?: WsTag[];
  isSingleEnv?: boolean;
  initialValue: string;
  onClose: () => void;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  secrets: [];
  canReadEnv: boolean;
};

const Content = ({
  environments,
  projectId,
  onClose,
  initialValue = "",
  isSingleEnv,
  secrets,
  canReadEnv
}: Omit<SearchModalProps, "isOpen" | "onOpenChange">) => {
  const [search, setSearch] = useState(initialValue);
  const [debouncedSearch] = useDebounce(search);

  // ❗Nếu không có quyền -> render modal trống nhưng vẫn có ô input
  if (!canReadEnv) {
    return (
      <div className="min-h-[14.6rem]">
        <div className="flex gap-2">
          <Input
            className="h-[2.3rem] bg-mineshaft-800 placeholder-mineshaft-50 duration-200 focus:bg-mineshaft-700/80"
            placeholder="Search by secret, folder or tag name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={
              <FontAwesomeIcon icon={faMagnifyingGlass} className={search ? "text-primary" : ""} />
            }
          />
        </div>

        <div className="mt-4 max-h-[19rem] min-h-[19rem] overflow-auto">
          <TableContainer className="thin-scrollbar h-full overflow-y-auto">
            <Table>
              <tbody>
                <tr>
                  <td className="py-8 text-center text-mineshaft-300">
                    You don't have permission to view secrets.
                  </td>
                </tr>
              </tbody>
            </Table>
          </TableContainer>
        </div>
      </div>
    );
  }

  // Nếu có quyền -> lọc secrets
  const term = search.toLowerCase().trim();
  let filteredSecrets: any[] = [];

  if (term) {
    filteredSecrets = secrets.flatMap((item: any) =>
      (item.secrets || [])
        .filter((sec: any) => sec.secretKey?.toLowerCase().includes(term))
        .map((sec: any) => ({
          ...sec,
          mappingId: item.id
        }))
    );
  }

  return (
    <div className="min-h-[14.6rem]">
      <div className="flex gap-2">
        <Input
          className="h-[2.3rem] bg-mineshaft-800 placeholder-mineshaft-50 duration-200 focus:bg-mineshaft-700/80"
          placeholder="Search by secret, folder or tag name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={
            <FontAwesomeIcon icon={faMagnifyingGlass} className={search ? "text-primary" : ""} />
          }
        />
      </div>

      <div className="mt-4 max-h-[19rem] min-h-[19rem] overflow-auto">
        <TableContainer className="thin-scrollbar h-full overflow-y-auto">
          <Table>
            {filteredSecrets.length > 0 ? (
              filteredSecrets.map((sec, index) => (
                <SearchSecretItem
                  key={index}
                  secret={sec}
                  search={debouncedSearch}
                  isSingleEnv={isSingleEnv}
                  environments={environments}
                  onClose={onClose}
                  projectId={projectId}
                  mappingId={sec.mappingId}
                />
              ))
            ) : (
              <EmptyState className="mt-24" title="No secrets found" icon={faMagnifyingGlass} />
            )}
          </Table>
        </TableContainer>
      </div>
    </div>
  );
};

export const SearchModal = ({ isOpen, isSingleEnv, onOpenChange, ...props }: SearchModalProps) => {
  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <ModalContent
        title={`Search All Folders${isSingleEnv ? " In Environment" : ""}`}
        onClose={props.onClose}
      >
        <Content isSingleEnv={isSingleEnv} {...props} />
      </ModalContent>
    </Modal>
  );
};
