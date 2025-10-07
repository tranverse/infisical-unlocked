import { faChevronRight, faFolder, faKey } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useNavigate } from "@tanstack/react-router";
import { Td, Tr } from "@app/components/v2";
import { reverseTruncate } from "@app/helpers/reverseTruncate";
import { ProjectEnv } from "@app/hooks/api/projects/types";

type Props = {
  environments: ProjectEnv[];
  secret: any;
  onClose: () => void;
  isSingleEnv?: boolean;
  tags: string[];
  search: string;
  projectId: string;
  mappingId: string;
};

export const SearchSecretItem = ({ secret, onClose, projectId, mappingId }: Props) => {
  const navigate = useNavigate();

  const handleNavigate = () => {
    navigate({
      to: "/projects/secret-management/$projectId/reference-secrets/detail/$mappingId",
      params: {
        projectId: projectId,
        mappingId: mappingId
      }
    });
    onClose();
  };
  console.log(secret);
  return (
    <Tr className="cursor-pointer bg-mineshaft-700 hover:bg-mineshaft-600" onClick={handleNavigate}>
      <Td className="w-full">
        <div className="flex flex-col">
          <span className="flex items-center gap-2 truncate">
            <FontAwesomeIcon className="text-bunker-300" icon={faKey} />
            {secret.secretKey}
          </span>
          <span className="text-xs text-mineshaft-400">
            <FontAwesomeIcon size="xs" className="mr-0.5 text-yellow-700" icon={faFolder} />{" "}
            {reverseTruncate(secret.environment || "")}
          </span>
        </div>
      </Td>
      <Td>
        <FontAwesomeIcon icon={faChevronRight} />
      </Td>
    </Tr>
  );
};
