/**
 * Make rsi_handle column non-null
 * This should be run after 022_populate_rsi_handles.js to ensure all users have rsi_handle values
 */

exports.up = function (knex) {
  return knex.schema.alterTable('users', function (table) {
    table.string('rsi_handle').notNullable().alter();
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('users', function (table) {
    table.string('rsi_handle').nullable().alter();
  });
};
