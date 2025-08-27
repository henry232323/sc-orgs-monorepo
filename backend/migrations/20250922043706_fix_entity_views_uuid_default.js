/**
 * Fix entity_views table to have proper UUID default generation
 */

exports.up = function (knex) {
  return knex.raw(`
    ALTER TABLE entity_views 
    ALTER COLUMN id SET DEFAULT gen_random_uuid()
  `);
};

exports.down = function (knex) {
  return knex.raw(`
    ALTER TABLE entity_views 
    ALTER COLUMN id DROP DEFAULT
  `);
};