/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('hr_skills', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name').notNullable().unique();
    table.enum('category', ['pilot', 'engineer', 'medic', 'security', 'logistics', 'leadership'])
      .notNullable();
    table.text('description');
    table.boolean('verification_required').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes for performance
    table.index(['category']);
    table.index(['verification_required']);
    table.index(['name']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('hr_skills');
};