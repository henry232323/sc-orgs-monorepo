exports.up = function (knex) {
  return knex.schema.createTable('organization_roles', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('organization_id')
      .references('id')
      .inTable('organizations')
      .onDelete('CASCADE');
    table.string('name').notNullable(); // e.g., "Owner", "Admin", "Member", "Custom Role"
    table.text('description');
    table.integer('rank').notNullable().defaultTo(0); // Higher rank = more permissions
    table.boolean('is_system_role').defaultTo(false); // System roles (Owner, Admin, Member) cannot be deleted
    table.boolean('is_editable').defaultTo(true); // Owner role is not editable
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Unique constraint: organization_id + name
    table.unique(['organization_id', 'name']);

    // Indexes for performance
    table.index(['organization_id']);
    table.index(['rank']);
    table.index(['is_system_role']);
    table.index(['is_active']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('organization_roles');
};
