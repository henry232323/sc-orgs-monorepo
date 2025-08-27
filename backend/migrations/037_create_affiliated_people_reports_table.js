/**
 * Create affiliated_people_reports table for reporting suspected player affiliations
 * This table stores reports about players suspected of being affiliated with other players
 */

exports.up = function (knex) {
  return knex.schema.createTable('affiliated_people_reports', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('main_player_id').references('id').inTable('sc_players').onDelete('CASCADE');
    table.uuid('reporter_id').references('id').inTable('users').onDelete('CASCADE');
    table.string('affiliated_handle').notNullable(); // Suspected affiliated person's handle
    table.string('affiliated_spectrum_id'); // Affiliated person's Spectrum ID
    table.string('affiliated_display_name'); // Affiliated person's display name
    table.string('relationship_type'); // 'friend', 'associate', 'teammate', 'guild_member', etc.
    table.text('description'); // Evidence/description of relationship
    table.json('evidence_urls'); // URLs to evidence
    table.string('status').defaultTo('pending'); // 'pending', 'approved', 'rejected', 'disputed'
    table.integer('corroboration_count').defaultTo(0); // Number of corroborations
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes for performance
    table.index(['main_player_id']);
    table.index(['affiliated_spectrum_id']);
    table.index(['affiliated_handle']);
    table.index(['reporter_id']);
    table.index(['relationship_type']);
    table.index(['status']);
    table.index(['corroboration_count']);
    table.index(['created_at']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('affiliated_people_reports');
};