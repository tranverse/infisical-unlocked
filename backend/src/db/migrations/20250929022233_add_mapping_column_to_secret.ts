import { Knex } from "knex";
import { TableName } from "../schemas";


export async function up(knex: Knex): Promise<void> {
    if(!await knex.schema.hasColumn(TableName.Secret, "mappingId")){
        await knex.schema.alterTable(TableName.Secret, (table) => {
            table.uuid("mappingId").nullable();
            table.foreign("mappingId").references("id").inTable(TableName.SecretMapping).onDelete("SET NULL")
        })
    }
}


export async function down(knex: Knex): Promise<void> {
    if(await knex.schema.hasColumn(TableName.Secret, "mappingId")){
        await knex.schema.alterTable(TableName.Secret, (table) => {
            table.dropColumn("mappingId")
        })
    }

}

