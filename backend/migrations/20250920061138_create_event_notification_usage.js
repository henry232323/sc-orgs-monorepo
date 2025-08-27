/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('event_notification_usage', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('event_id').notNullable();
    table.uuid('user_id').notNullable();
    table.integer('notifications_sent').defaultTo(0);
    table.datetime('created_at').defaultTo(knex.fn.now());
    table.datetime('updated_at').defaultTo(knex.fn.now());
    
    // Foreign key constraints
    table.foreign('event_id').references('id').inTable('events').onDelete('CASCADE');
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    
    // Unique constraint to prevent duplicate records
    table.unique(['event_id', 'user_id']);
    
    // Index for performance
    table.index(['event_id', 'user_id'], 'idx_event_notification_usage_event_user');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('event_notification_usage');
};
