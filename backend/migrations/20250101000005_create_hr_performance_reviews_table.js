/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('hr_performance_reviews', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('organization_id')
      .references('id')
      .inTable('organizations')
      .onDelete('CASCADE')
      .notNullable();
    table
      .uuid('reviewee_id')
      .references('id')
      .inTable('users')
      .onDelete('CASCADE')
      .notNullable();
    table
      .uuid('reviewer_id')
      .references('id')
      .inTable('users')
      .onDelete('CASCADE')
      .notNullable();
    table.date('review_period_start').notNullable();
    table.date('review_period_end').notNullable();
    table.enum('status', ['draft', 'submitted', 'acknowledged'])
      .defaultTo('draft')
      .notNullable();
    table.jsonb('ratings').defaultTo('{}');
    table.decimal('overall_rating', 3, 2);
    table.text('strengths');
    table.text('areas_for_improvement');
    table.jsonb('goals').defaultTo('[]');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes for performance
    table.index(['organization_id']);
    table.index(['reviewee_id']);
    table.index(['reviewer_id']);
    table.index(['status']);
    table.index(['review_period_start']);
    table.index(['review_period_end']);
    table.index(['overall_rating']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('hr_performance_reviews');
};