/**
 * Create player_tags table for community-driven player tagging
 * This table stores tags like 'Pirate', 'Helpful', 'Toxic', etc. with attestation support
 */

exports.up = function (knex) {
  return knex.schema.createTable('player_tags', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('player_id').references('id').inTable('sc_players').onDelete('CASCADE');
    table.uuid('tagger_id').references('id').inTable('users').onDelete('CASCADE');
    table.string('tag_name').notNullable(); // 'Pirate', 'Helpful', 'Toxic', 'Reliable', etc.
    table.string('tag_type').notNullable(); // 'positive', 'negative', 'neutral'
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Unique constraint to prevent duplicate tags from same user
    table.unique(['player_id', 'tagger_id', 'tag_name']);

    // Indexes for performance
    table.index(['player_id']);
    table.index(['tagger_id']);
    table.index(['tag_name']);
    table.index(['tag_type']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('player_tags');
};