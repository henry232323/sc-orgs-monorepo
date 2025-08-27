/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('discord_servers', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('organization_id')
      .references('id')
      .inTable('organizations')
      .onDelete('CASCADE');
    table.string('discord_guild_id').unique().notNullable();
    table.string('guild_name').notNullable();
    table.text('guild_icon_url');
    table.bigInteger('bot_permissions').notNullable();
    table.boolean('is_active').defaultTo(true);
    table.boolean('auto_create_events').defaultTo(true);
    table.string('event_channel_id');
    table.string('announcement_channel_id');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes for performance
    table.index(['organization_id']);
    table.index(['discord_guild_id']);
    table.index(['is_active']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('discord_servers');
};
