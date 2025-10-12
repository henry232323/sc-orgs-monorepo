/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('hr_documents', table => {
    // Drop the existing JSONB column
    table.dropColumn('access_roles');
  }).then(() => {
    // Add the new UUID array column for role IDs
    return knex.schema.alterTable('hr_documents', table => {
      table.specificType('access_roles', 'uuid[]').defaultTo('{}').notNullable();
    });
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('hr_documents', table => {
    // Drop the array column
    table.dropColumn('access_roles');
  }).then(() => {
    // Restore the JSONB column
    return knex.schema.alterTable('hr_documents', table => {
      table.jsonb('access_roles').defaultTo('[]');
    });
  });
};