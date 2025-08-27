exports.up = function (knex) {
  return knex.schema.createTable('organization_members', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('organization_id')
      .references('id')
      .inTable('organizations')
      .onDelete('CASCADE');
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.string('role').defaultTo('member'); // owner, admin, member, project_manager
    table.json('permissions');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('joined_at').defaultTo(knex.fn.now());
    table.timestamp('last_activity_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Unique constraint to prevent duplicate memberships
    table.unique(['organization_id', 'user_id']);

    // Indexes for performance
    table.index(['organization_id']);
    table.index(['user_id']);
    table.index(['role']);
    table.index(['is_active']);
    table.index(['joined_at']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('organization_members');
};
