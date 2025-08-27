exports.up = function (knex) {
  return knex.schema.createTable('invite_codes', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('organization_id')
      .references('id')
      .inTable('organizations')
      .onDelete('CASCADE');
    table
      .uuid('created_by')
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table.string('code').unique().notNullable();
    table.string('role').defaultTo('member');
    table.json('permissions');
    table.integer('max_uses');
    table.integer('used_count').defaultTo(0);
    table.timestamp('expires_at');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes for performance
    table.index(['organization_id']);
    table.index(['created_by']);
    table.index(['code']);
    table.index(['is_active']);
    table.index(['expires_at']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('invite_codes');
};
