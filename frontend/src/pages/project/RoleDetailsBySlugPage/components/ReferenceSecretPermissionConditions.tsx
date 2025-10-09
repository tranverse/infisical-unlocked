import { ProjectPermissionSub } from "@app/context/ProjectPermissionContext/types";

import { ConditionsFields } from "./ConditionsFields";

type Props = {
  position?: number;
  isDisabled?: boolean;
};

export const ReferenceSecretPermissionConditions = ({ position = 0, isDisabled }: Props) => {
  console.log("pggg", position);
  return (
    <ConditionsFields
      isDisabled={isDisabled}
      subject={ProjectPermissionSub.ReferenceSecrets}
      position={position}
      selectOptions={[{ value: "environment", label: "Environment Slug" }]}
    />
  );
};
