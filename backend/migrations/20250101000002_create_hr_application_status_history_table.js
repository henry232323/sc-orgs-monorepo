/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('hr_application_status_history', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('application_id')
      .references('id')
      .inTable('hr_applications')
      .onDelete('CASCADE')
      .notNullable();
    table.string('status').notNullable();
    table
      .uuid('changed_by')
      .references('id')
      .inTable('users')
      .onDelete('SET NULL')
      .notNullable();
    table.text('notes');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Indexes for performance
    table.index(['application_id']);
    table.index(['changed_by']);
    table.index(['created_at']);
    table.index(['status']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('hr_application_status_history');
};