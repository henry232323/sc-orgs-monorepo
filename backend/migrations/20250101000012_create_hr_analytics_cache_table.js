/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('hr_analytics_cache', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.timestamp('period_start').notNullable();
    table.timestamp('period_end').notNullable();
    table.jsonb('metrics_data').notNullable();
    table.timestamp('cached_at').notNullable();
    table.timestamps(true, true);

    // Foreign key constraint
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');

    // Unique constraint for organization and period
    table.unique(['organization_id', 'period_start', 'period_end']);

    // Index for performance
    table.index(['organization_id', 'cached_at']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('hr_analytics_cache');
};