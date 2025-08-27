/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('notification_change', function (table) {
    table
      .uuid('id')
      .primary()
      ;
    table.uuid('notification_object_id').notNullable();
    table.uuid('actor_id').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable();

    // Foreign key constraints
    table
      .foreign('notification_object_id')
      .references('id')
      .inTable('notification_object')
      .onDelete('CASCADE');
    table
      .foreign('actor_id')
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');

    // Indexes for performance
    table.index(['notification_object_id']);
    table.index(['actor_id']);
    table.index(['created_at']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTable('notification_change');
};
