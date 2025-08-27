/**
 * Create player_reports table for community reports about players
 * This table stores reports for suspected orgs, alt accounts, and behavior issues
 */

exports.up = function (knex) {
  return knex.schema.createTable('player_reports', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('player_id').references('id').inTable('sc_players').onDelete('CASCADE');
    table.uuid('reporter_id').references('id').inTable('users').onDelete('CASCADE');
    table.string('report_type').notNullable(); // 'suspected_org', 'suspected_alt', 'behavior'
    table.string('title').notNullable();
    table.text('description');
    table.json('evidence_urls');
    table.string('status').defaultTo('pending'); // 'pending', 'approved', 'rejected', 'disputed'
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes for performance
    table.index(['player_id']);
    table.index(['reporter_id']);
    table.index(['report_type']);
    table.index(['status']);
    table.index(['created_at']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('player_reports');
};