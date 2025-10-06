/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('hr_document_acknowledgments', function(table) {
    // Index for finding acknowledgments by document
    table.index(['document_id'], 'idx_hr_document_acknowledgments_document_id');
    
    // Index for finding acknowledgments by user
    table.index(['user_id'], 'idx_hr_document_acknowledgments_user_id');
    
    // Composite index for finding specific user-document acknowledgments
    table.index(['document_id', 'user_id'], 'idx_hr_document_acknowledgments_document_user');
    
    // Index for finding acknowledgments by date (for analytics)
    table.index(['acknowledged_at'], 'idx_hr_document_acknowledgments_acknowledged_at');
    
    // Composite index for organization-based queries
    table.index(['document_id', 'acknowledged_at'], 'idx_hr_document_acknowledgments_document_date');
  }).then(() => {
    return knex.schema.alterTable('hr_documents', function(table) {
      // Index for finding documents requiring acknowledgment
      table.index(['organization_id', 'requires_acknowledgment'], 'idx_hr_documents_org_requires_ack');
      
      // Index for folder-based queries
      table.index(['organization_id', 'folder_path'], 'idx_hr_documents_org_folder');
      
      // Index for file type queries
      table.index(['organization_id', 'file_type'], 'idx_hr_documents_org_file_type');
      
      // Composite index for acknowledgment status queries
      table.index(['organization_id', 'requires_acknowledgment', 'created_at'], 'idx_hr_documents_org_ack_created');
    });
  }).then(() => {
    return knex.schema.alterTable('organization_members', function(table) {
      // Index for active member queries (if not already exists)
      table.index(['organization_id', 'is_active'], 'idx_organization_members_org_active');
    });
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('hr_document_acknowledgments', function(table) {
    table.dropIndex(['document_id'], 'idx_hr_document_acknowledgments_document_id');
    table.dropIndex(['user_id'], 'idx_hr_document_acknowledgments_user_id');
    table.dropIndex(['document_id', 'user_id'], 'idx_hr_document_acknowledgments_document_user');
    table.dropIndex(['acknowledged_at'], 'idx_hr_document_acknowledgments_acknowledged_at');
    table.dropIndex(['document_id', 'acknowledged_at'], 'idx_hr_document_acknowledgments_document_date');
  }).then(() => {
    return knex.schema.alterTable('hr_documents', function(table) {
      table.dropIndex(['organization_id', 'requires_acknowledgment'], 'idx_hr_documents_org_requires_ack');
      table.dropIndex(['organization_id', 'folder_path'], 'idx_hr_documents_org_folder');
      table.dropIndex(['organization_id', 'file_type'], 'idx_hr_documents_org_file_type');
      table.dropIndex(['organization_id', 'requires_acknowledgment', 'created_at'], 'idx_hr_documents_org_ack_created');
    });
  }).then(() => {
    return knex.schema.alterTable('organization_members', function(table) {
      table.dropIndex(['organization_id', 'is_active'], 'idx_organization_members_org_active');
    });
  });
};