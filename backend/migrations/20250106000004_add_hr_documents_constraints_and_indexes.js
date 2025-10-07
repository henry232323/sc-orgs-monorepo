/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('hr_documents', table => {
    // Add check constraint to ensure either file or content is present
    table.check(
      `(
        (file_path IS NOT NULL AND file_type IS NOT NULL AND file_size IS NOT NULL AND content IS NULL) OR
        (file_path IS NULL AND file_type IS NULL AND file_size IS NULL AND content IS NOT NULL)
      )`,
      [],
      'check_document_content'
    );
  }).then(() => {
    // Add indexes for content search and document type differentiation
    return knex.raw(`
      -- Add GIN index for full-text search on content column
      CREATE INDEX IF NOT EXISTS idx_hr_documents_content_search 
      ON hr_documents USING gin(to_tsvector('english', content))
      WHERE content IS NOT NULL;
      
      -- Add index for document type differentiation
      CREATE INDEX IF NOT EXISTS idx_hr_documents_type 
      ON hr_documents ((CASE WHEN content IS NOT NULL THEN 'markdown' ELSE 'file' END));
      
      -- Add index for word count (useful for filtering and sorting)
      CREATE INDEX IF NOT EXISTS idx_hr_documents_word_count 
      ON hr_documents (word_count)
      WHERE word_count IS NOT NULL;
      
      -- Add index for estimated reading time
      CREATE INDEX IF NOT EXISTS idx_hr_documents_reading_time 
      ON hr_documents (estimated_reading_time)
      WHERE estimated_reading_time IS NOT NULL;
    `);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.raw(`
    -- Drop indexes
    DROP INDEX IF EXISTS idx_hr_documents_content_search;
    DROP INDEX IF EXISTS idx_hr_documents_type;
    DROP INDEX IF EXISTS idx_hr_documents_word_count;
    DROP INDEX IF EXISTS idx_hr_documents_reading_time;
  `).then(() => {
    // Drop check constraint
    return knex.schema.alterTable('hr_documents', table => {
      table.dropChecks('check_document_content');
    });
  });
};