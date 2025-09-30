import { OrderByDirection, TProjectPermission } from "@app/lib/types";

export type TCreateSecretMappingDTO = {
    secretName: String,
    value: String
} & TProjectPermission;
