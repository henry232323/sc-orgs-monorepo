/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('hr_certifications', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('user_id')
      .references('id')
      .inTable('users')
      .onDelete('CASCADE')
      .notNullable();
    table
      .uuid('organization_id')
      .references('id')
      .inTable('organizations')
      .onDelete('CASCADE')
      .notNullable();
    table.string('name').notNullable();
    table.text('description');
    table.date('issued_date').notNullable();
    table.date('expiration_date');
    table
      .uuid('issued_by')
      .references('id')
      .inTable('users')
      .onDelete('SET NULL')
      .notNullable();
    table.text('certificate_url');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes for performance
    table.index(['user_id']);
    table.index(['organization_id']);
    table.index(['issued_by']);
    table.index(['issued_date']);
    table.index(['expiration_date']);
    table.index(['name']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('hr_certifications');
};