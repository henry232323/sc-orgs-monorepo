/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('hr_document_acknowledgments', table => {
    // Add version tracking to acknowledgments
    table.integer('acknowledged_version').nullable(); // Version that was acknowledged
    table.boolean('requires_reacknowledgment').defaultTo(false); // Flag for when re-acknowledgment is needed
    table.text('acknowledgment_notes'); // Optional notes about the acknowledgment
    table.timestamp('invalidated_at').nullable(); // When acknowledgment was invalidated due to document changes
    table.uuid('invalidated_by').references('id').inTable('users').onDelete('SET NULL').nullable(); // Who invalidated the acknowledgment
    
    // Add index for version queries
    table.index(['acknowledged_version']);
    table.index(['requires_reacknowledgment']);
    table.index(['invalidated_at']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('hr_document_acknowledgments', table => {
    table.dropColumn('acknowledged_version');
    table.dropColumn('requires_reacknowledgment');
    table.dropColumn('acknowledgment_notes');
    table.dropColumn('invalidated_at');
    table.dropColumn('invalidated_by');
  });
};