/**
 * Create alt_account_reports table for reporting suspected alt accounts
 * This table stores reports about players suspected of having multiple accounts
 */

exports.up = function (knex) {
  return knex.schema.createTable('alt_account_reports', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('main_player_id').references('id').inTable('sc_players').onDelete('CASCADE');
    table.uuid('reporter_id').references('id').inTable('users').onDelete('CASCADE');
    table.string('alt_handle').notNullable(); // Suspected alt's handle
    table.string('alt_spectrum_id'); // Alt's Spectrum ID (fetched automatically)
    table.string('alt_display_name'); // Alt's display name
    table.text('description'); // Evidence/description of alt relationship
    table.json('evidence_urls'); // URLs to evidence
    table.string('status').defaultTo('pending'); // 'pending', 'approved', 'rejected', 'disputed'
    table.integer('corroboration_count').defaultTo(0); // Number of corroborations
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes for performance
    table.index(['main_player_id']);
    table.index(['alt_spectrum_id']);
    table.index(['alt_handle']);
    table.index(['reporter_id']);
    table.index(['status']);
    table.index(['corroboration_count']);
    table.index(['created_at']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('alt_account_reports');
};