/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('notification_object', function (table) {
    table
      .uuid('id')
      .primary()
      ;
    table.integer('entity_type').unsigned().notNullable();
    table.uuid('entity_id').notNullable();
    table.timestamp('created_on').defaultTo(knex.fn.now()).notNullable();
    table.tinyint('status').defaultTo(1).notNullable(); // 1 = active, 0 = inactive
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable();

    // Indexes for performance
    table.index(['entity_type', 'entity_id']);
    table.index(['created_on']);
    table.index(['status']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTable('notification_object');
};
