/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('hr_documents', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('organization_id')
      .references('id')
      .inTable('organizations')
      .onDelete('CASCADE')
      .notNullable();
    table.string('title').notNullable();
    table.text('description');
    table.string('file_path').notNullable();
    table.string('file_type').notNullable();
    table.bigInteger('file_size').notNullable();
    table.string('folder_path').defaultTo('/');
    table.integer('version').defaultTo(1);
    table.boolean('requires_acknowledgment').defaultTo(false);
    table.jsonb('access_roles').defaultTo('[]');
    table
      .uuid('uploaded_by')
      .references('id')
      .inTable('users')
      .onDelete('SET NULL')
      .notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes for performance
    table.index(['organization_id']);
    table.index(['uploaded_by']);
    table.index(['folder_path']);
    table.index(['file_type']);
    table.index(['requires_acknowledgment']);
    table.index(['title']);
    table.index(['created_at']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('hr_documents');
};