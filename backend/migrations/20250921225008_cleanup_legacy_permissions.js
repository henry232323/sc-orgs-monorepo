/**
 * Migration to clean up legacy permissions system
 * - Remove unused permissions field from invite_codes
 * - Remove legacy permissions field from organization_members  
 * - Add role_id to invite_codes for proper role-based invites
 */

exports.up = function (knex) {
  return knex.schema
    // First, add role_id to invite_codes
    .alterTable('invite_codes', table => {
      table
        .uuid('role_id')
        .references('id')
        .inTable('organization_roles')
        .onDelete('SET NULL');
    })
    // Then remove the unused permissions columns
    .then(() => knex.schema.alterTable('invite_codes', table => {
      table.dropColumn('permissions');
    }))
    .then(() => knex.schema.alterTable('organization_members', table => {
      table.dropColumn('permissions');
    }));
};

exports.down = function (knex) {
  return knex.schema
    // Restore the permissions columns
    .alterTable('invite_codes', table => {
      table.json('permissions');
    })
    .then(() => knex.schema.alterTable('organization_members', table => {
      table.json('permissions');
    }))
    // Remove role_id from invite_codes
    .then(() => knex.schema.alterTable('invite_codes', table => {
      table.dropColumn('role_id');
    }));
};