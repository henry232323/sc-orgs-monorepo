/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('notification', function (table) {
    table
      .uuid('id')
      .primary()
      ;
    table.uuid('notification_object_id').notNullable();
    table.uuid('notifier_id').notNullable();
    table.boolean('is_read').defaultTo(false).notNullable();
    table.timestamp('read_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable();

    // Foreign key constraints
    table
      .foreign('notification_object_id')
      .references('id')
      .inTable('notification_object')
      .onDelete('CASCADE');
    table
      .foreign('notifier_id')
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');

    // Indexes for performance
    table.index(['notification_object_id']);
    table.index(['notifier_id']);
    table.index(['is_read']);
    table.index(['created_at']);
    table.index(['notifier_id', 'is_read']);
    table.index(['notifier_id', 'created_at']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTable('notification');
};
