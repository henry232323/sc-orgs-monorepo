/**
 * Convert language columns to PostgreSQL arrays for consistency with other tag fields
 */

exports.up = function (knex) {
  return knex.transaction(async (trx) => {
    console.log('Converting organizations and events language fields to arrays...');
    
    // First, convert organizations table language field
    console.log('Converting organizations language to array...');
    
    // Add new array column
    await trx.schema.alterTable('organizations', (table) => {
      table.specificType('language_array', 'text[]');
    });
    
    // Migrate data from JSON/string to arrays - handle both JSON strings and plain strings
    await trx.raw(`
      UPDATE organizations 
      SET language_array = CASE 
        -- Handle NULL values
        WHEN language IS NULL THEN ARRAY['English']::text[]
        -- Handle empty strings
        WHEN language = '' THEN ARRAY['English']::text[]
        -- Handle JSON array strings like '["English", "Spanish"]'
        WHEN language LIKE '[%]' THEN 
          ARRAY(SELECT json_array_elements_text(language::json))
        -- Handle JSON object strings like '{"English"}' (malformed JSON arrays)
        WHEN language LIKE '{%}' THEN 
          ARRAY[TRIM(BOTH '"' FROM REPLACE(REPLACE(language, '{', ''), '}', ''))]
        -- Handle plain strings like 'English'
        ELSE ARRAY[language]
      END
    `);
    
    // Drop old column and rename array column
    await trx.schema.alterTable('organizations', (table) => {
      table.dropColumn('language');
    });
    
    await trx.schema.alterTable('organizations', (table) => {
      table.renameColumn('language_array', 'language');
    });
    
    // Now convert events table language field
    console.log('Converting events language to array...');
    
    // Add new array column
    await trx.schema.alterTable('events', (table) => {
      table.specificType('language_array', 'text[]');
    });
    
    // Migrate data from string to arrays - events seem to have plain strings
    await trx.raw(`
      UPDATE events 
      SET language_array = CASE 
        -- Handle NULL values
        WHEN language IS NULL THEN ARRAY['English']::text[]
        -- Handle empty strings
        WHEN language = '' THEN ARRAY['English']::text[]
        -- Handle JSON array strings like '["English", "Spanish"]'
        WHEN language LIKE '[%]' THEN 
          ARRAY(SELECT json_array_elements_text(language::json))
        -- Handle JSON object strings like '{"English"}' (malformed JSON arrays)
        WHEN language LIKE '{%}' THEN 
          ARRAY[TRIM(BOTH '"' FROM REPLACE(REPLACE(language, '{', ''), '}', ''))]
        -- Handle plain strings like 'English' (most common case for events)
        ELSE ARRAY[language]
      END
    `);
    
    // Drop old column and rename array column
    await trx.schema.alterTable('events', (table) => {
      table.dropColumn('language');
    });
    
    await trx.schema.alterTable('events', (table) => {
      table.renameColumn('language_array', 'language');
    });
    
    console.log('Language fields conversion to arrays completed successfully!');
  });
};

exports.down = function (knex) {
  return knex.transaction(async (trx) => {
    console.log('Reverting language arrays back to strings...');
    
    // Revert organizations
    await trx.schema.alterTable('organizations', (table) => {
      table.string('language_string', 255).defaultTo('en');
    });
    
    await trx.raw(`
      UPDATE organizations 
      SET language_string = CASE 
        WHEN language = '{}' OR array_length(language, 1) IS NULL THEN 'English'
        WHEN array_length(language, 1) = 1 THEN language[1]
        ELSE array_to_string(language, ', ')
      END
    `);
    
    await trx.schema.alterTable('organizations', (table) => {
      table.dropColumn('language');
    });
    
    await trx.schema.alterTable('organizations', (table) => {
      table.renameColumn('language_string', 'language');
    });
    
    // Revert events
    await trx.schema.alterTable('events', (table) => {
      table.string('language_string', 255).defaultTo('en');
    });
    
    await trx.raw(`
      UPDATE events 
      SET language_string = CASE 
        WHEN language = '{}' OR array_length(language, 1) IS NULL THEN 'English'
        WHEN array_length(language, 1) = 1 THEN language[1]
        ELSE array_to_string(language, ', ')
      END
    `);
    
    await trx.schema.alterTable('events', (table) => {
      table.dropColumn('language');
    });
    
    await trx.schema.alterTable('events', (table) => {
      table.renameColumn('language_string', 'language');
    });
    
    console.log('Language fields reverted to strings successfully!');
  });
};