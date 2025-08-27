exports.up = function (knex) {
  return knex.schema.createTable('comments', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('organization_id')
      .references('id')
      .inTable('organizations')
      .onDelete('CASCADE');
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table
      .uuid('parent_comment_id')
      .references('id')
      .inTable('comments')
      .onDelete('CASCADE');
    table.text('content').notNullable();
    table.integer('upvotes').defaultTo(0);
    table.integer('downvotes').defaultTo(0);
    table.boolean('is_edited').defaultTo(false);
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes for performance
    table.index(['organization_id']);
    table.index(['user_id']);
    table.index(['parent_comment_id']);
    table.index(['is_active']);
    table.index(['created_at']);
    table.index(['upvotes']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('comments');
};
