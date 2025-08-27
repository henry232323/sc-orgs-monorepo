/**
 * Convert JSON tag columns to PostgreSQL arrays for better performance and native array operations
 */

exports.up = function (knex) {
  return knex.transaction(async (trx) => {
    // First, convert organizations table
    console.log('Converting organizations playstyle_tags and focus_tags to arrays...');
    
    // Add new array columns
    await trx.schema.alterTable('organizations', (table) => {
      table.specificType('playstyle_tags_array', 'text[]');
      table.specificType('focus_tags_array', 'text[]');
    });
    
    // Migrate data from JSON to arrays - handle the existing data
    await trx.raw(`
      UPDATE organizations 
      SET 
        playstyle_tags_array = CASE 
          WHEN playstyle_tags IS NULL THEN ARRAY[]::text[]
          WHEN playstyle_tags::text = '[]' THEN ARRAY[]::text[]
          WHEN playstyle_tags::text = '' THEN ARRAY[]::text[]
          ELSE ARRAY(SELECT json_array_elements_text(playstyle_tags))
        END,
        focus_tags_array = CASE 
          WHEN focus_tags IS NULL THEN ARRAY[]::text[]
          WHEN focus_tags::text = '[]' THEN ARRAY[]::text[]
          WHEN focus_tags::text = '' THEN ARRAY[]::text[]
          ELSE ARRAY(SELECT json_array_elements_text(focus_tags))
        END
    `);
    
    // Drop old JSON columns and rename array columns
    await trx.schema.alterTable('organizations', (table) => {
      table.dropColumn('playstyle_tags');
      table.dropColumn('focus_tags');
    });
    
    await trx.schema.alterTable('organizations', (table) => {
      table.renameColumn('playstyle_tags_array', 'playstyle_tags');
      table.renameColumn('focus_tags_array', 'focus_tags');
    });
    
    // Now convert events table
    console.log('Converting events playstyle_tags and activity_tags to arrays...');
    
    // Add new array columns
    await trx.schema.alterTable('events', (table) => {
      table.specificType('playstyle_tags_array', 'text[]');
      table.specificType('activity_tags_array', 'text[]');
    });
    
    // Migrate data from JSON to arrays
    await trx.raw(`
      UPDATE events 
      SET 
        playstyle_tags_array = CASE 
          WHEN playstyle_tags IS NULL THEN ARRAY[]::text[]
          WHEN playstyle_tags::text = '[]' THEN ARRAY[]::text[]
          WHEN playstyle_tags::text = '' THEN ARRAY[]::text[]
          ELSE ARRAY(SELECT json_array_elements_text(playstyle_tags))
        END,
        activity_tags_array = CASE 
          WHEN activity_tags IS NULL THEN ARRAY[]::text[]
          WHEN activity_tags::text = '[]' THEN ARRAY[]::text[]
          WHEN activity_tags::text = '' THEN ARRAY[]::text[]
          ELSE ARRAY(SELECT json_array_elements_text(activity_tags))
        END
    `);
    
    // Drop old JSON columns and rename array columns
    await trx.schema.alterTable('events', (table) => {
      table.dropColumn('playstyle_tags');
      table.dropColumn('activity_tags');
    });
    
    await trx.schema.alterTable('events', (table) => {
      table.renameColumn('playstyle_tags_array', 'playstyle_tags');
      table.renameColumn('activity_tags_array', 'activity_tags');
    });
    
    console.log('Tag conversion to arrays completed successfully!');
  });
};

exports.down = function (knex) {
  return knex.transaction(async (trx) => {
    // Revert organizations
    await trx.schema.alterTable('organizations', (table) => {
      table.json('playstyle_tags_json');
      table.json('focus_tags_json');
    });
    
    await trx.raw(`
      UPDATE organizations 
      SET 
        playstyle_tags_json = CASE 
          WHEN playstyle_tags = '{}' OR array_length(playstyle_tags, 1) IS NULL THEN '[]'::json
          ELSE array_to_json(playstyle_tags)
        END,
        focus_tags_json = CASE 
          WHEN focus_tags = '{}' OR array_length(focus_tags, 1) IS NULL THEN '[]'::json
          ELSE array_to_json(focus_tags)
        END
    `);
    
    await trx.schema.alterTable('organizations', (table) => {
      table.dropColumn('playstyle_tags');
      table.dropColumn('focus_tags');
    });
    
    await trx.schema.alterTable('organizations', (table) => {
      table.renameColumn('playstyle_tags_json', 'playstyle_tags');
      table.renameColumn('focus_tags_json', 'focus_tags');
    });
    
    // Revert events
    await trx.schema.alterTable('events', (table) => {
      table.json('playstyle_tags_json');
      table.json('activity_tags_json');
    });
    
    await trx.raw(`
      UPDATE events 
      SET 
        playstyle_tags_json = CASE 
          WHEN playstyle_tags = '{}' OR array_length(playstyle_tags, 1) IS NULL THEN '[]'::json
          ELSE array_to_json(playstyle_tags)
        END,
        activity_tags_json = CASE 
          WHEN activity_tags = '{}' OR array_length(activity_tags, 1) IS NULL THEN '[]'::json
          ELSE array_to_json(activity_tags)
        END
    `);
    
    await trx.schema.alterTable('events', (table) => {
      table.dropColumn('playstyle_tags');
      table.dropColumn('activity_tags');
    });
    
    await trx.schema.alterTable('events', (table) => {
      table.renameColumn('playstyle_tags_json', 'playstyle_tags');
      table.renameColumn('activity_tags_json', 'activity_tags');
    });
  });
};