/**
 * Rename language field to languages for better clarity (plural form for array)
 */

exports.up = function (knex) {
  return knex.transaction(async (trx) => {
    console.log('Renaming language field to languages in organizations and events tables...');
    
    // Rename in organizations table
    await trx.schema.alterTable('organizations', (table) => {
      table.renameColumn('language', 'languages');
    });
    
    // Rename in events table
    await trx.schema.alterTable('events', (table) => {
      table.renameColumn('language', 'languages');
    });
    
    console.log('Language field renamed to languages successfully!');
  });
};

exports.down = function (knex) {
  return knex.transaction(async (trx) => {
    console.log('Reverting languages field back to language...');
    
    // Revert in organizations table
    await trx.schema.alterTable('organizations', (table) => {
      table.renameColumn('languages', 'language');
    });
    
    // Revert in events table
    await trx.schema.alterTable('events', (table) => {
      table.renameColumn('languages', 'language');
    });
    
    console.log('Languages field reverted to language successfully!');
  });
};