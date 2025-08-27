/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('entity_views', function (table) {
    table
      .uuid('id')
      .primary()
      ;
    
    table.string('entity_type', 50).notNullable(); // 'organization' | 'event'
    table.uuid('entity_id').notNullable();
    table.uuid('user_id').nullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('ip_address', 45).nullable(); // For anonymous tracking
    table.text('user_agent').nullable();
    table.date('view_date').notNullable(); // YYYY-MM-DD for daily uniqueness
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();

    // Ensure one view per user per day per entity
    table.unique(['entity_type', 'entity_id', 'user_id', 'view_date'], 'unique_daily_view');
    
    // Indexes for performance
    table.index(['entity_type', 'entity_id', 'view_date'], 'idx_entity_views_lookup');
    table.index(['user_id', 'view_date'], 'idx_user_views_by_date');
    table.index(['created_at'], 'idx_views_created_at');
    table.index(['entity_type', 'entity_id'], 'idx_entity_views');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTable('entity_views');
};