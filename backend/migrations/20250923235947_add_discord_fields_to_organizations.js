/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('organizations', table => {
    table.uuid('discord_server_id').references('id').inTable('discord_servers').onDelete('SET NULL');
    table.boolean('discord_integration_enabled').defaultTo(false);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('organizations', table => {
    table.dropColumn('discord_server_id');
    table.dropColumn('discord_integration_enabled');
  });
};
