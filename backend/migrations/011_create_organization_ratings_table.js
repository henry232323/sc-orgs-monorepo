exports.up = function (knex) {
  return knex.schema.createTable('organization_ratings', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('organization_id')
      .references('id')
      .inTable('organizations')
      .onDelete('CASCADE')
      .notNullable();
    table
      .uuid('user_id')
      .references('id')
      .inTable('users')
      .onDelete('CASCADE')
      .notNullable();
    table.integer('rating').notNullable().checkBetween([1, 5]);
    table.text('review').nullable();
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Ensure one rating per user per organization
    table.unique(['organization_id', 'user_id']);

    // Indexes for performance
    table.index(['organization_id']);
    table.index(['user_id']);
    table.index(['rating']);
    table.index(['created_at']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('organization_ratings');
};
