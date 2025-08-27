exports.up = function (knex) {
  return knex.schema.createTable('events', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('organization_id')
      .references('id')
      .inTable('organizations')
      .onDelete('CASCADE');
    table.string('title').notNullable();
    table.text('description');
    table.timestamp('start_time').notNullable();
    table.timestamp('end_time').notNullable();
    table.integer('duration_minutes');
    table.string('location');
    table.string('language').defaultTo('en');
    table.json('playstyle_tags');
    table.json('activity_tags');
    table.integer('max_participants');
    table.boolean('is_public').defaultTo(true);
    table.boolean('is_active').defaultTo(true);
    table.timestamp('registration_deadline');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes for performance
    table.index(['organization_id']);
    table.index(['start_time']);
    table.index(['end_time']);
    table.index(['is_public']);
    table.index(['is_active']);
    table.index(['language']);
    table.index(['registration_deadline']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('events');
};
