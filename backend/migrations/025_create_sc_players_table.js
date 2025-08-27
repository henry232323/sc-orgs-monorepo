/**
 * Create sc_players table for Star Citizen player reputation tracking
 * This table stores basic player information from Spectrum API
 */

exports.up = function (knex) {
  return knex.schema.createTable('sc_players', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('spectrum_id').unique().notNullable();
    table.string('current_handle').notNullable();
    table.string('current_display_name');
    table.timestamp('first_observed_at').defaultTo(knex.fn.now());
    table.timestamp('last_observed_at').defaultTo(knex.fn.now());
    table.timestamp('last_spectrum_sync_at');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes for performance
    table.index(['spectrum_id']);
    table.index(['current_handle']);
    table.index(['is_active']);
    table.index(['last_observed_at']);
    table.index(['last_spectrum_sync_at']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('sc_players');
};