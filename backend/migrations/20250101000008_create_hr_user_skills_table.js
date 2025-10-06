/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('hr_user_skills', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('user_id')
      .references('id')
      .inTable('users')
      .onDelete('CASCADE')
      .notNullable();
    table
      .uuid('skill_id')
      .references('id')
      .inTable('hr_skills')
      .onDelete('CASCADE')
      .notNullable();
    table.enum('proficiency_level', ['beginner', 'intermediate', 'advanced', 'expert'])
      .notNullable();
    table.boolean('verified').defaultTo(false);
    table
      .uuid('verified_by')
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');
    table.timestamp('verified_at');
    table.text('notes');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes for performance
    table.index(['user_id']);
    table.index(['skill_id']);
    table.index(['proficiency_level']);
    table.index(['verified']);
    table.index(['verified_by']);
    table.index(['verified_at']);
    
    // Unique constraint to prevent duplicate skills per user
    table.unique(['user_id', 'skill_id']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('hr_user_skills');
};