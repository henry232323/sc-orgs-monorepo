/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('discord_events', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('event_id')
      .references('id')
      .inTable('events')
      .onDelete('CASCADE');
    table.string('discord_guild_id').notNullable();
    table.string('discord_event_id').unique();
    table.string('discord_channel_id');
    table.string('sync_status').defaultTo('pending').notNullable();
    table.timestamp('last_sync_at');
    table.text('sync_error');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes for performance
    table.index(['event_id']);
    table.index(['discord_guild_id']);
    table.index(['discord_event_id']);
    table.index(['sync_status']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('discord_events');
};
