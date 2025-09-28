import { Knex } from "knex";
import { TableName } from "../schemas";

import { createJunctionTable, createOnUpdateTrigger, dropOnUpdateTrigger } from "../utils";

export async function up(knex: Knex): Promise<void> {
    console.log("aa")
    if(!(await knex.schema.hasTable(TableName.SecretMapping))){
        await knex.schema.createTable(TableName.SecretMapping, (t) => {
            t.uuid("id", {primaryKey: true}).defaultTo(knex.fn.uuid());
            t.string("key").notNullable();
            t.string("value").notNullable();
            t.timestamps(true, true, true)
        })
    }
    await createUpdateAtTriggerFunction(knex);
    await createOnUpdateTrigger(knex, TableName.SecretMapping)

}


export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists(TableName.SecretMapping);
    await dropOnUpdateTrigger(knex, TableName.SecretMapping)
}

