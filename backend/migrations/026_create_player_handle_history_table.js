/**
 * Create player_handle_history table for tracking player handle changes over time
 * This table maintains a complete history of all handles a player has used
 */

exports.up = function (knex) {
  return knex.schema.createTable('player_handle_history', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('player_id').references('id').inTable('sc_players').onDelete('CASCADE');
    table.string('handle').notNullable();
    table.string('display_name');
    table.timestamp('first_observed_at').defaultTo(knex.fn.now());
    table.timestamp('last_observed_at').defaultTo(knex.fn.now());
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Indexes for performance
    table.index(['player_id']);
    table.index(['handle']);
    table.index(['first_observed_at']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('player_handle_history');
};