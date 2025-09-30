import { Knex } from "knex";
import { TableName } from "../schemas";


export async function up(knex: Knex): Promise<void> {
    if(!await knex.schema.hasColumn(TableName.SecretVersionV2, "mappingId")){
        await knex.schema.alterTable(TableName.SecretVersionV2, (table) => {
            table.uuid("mappingId").nullable();
            table.foreign("mappingId").references("id").inTable(TableName.SecretMapping).onDelete("SET NULL")
        })
    }
}


export async function down(knex: Knex): Promise<void> {
    if(await knex.schema.hasColumn(TableName.SecretVersionV2, "mappingId")){
        await knex.schema.alterTable(TableName.SecretVersionV2, (table) => {
            table.dropColumn("mappingId")
        })
    }
}

