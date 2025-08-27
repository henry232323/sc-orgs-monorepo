/**
 * Fix all notification tables to have proper UUID default generation
 * This ensures the notification system works properly with PostgreSQL
 */

exports.up = function (knex) {
  return knex.raw(`
    -- Fix notification_object table
    ALTER TABLE notification_object 
    ALTER COLUMN id SET DEFAULT gen_random_uuid();
    
    -- Fix notification_change table  
    ALTER TABLE notification_change 
    ALTER COLUMN id SET DEFAULT gen_random_uuid();
    
    -- Fix notification table
    ALTER TABLE notification 
    ALTER COLUMN id SET DEFAULT gen_random_uuid();
    
    -- Note: entity_views and entity_view_analytics are fixed in separate migrations
  `);
};

exports.down = function (knex) {
  return knex.raw(`
    -- Revert notification_object table
    ALTER TABLE notification_object 
    ALTER COLUMN id DROP DEFAULT;
    
    -- Revert notification_change table
    ALTER TABLE notification_change 
    ALTER COLUMN id DROP DEFAULT;
    
    -- Revert notification table
    ALTER TABLE notification 
    ALTER COLUMN id DROP DEFAULT;
  `);
};