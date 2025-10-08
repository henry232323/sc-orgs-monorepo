/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('hr_document_versions', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('document_id')
      .references('id')
      .inTable('hr_documents')
      .onDelete('CASCADE')
      .notNullable();
    table.integer('version_number').notNullable();
    table.text('content').notNullable(); // Store the content at this version
    table.string('title').notNullable(); // Store the title at this version
    table.text('description'); // Store the description at this version
    table.integer('word_count').defaultTo(0);
    table.integer('estimated_reading_time').defaultTo(0);
    table.string('folder_path').defaultTo('/');
    table.boolean('requires_acknowledgment').defaultTo(false);
    table.jsonb('access_roles').defaultTo('[]');
    table.text('change_summary'); // Summary of what changed in this version
    table.jsonb('change_metadata').defaultTo('{}'); // Additional metadata about changes
    table
      .uuid('created_by')
      .references('id')
      .inTable('users')
      .onDelete('SET NULL')
      .notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Indexes for performance
    table.index(['document_id']);
    table.index(['document_id', 'version_number']);
    table.index(['created_by']);
    table.index(['created_at']);
    
    // Unique constraint to prevent duplicate versions
    table.unique(['document_id', 'version_number']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('hr_document_versions');
};