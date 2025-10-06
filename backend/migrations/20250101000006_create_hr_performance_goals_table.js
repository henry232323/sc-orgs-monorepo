/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('hr_performance_goals', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('review_id')
      .references('id')
      .inTable('hr_performance_reviews')
      .onDelete('CASCADE')
      .notNullable();
    table
      .uuid('user_id')
      .references('id')
      .inTable('users')
      .onDelete('CASCADE')
      .notNullable();
    table.string('title').notNullable();
    table.text('description');
    table.date('target_date');
    table.enum('status', ['not_started', 'in_progress', 'completed', 'cancelled'])
      .defaultTo('not_started')
      .notNullable();
    table.decimal('progress_percentage', 5, 2).defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes for performance
    table.index(['review_id']);
    table.index(['user_id']);
    table.index(['status']);
    table.index(['target_date']);
    table.index(['progress_percentage']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('hr_performance_goals');
};