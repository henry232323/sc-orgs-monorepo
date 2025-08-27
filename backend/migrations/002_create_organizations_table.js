exports.up = function (knex) {
  return knex.schema.createTable('organizations', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('rsi_org_id').unique().notNullable();
    table.string('name').notNullable();
    table.text('description');
    table.string('banner_url');
    table.string('icon_url');
    table.string('headline');
    table.boolean('is_verified').defaultTo(false);
    table.boolean('is_registered').defaultTo(false);
    table.string('verification_sentinel').unique();
    table
      .uuid('owner_id')
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table.string('language').defaultTo('en');
    table.json('playstyle_tags');
    table.json('focus_tags');
    table.integer('total_upvotes').defaultTo(0);
    table.integer('total_members').defaultTo(0);
    table.boolean('is_active').defaultTo(true);
    table.timestamp('last_activity_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes for performance
    table.index(['rsi_org_id']);
    table.index(['owner_id']);
    table.index(['is_verified']);
    table.index(['is_registered']);
    table.index(['is_active']);
    table.index(['language']);
    table.index(['total_upvotes']);
    table.index(['last_activity_at']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('organizations');
};
