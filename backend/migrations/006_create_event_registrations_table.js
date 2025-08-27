exports.up = function (knex) {
  return knex.schema.createTable('event_registrations', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('event_id')
      .references('id')
      .inTable('events')
      .onDelete('CASCADE');
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.string('status').defaultTo('registered'); // registered, confirmed, attended, cancelled
    table.text('notes');
    table.timestamp('registered_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Unique constraint to prevent duplicate registrations
    table.unique(['event_id', 'user_id']);

    // Indexes for performance
    table.index(['event_id']);
    table.index(['user_id']);
    table.index(['status']);
    table.index(['registered_at']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('event_registrations');
};
