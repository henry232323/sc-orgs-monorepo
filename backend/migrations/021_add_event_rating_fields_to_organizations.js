/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.alterTable('organizations', function (table) {
    table.decimal('average_event_rating', 3, 2).defaultTo(0.00);
    table.integer('total_event_reviews').defaultTo(0);
    
    // Index for performance
    table.index('average_event_rating');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.alterTable('organizations', function (table) {
    table.dropColumn('average_event_rating');
    table.dropColumn('total_event_reviews');
  });
};
