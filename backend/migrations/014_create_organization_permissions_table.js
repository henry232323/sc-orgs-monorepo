exports.up = function (knex) {
  return knex.schema.createTable('organization_permissions', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('role_id')
      .references('id')
      .inTable('organization_roles')
      .onDelete('CASCADE');
    table.string('permission').notNullable(); // e.g., "manage_organization", "create_events", "manage_roles", "manage_members"
    table.boolean('granted').defaultTo(true); // true = permission granted, false = permission denied
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Unique constraint: role_id + permission
    table.unique(['role_id', 'permission']);

    // Indexes for performance
    table.index(['role_id']);
    table.index(['permission']);
    table.index(['granted']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('organization_permissions');
};
