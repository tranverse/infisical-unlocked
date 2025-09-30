import { Knex } from "knex";
import { TableName } from "../schemas";

export async function up(knex: Knex): Promise<void> {
    // if(await knex.schema.hasColumn(TableName.SecretMapping, "value")){
        await knex.schema.alterTable(TableName.SecretMapping, (table) => {
            table.binary("value").notNullable().alter()
        })
    // }
}


export async function down(knex: Knex): Promise<void> {
    // if(await knex.schema.hasColumn(TableName.SecretMapping, "value")){
        await knex.schema.alterTable(TableName.SecretMapping, (table) => {
            table.string("value").notNullable().alter()
        })
    // }
}

