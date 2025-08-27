/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('notification_object', function(table) {
    table.string('title', 255).nullable();
    table.text('message').nullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('notification_object', function(table) {
    table.dropColumn('title');
    table.dropColumn('message');
  });
};
