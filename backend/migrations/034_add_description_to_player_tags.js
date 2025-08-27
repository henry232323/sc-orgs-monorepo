/**
 * Add description column to player_tags table
 * This allows users to provide additional context for their tags
 */

exports.up = function (knex) {
  return knex.schema.alterTable('player_tags', table => {
    table.text('description').nullable(); // Optional description for additional context
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('player_tags', table => {
    table.dropColumn('description');
  });
};