/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('hr_onboarding_progress', table => {
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
    table
      .uuid('template_id')
      .references('id')
      .inTable('hr_onboarding_templates')
      .onDelete('CASCADE')
      .notNullable();
    table.enum('status', ['not_started', 'in_progress', 'completed', 'overdue'])
      .defaultTo('not_started')
      .notNullable();
    table.jsonb('completed_tasks').defaultTo('[]');
    table.decimal('completion_percentage', 5, 2).defaultTo(0);
    table.timestamp('started_at');
    table.timestamp('completed_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes for performance
    table.index(['organization_id']);
    table.index(['user_id']);
    table.index(['template_id']);
    table.index(['status']);
    table.index(['started_at']);
    table.index(['completed_at']);
    
    // Unique constraint to prevent duplicate onboarding for same user/org
    table.unique(['organization_id', 'user_id']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('hr_onboarding_progress');
};