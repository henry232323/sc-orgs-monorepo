exports.up = function (knex) {
  return knex.schema.alterTable('organization_members', table => {
    table.boolean('is_hidden').defaultTo(false);
    
    // Add index for performance when filtering hidden organizations
    table.index(['user_id', 'is_hidden']);
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('organization_members', table => {
    table.dropIndex(['user_id', 'is_hidden']);
    table.dropColumn('is_hidden');
  });
};