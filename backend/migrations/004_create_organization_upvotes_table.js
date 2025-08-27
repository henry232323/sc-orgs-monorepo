exports.up = function (knex) {
  return knex.schema.createTable('organization_upvotes', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('organization_id')
      .references('id')
      .inTable('organizations')
      .onDelete('CASCADE');
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Unique constraint to prevent multiple upvotes from same user per org
    table.unique(['organization_id', 'user_id']);

    // Indexes for performance
    table.index(['organization_id']);
    table.index(['user_id']);
    table.index(['created_at']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('organization_upvotes');
};
