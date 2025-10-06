/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('hr_applications', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('organization_id')
      .references('id')
      .inTable('organizations')
      .onDelete('CASCADE')
      .notNullable();
    table
      .uuid('user_id')
      .references('id')
      .inTable('users')
      .onDelete('CASCADE')
      .notNullable();
    table.enum('status', ['pending', 'under_review', 'interview_scheduled', 'approved', 'rejected'])
      .defaultTo('pending')
      .notNullable();
    table.jsonb('application_data').defaultTo('{}');
    table
      .uuid('reviewer_id')
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');
    table.text('review_notes');
    table.text('rejection_reason');
    table.string('invite_code').unique();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes for performance
    table.index(['organization_id']);
    table.index(['user_id']);
    table.index(['status']);
    table.index(['reviewer_id']);
    table.index(['created_at']);
    table.index(['invite_code']);
    
    // Unique constraint to prevent duplicate applications
    table.unique(['organization_id', 'user_id']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('hr_applications');
};