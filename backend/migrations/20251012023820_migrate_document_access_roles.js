/**
 * Document Access Role Migration
 * 
 * This migration maps existing document access_roles to valid organization roles.
 * It creates a backup table, performs role mapping, and provides rollback capability.
 */

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  console.log('🚀 Starting document access role migration...');

  // 1. Create backup table for original access_roles
  await knex.schema.createTable('hr_document_role_migration_backup', table => {
    table.uuid('document_id').primary();
    table.jsonb('original_access_roles');
    table.jsonb('migrated_access_roles');
    table.string('migration_status').defaultTo('pending');
    table.text('migration_notes');
    table.timestamp('migrated_at').defaultTo(knex.fn.now());
    
    table.foreign('document_id').references('id').inTable('hr_documents').onDelete('CASCADE');
    table.index(['migration_status']);
  });

  // 2. Create role mapping configuration table
  await knex.schema.createTable('hr_document_role_mapping', table => {
    table.increments('id').primary();
    table.string('old_role_name').notNullable();
    table.string('new_role_name').notNullable();
    table.text('mapping_notes');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.index(['old_role_name']);
    table.index(['new_role_name']);
  });

  // 3. Insert common role mappings
  const commonRoleMappings = [
    { old_role_name: 'owner', new_role_name: 'Owner', mapping_notes: 'Standard owner role mapping' },
    { old_role_name: 'admin', new_role_name: 'Administrator', mapping_notes: 'Admin to Administrator mapping' },
    { old_role_name: 'administrator', new_role_name: 'Administrator', mapping_notes: 'Direct administrator mapping' },
    { old_role_name: 'member', new_role_name: 'Member', mapping_notes: 'Standard member role mapping' },
    { old_role_name: 'user', new_role_name: 'Member', mapping_notes: 'User to Member mapping' },
    { old_role_name: 'employee', new_role_name: 'Member', mapping_notes: 'Employee to Member mapping' },
    { old_role_name: 'manager', new_role_name: 'Manager', mapping_notes: 'Standard manager role mapping' },
    { old_role_name: 'hr', new_role_name: 'HR', mapping_notes: 'HR role mapping' },
    { old_role_name: 'lead', new_role_name: 'Lead', mapping_notes: 'Lead role mapping' },
    { old_role_name: 'supervisor', new_role_name: 'Manager', mapping_notes: 'Supervisor to Manager mapping' },
    { old_role_name: 'staff', new_role_name: 'Member', mapping_notes: 'Staff to Member mapping' }
  ];

  await knex('hr_document_role_mapping').insert(commonRoleMappings);

  // 4. Get all documents with their access roles
  const documents = await knex('hr_documents')
    .select('id', 'access_roles', 'organization_id')
    .whereNotNull('access_roles');

  console.log(`📊 Processing ${documents.length} documents...`);

  // 5. Get role mappings
  const roleMappings = await knex('hr_document_role_mapping')
    .select('old_role_name', 'new_role_name')
    .where('is_active', true);

  const mappingDict = {};
  roleMappings.forEach(mapping => {
    mappingDict[mapping.old_role_name.toLowerCase()] = mapping.new_role_name;
  });

  // 6. Process each document
  let successCount = 0;
  let errorCount = 0;

  for (const doc of documents) {
    try {
      const originalRoles = Array.isArray(doc.access_roles) ? doc.access_roles : [];
      const migratedRoles = [];
      const unmappedRoles = [];

      // Get organization roles for validation
      const orgRoles = await knex('organization_roles')
        .select('name')
        .where('organization_id', doc.organization_id)
        .where('is_active', true);

      const validOrgRoles = orgRoles.map(r => r.name);

      // Process each role
      for (const role of originalRoles) {
        const lowerRole = role.toLowerCase();
        
        // Check if role already exists in organization (case-insensitive)
        const existingRole = validOrgRoles.find(orgRole => orgRole.toLowerCase() === lowerRole);
        if (existingRole) {
          migratedRoles.push(existingRole);
        }
        // Check if we have a mapping for this role
        else if (mappingDict[lowerRole]) {
          const mappedRole = mappingDict[lowerRole];
          // Verify the mapped role exists in the organization
          if (validOrgRoles.includes(mappedRole)) {
            migratedRoles.push(mappedRole);
          } else {
            // Create the missing role in the organization
            await createMissingRole(knex, doc.organization_id, mappedRole);
            migratedRoles.push(mappedRole);
          }
        }
        // Role cannot be mapped - keep original but flag it
        else {
          unmappedRoles.push(role);
          migratedRoles.push(role);
        }
      }

      // Remove duplicates
      const uniqueMigratedRoles = [...new Set(migratedRoles)];

      // Create backup record
      await knex('hr_document_role_migration_backup').insert({
        document_id: doc.id,
        original_access_roles: originalRoles,
        migrated_access_roles: uniqueMigratedRoles,
        migration_status: unmappedRoles.length > 0 ? 'partial' : 'success',
        migration_notes: unmappedRoles.length > 0 
          ? `Unmapped roles: ${unmappedRoles.join(', ')}` 
          : 'All roles successfully mapped'
      });

      // Update document with migrated roles
      await knex('hr_documents')
        .where('id', doc.id)
        .update({
          access_roles: JSON.stringify(uniqueMigratedRoles),
          updated_at: knex.fn.now()
        });

      successCount++;

      if (unmappedRoles.length > 0) {
        console.log(`⚠️  Document ${doc.id}: Unmapped roles - ${unmappedRoles.join(', ')}`);
      }

    } catch (error) {
      errorCount++;

      // Create error backup record
      try {
        await knex('hr_document_role_migration_backup').insert({
          document_id: doc.id,
          original_access_roles: doc.access_roles,
          migrated_access_roles: doc.access_roles,
          migration_status: 'error',
          migration_notes: `Migration failed: ${error.message}`
        });
      } catch (backupError) {
        console.error(`❌ Failed to create backup for document ${doc.id}:`, backupError.message);
      }

      console.error(`❌ Error processing document ${doc.id}:`, error.message);
    }
  }

  console.log(`✅ Migration completed: ${successCount} successful, ${errorCount} errors`);
};

/**
 * Create missing role in organization
 */
async function createMissingRole(knex, organizationId, roleName) {
  // Check if role already exists (case-insensitive)
  const existingRole = await knex('organization_roles')
    .where('organization_id', organizationId)
    .whereRaw('LOWER(name) = LOWER(?)', [roleName])
    .first();

  if (existingRole) {
    return existingRole;
  }

  // Determine role rank based on common role hierarchy
  const roleRanks = {
    'Owner': 1000,
    'Administrator': 900,
    'Manager': 700,
    'Lead': 600,
    'HR': 500,
    'Member': 100
  };

  const rank = roleRanks[roleName] || 200; // Default rank for custom roles

  try {
    // Create the role
    const [newRole] = await knex('organization_roles')
      .insert({
        organization_id: organizationId,
        name: roleName,
        description: `Auto-created during document role migration`,
        rank: rank,
        is_system_role: false,
        is_editable: true,
        is_active: true
      })
      .returning('*');

    console.log(`➕ Created missing role "${roleName}" for organization ${organizationId}`);
    return newRole;
  } catch (error) {
    // Handle unique constraint violations gracefully
    if (error.code === '23505') { // PostgreSQL unique violation
      console.log(`ℹ️  Role "${roleName}" already exists for organization ${organizationId}`);
      return await knex('organization_roles')
        .where('organization_id', organizationId)
        .where('name', roleName)
        .first();
    }
    throw error;
  }
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  console.log('🔄 Rolling back document access role migration...');

  // Get all backup records
  const backups = await knex('hr_document_role_migration_backup')
    .select('document_id', 'original_access_roles');

  console.log(`📊 Restoring ${backups.length} documents...`);

  // Restore original access roles
  for (const backup of backups) {
    await knex('hr_documents')
      .where('id', backup.document_id)
      .update({
        access_roles: backup.original_access_roles,
        updated_at: knex.fn.now()
      });
  }

  // Drop migration tables
  await knex.schema.dropTableIfExists('hr_document_role_migration_backup');
  await knex.schema.dropTableIfExists('hr_document_role_mapping');

  console.log('✅ Rollback completed');
};