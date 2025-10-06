/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('hr_document_acknowledgments', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('document_id')
      .references('id')
      .inTable('hr_documents')
      .onDelete('CASCADE')
      .notNullable();
    table
      .uuid('user_id')
      .references('id')
      .inTable('users')
      .onDelete('CASCADE')
      .notNullable();
    table.timestamp('acknowledged_at').defaultTo(knex.fn.now());
    table.string('ip_address');

    // Indexes for performance
    table.index(['document_id']);
    table.index(['user_id']);
    table.index(['acknowledged_at']);
    
    // Unique constraint to prevent duplicate acknowledgments
    table.unique(['document_id', 'user_id']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('hr_document_acknowledgments');
};