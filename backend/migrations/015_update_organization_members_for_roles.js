exports.up = function (knex) {
  return knex.schema.alterTable('organization_members', table => {
    // Add role_id column
    table
      .uuid('role_id')
      .references('id')
      .inTable('organization_roles')
      .onDelete('SET NULL');

    // Keep the old role column for backward compatibility during migration
    // We'll remove it in a later migration after data migration
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('organization_members', table => {
    table.dropColumn('role_id');
  });
};
