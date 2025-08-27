/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('entity_view_analytics', function (table) {
    table
      .uuid('id')
      .primary()
      ;
    
    table.string('entity_type', 50).notNullable(); // 'organization' | 'event'
    table.uuid('entity_id').notNullable();
    table.date('view_date').notNullable(); // YYYY-MM-DD
    table.integer('unique_views').defaultTo(0).notNullable();
    table.integer('total_views').defaultTo(0).notNullable(); // For future: multiple views per user
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable();

    // One record per entity per day
    table.unique(['entity_type', 'entity_id', 'view_date'], 'unique_daily_analytics');
    
    // Indexes for performance
    table.index(['entity_type', 'entity_id', 'view_date'], 'idx_analytics_lookup');
    table.index(['view_date'], 'idx_analytics_by_date');
    table.index(['entity_type', 'entity_id'], 'idx_entity_analytics');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTable('entity_view_analytics');
};