/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('scheduled_tasks', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('event_id').notNullable();
    table.enum('reminder_type', ['24h', '2h', '1h', 'starting']).notNullable();
    table.datetime('scheduled_time').notNullable();
    table.enum('status', ['pending', 'completed', 'failed', 'cancelled']).defaultTo('pending');
    table.datetime('created_at').defaultTo(knex.fn.now());
    table.datetime('updated_at').defaultTo(knex.fn.now());
    
    // Foreign key constraints
    table.foreign('event_id').references('id').inTable('events').onDelete('CASCADE');
    
    // Unique constraint to prevent duplicate reminders (one task per event per reminder type)
    table.unique(['event_id', 'reminder_type']);
    
    // Indexes for performance
    table.index('event_id', 'idx_scheduled_tasks_event');
    table.index('scheduled_time', 'idx_scheduled_tasks_scheduled_time');
    table.index('status', 'idx_scheduled_tasks_status');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('scheduled_tasks');
};
