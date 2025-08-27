/**
 * Create player_org_history table for tracking player organization memberships over time
 * This table maintains a complete history of all organizations a player has been in
 */

exports.up = function (knex) {
  return knex.schema.createTable('player_org_history', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('player_id').references('id').inTable('sc_players').onDelete('CASCADE');
    table.string('org_name').notNullable();
    table.string('org_spectrum_id');
    table.string('role');
    table.timestamp('first_observed_at').defaultTo(knex.fn.now());
    table.timestamp('last_observed_at').defaultTo(knex.fn.now());
    table.boolean('is_current').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Indexes for performance
    table.index(['player_id']);
    table.index(['org_spectrum_id']);
    table.index(['is_current']);
    table.index(['first_observed_at']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('player_org_history');
};