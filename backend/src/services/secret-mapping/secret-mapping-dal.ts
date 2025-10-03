import { TDbClient } from "@app/db";
import { ormify, selectAllTableCols, sqlNestRelationships } from "@app/lib/knex";
import { TableName, TSecretMappingsInsert, TSecretMappingsUpdate } from "@app/db/schemas";
import { Knex } from "knex";

export type TSecretMappingDALFactory = ReturnType<typeof secretMappingDALFactory>;

export const secretMappingDALFactory = (db: TDbClient) => {
  const secretMappingOrm = ormify(db, TableName.SecretMapping);

  const createSecretMapping = async (record: TSecretMappingsInsert) => {
    const [secret] = await db.replicaNode()(TableName.SecretMapping).insert(record).returning("*");
    return secret;
  };

  const findOneByKey = async (key: string) => {
    const secret = await db.replicaNode()(TableName.SecretMapping).where(`${TableName.SecretMapping}.key`, key).first();
    return secret;
  };

  const getSecretMappingById = async (id: string) => {
    const secretMappings = await db
      .replicaNode()(TableName.SecretMapping)
      .join(TableName.Secret, `${TableName.Secret}.mappingId`, `${TableName.SecretMapping}.id`)
      .where(`${TableName.SecretMapping}.id`, id)
      .first();
    return {
      ...secretMappings
    };
  };

  // const getAllSecretMapping = async () => {
  //     const secretMappings = await (db.replicaNode())(TableName.SecretMapping)
  //     return secretMappings
  // }
  const getAllSecretMappingInProject = async (projectId: string) => {
    const secretMappings = await db
      .replicaNode()(TableName.SecretMapping)
      .distinct(`${TableName.SecretMapping}.id`)
      .join(`${TableName.SecretV2}`, `${TableName.SecretMapping}.id`, `${TableName.SecretV2}.mappingId`)
      .join(`${TableName.SecretFolder}`, `${TableName.SecretV2}.folderId`, `${TableName.SecretFolder}.id`)
      .join(`${TableName.Environment}`, `${TableName.SecretFolder}.envId`, `${TableName.Environment}.id`)
      .where(`${TableName.Environment}.projectId`, projectId)
      .select(selectAllTableCols(TableName.SecretMapping));
    return secretMappings;
  };

  const deleteSecretMappingById = async (id: string) => {
    await db(TableName.SecretMapping).where(`${TableName.SecretMapping}.id`, id).delete();
  };

  const generateSecretMappingKey = async () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  };

  const findByValue = async (value: string) => {
    const secretMapping = await db
      .replicaNode()(TableName.SecretMapping)
      .where(`${TableName.SecretMapping}.value`, value)
      .first();
    return secretMapping;
  };

  const updateMappingSecretValue = async (value: string, secretMappingId: string) => {
    const [updateMappingSecret] = await db(TableName.SecretMapping)
      .where(`${TableName.SecretMapping}.id`, secretMappingId)
      .update({ value: value })
      .returning("*");

    await db(TableName.SecretV2)
      .where(`${TableName.SecretV2}.mappingId`, secretMappingId)
      .update({ encryptedValue: value });

    const secrets = await db(TableName.SecretV2).where(`${TableName.SecretV2}.mappingId`, secretMappingId);

    return {
      updateMappingSecret,
      secrets
    };
  };

  const findOneByValue = async (value: string) => {
    return await db(TableName.SecretMapping).where(`${TableName.SecretMapping}.value`, value);
  };

  const getSecretsAndMappingSecretInProject = async (mappingId) => {
    const mappingSecret = await db(TableName.SecretMapping).where(`${TableName.SecretMapping}.id`, mappingId).first();

    const secrets = await db(TableName.SecretV2)
      .where(`${TableName.SecretV2}.mappingId`, mappingId)
      .join(`${TableName.SecretFolder}`, `${TableName.SecretV2}.folderId`, `${TableName.SecretFolder}.id`)
      .join(`${TableName.Environment}`, `${TableName.SecretFolder}.envId`, `${TableName.Environment}.id`)
      .select(selectAllTableCols(TableName.SecretV2))
      .select(db.ref("name").withSchema(TableName.Environment).as("environment"))
      .select(db.ref("name").withSchema(TableName.SecretFolder).as("folderName"));

    return {
      mappingSecret,
      secrets
    };
  };

  return {
    ...secretMappingOrm,
    getSecretMappingById,
    createSecretMapping,
    getAllSecretMappingInProject,
    generateSecretMappingKey,
    findByValue,
    deleteSecretMappingById,
    findOneByValue,
    findOneByKey,
    updateMappingSecretValue,
    getSecretsAndMappingSecretInProject
  };
};
