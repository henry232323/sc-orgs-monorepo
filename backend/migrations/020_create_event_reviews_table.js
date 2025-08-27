/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('event_reviews', function (table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('event_id').notNullable();
    table.uuid('user_id').notNullable();
    table.integer('rating').notNullable().checkBetween([1, 5]);
    table.text('review_text');
    table.boolean('is_anonymous').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Foreign key constraints
    table.foreign('event_id').references('id').inTable('events').onDelete('CASCADE');
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');

    // Unique constraint - one review per user per event
    table.unique(['event_id', 'user_id']);

    // Indexes for performance
    table.index('event_id');
    table.index('user_id');
    table.index('rating');
    table.index('created_at');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTable('event_reviews');
};
