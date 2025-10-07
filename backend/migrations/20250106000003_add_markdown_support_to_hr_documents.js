/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('hr_documents', table => {
    // Add new columns for markdown support
    table.text('content'); // Store markdown content
    table.integer('word_count'); // Store word count for performance
    table.integer('estimated_reading_time'); // Store estimated reading time in minutes
    
    // Make file-related columns nullable for backward compatibility
    table.string('file_path').nullable().alter();
    table.string('file_type').nullable().alter();
    table.bigInteger('file_size').nullable().alter();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('hr_documents', table => {
    // Remove markdown support columns
    table.dropColumn('content');
    table.dropColumn('word_count');
    table.dropColumn('estimated_reading_time');
    
    // Restore file-related columns to not nullable
    table.string('file_path').notNullable().alter();
    table.string('file_type').notNullable().alter();
    table.bigInteger('file_size').notNullable().alter();
  });
};