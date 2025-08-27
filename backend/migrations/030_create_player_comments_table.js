/**
 * Create player_comments table for community comments about players
 * This table stores public and private comments with attestation support
 */

exports.up = function (knex) {
  return knex.schema.createTable('player_comments', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('player_id').references('id').inTable('sc_players').onDelete('CASCADE');
    table.uuid('commenter_id').references('id').inTable('users').onDelete('CASCADE');
    table.text('content').notNullable();
    table.boolean('is_public').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes for performance
    table.index(['player_id']);
    table.index(['commenter_id']);
    table.index(['is_public']);
    table.index(['created_at']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('player_comments');
};