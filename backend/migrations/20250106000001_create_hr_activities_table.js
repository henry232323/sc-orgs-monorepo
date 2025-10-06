/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('hr_activities', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('organization_id')
      .references('id')
      .inTable('organizations')
      .onDelete('CASCADE')
      .notNullable();
    table.enum('activity_type', [
      'application_submitted',
      'application_status_changed', 
      'onboarding_completed',
      'performance_review_submitted',
      'skill_verified',
      'document_acknowledged'
    ]).notNullable();
    table
      .uuid('user_id')
      .references('id')
      .inTable('users')
      .onDelete('CASCADE')
      .notNullable();
    table.string('user_handle').notNullable();
    table.string('user_avatar_url');
    table.string('title').notNullable();
    table.text('description').notNullable();
    table.jsonb('metadata').defaultTo('{}');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes for performance
    table.index(['organization_id']);
    table.index(['user_id']);
    table.index(['activity_type']);
    table.index(['created_at']);
    table.index(['organization_id', 'created_at']);
    table.index(['organization_id', 'activity_type']);
    table.index(['user_id', 'created_at']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('hr_activities');
};