/**
 * Create organization_reports table for reporting suspected organizational affiliations
 * This table stores reports about players suspected of being affiliated with specific organizations
 */

exports.up = function (knex) {
  return knex.schema.createTable('organization_reports', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('player_id').references('id').inTable('sc_players').onDelete('CASCADE');
    table.uuid('reporter_id').references('id').inTable('users').onDelete('CASCADE');
    table.string('org_spectrum_id').notNullable(); // Organization's Spectrum ID
    table.string('org_name'); // Cached organization name
    table.text('description'); // Evidence/description of affiliation
    table.json('evidence_urls'); // URLs to evidence
    table.string('status').defaultTo('pending'); // 'pending', 'approved', 'rejected', 'disputed'
    table.integer('corroboration_count').defaultTo(0); // Number of corroborations
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes for performance
    table.index(['player_id']);
    table.index(['org_spectrum_id']);
    table.index(['reporter_id']);
    table.index(['status']);
    table.index(['corroboration_count']);
    table.index(['created_at']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('organization_reports');
};