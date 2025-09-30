import { TDbClient } from "@app/db";
import { ormify, selectAllTableCols, sqlNestRelationships } from "@app/lib/knex";
import {TableName, TSecretMappingsInsert, TSecretMappingsUpdate} from "@app/db/schemas";
import { Knex } from "knex";

export type TSecretMappingDALFactory = ReturnType<typeof secretMappingDALFactory>

export const secretMappingDALFactory = (db: TDbClient) => {

    const secretMappingOrm = ormify(db, TableName.SecretMapping)



    const createSecretMapping = async (record: TSecretMappingsInsert) => {
        const [secret] = await(db.replicaNode())(TableName.SecretMapping).insert(record).returning("*")
        return secret
    }

    const updateSecretMapping = async () => {

    }

    const getSecretMappingById = async (tx: Knex, id: string) => {
        const secretMappings = await (tx || db.replicaNode())(TableName.SecretMapping)
        .join(TableName.Secret, `${TableName.Secret}.mappingId`, `${TableName.SecretMapping}.id`)
        .where(`${TableName.SecretMapping}.id`, id)
        .first()
        return {
            ...secretMappings
        }
    } 

    const getAllSecretMapping = async () => {
        const secretMappings = await (db.replicaNode())(TableName.SecretMapping)
        return secretMappings
    }

    const deleteSecretMapping = async () => {

    }

    const generateSecretMappingKey = async () => {  
        return Math.random().toString(36).substring(2, 10).toUpperCase();
    }

    const findByValue = async (value: string) => {
        const secretMapping = await (db.replicaNode())(TableName.SecretMapping)
        .where(`${TableName.SecretMapping}.value`, value)
        .first()
        return secretMapping
    }

    return {
        ...secretMappingOrm,
        updateSecretMapping,
        getSecretMappingById,
        createSecretMapping,
        getAllSecretMapping,
        deleteSecretMapping,
        generateSecretMappingKey,
        findByValue
    }
}