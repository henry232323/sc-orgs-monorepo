#!/usr/bin/env node

/**
 * Document Role Migration Rollback Script
 * 
 * This script provides rollback functionality for the document access role migration.
 * It can restore original access_roles values and clean up migration artifacts.
 */

const knex = require('knex');
const config = require('../knexfile');
const fs = require('fs').promises;
const path = require('path');

// Initialize database connection
const db = knex(config[process.env.NODE_ENV || 'development']);

/**
 * Rollback the document role migration
 */
async function rollbackDocumentRoles(options = {}) {
  const { dryRun = false, force = false, cleanupOnly = false } = options;
  
  console.log('🔄 Starting document role migration rollback...');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE ROLLBACK'}`);
  console.log();

  try {
    // 1. Check if migration backup exists
    const backupExists = await db.schema.hasTable('hr_document_role_migration_backup');
    if (!backupExists) {
      console.error('❌ No migration backup found. Cannot rollback.');
      return false;
    }

    // 2. Get migration status
    const migrationStatus = await getMigrationStatus();
    console.log('📊 Migration Status:');
    console.log(`  Total documents: ${migrationStatus.totalDocuments}`);
    console.log(`  Successful: ${migrationStatus.successful}`);
    console.log(`  Partial: ${migrationStatus.partial}`);
    console.log(`  Failed: ${migrationStatus.failed}`);
    console.log();

    if (migrationStatus.totalDocuments === 0) {
      console.log('ℹ️  No migration data found to rollback.');
      if (cleanupOnly) {
        return await cleanupMigrationArtifacts(dryRun);
      }
      return true;
    }

    // 3. Validate rollback preconditions
    const validationResults = await validateRollbackPreconditions();
    if (!validationResults.isValid && !force) {
      console.error('❌ Rollback validation failed. Use --force to proceed anyway.');
      console.error('Issues found:');
      validationResults.issues.forEach(issue => console.error(`  - ${issue}`));
      return false;
    }

    if (validationResults.issues.length > 0) {
      console.log('⚠️  Rollback warnings:');
      validationResults.issues.forEach(issue => console.log(`  - ${issue}`));
      console.log();
    }

    if (dryRun) {
      console.log('📋 DRY RUN RESULTS');
      console.log('==================');
      console.log(`Documents to restore: ${migrationStatus.totalDocuments}`);
      console.log('Changes that would be made:');
      
      // Show sample of changes
      const sampleBackups = await db('hr_document_role_migration_backup')
        .select('document_id', 'original_access_roles', 'migrated_access_roles', 'migration_status')
        .limit(5);

      for (const backup of sampleBackups) {
        console.log(`  Document ${backup.document_id}:`);
        console.log(`    Current: ${JSON.stringify(backup.migrated_access_roles)}`);
        console.log(`    Will restore to: ${JSON.stringify(backup.original_access_roles)}`);
      }

      if (migrationStatus.totalDocuments > 5) {
        console.log(`  ... and ${migrationStatus.totalDocuments - 5} more documents`);
      }

      console.log('\n✅ Dry run completed. Use --live to execute the rollback.');
      return true;
    }

    // 4. Execute rollback
    console.log('🔄 Executing rollback...');
    
    const rollbackResults = await executeRollback();
    
    // 5. Generate rollback report
    const rollbackReport = await generateRollbackReport(rollbackResults);
    
    // Save report
    const reportPath = path.join(__dirname, '../reports');
    await fs.mkdir(reportPath, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFile = path.join(reportPath, `document-role-rollback-${timestamp}.json`);
    
    await fs.writeFile(reportFile, JSON.stringify(rollbackReport, null, 2));

    // 6. Cleanup migration artifacts if requested
    if (options.cleanup !== false) {
      console.log('🧹 Cleaning up migration artifacts...');
      await cleanupMigrationArtifacts(false);
    }

    // 7. Display results
    console.log('\n✅ ROLLBACK COMPLETED SUCCESSFULLY');
    console.log('==================================');
    console.log(`Documents restored: ${rollbackResults.restored}`);
    console.log(`Rollback errors: ${rollbackResults.errors}`);
    console.log();
    console.log(`📄 Full report saved to: ${reportFile}`);

    return rollbackResults.errors === 0;

  } catch (error) {
    console.error('❌ Rollback failed:', error);
    throw error;
  } finally {
    await db.destroy();
  }
}

/**
 * Get current migration status
 */
async function getMigrationStatus() {
  const backupRecords = await db('hr_document_role_migration_backup')
    .select('migration_status')
    .groupBy('migration_status')
    .count('* as count');

  const status = {
    totalDocuments: 0,
    successful: 0,
    partial: 0,
    failed: 0
  };

  backupRecords.forEach(record => {
    const count = parseInt(record.count);
    status.totalDocuments += count;
    
    switch (record.migration_status) {
      case 'success':
        status.successful = count;
        break;
      case 'partial':
        status.partial = count;
        break;
      case 'error':
        status.failed = count;
        break;
    }
  });

  return status;
}

/**
 * Validate rollback preconditions
 */
async function validateRollbackPreconditions() {
  const issues = [];

  // Check if hr_documents table exists
  const documentsTableExists = await db.schema.hasTable('hr_documents');
  if (!documentsTableExists) {
    issues.push('hr_documents table does not exist');
  }

  // Check if backup records match existing documents
  const backupCount = await db('hr_document_role_migration_backup').count('* as count').first();
  const documentCount = await db('hr_documents').count('* as count').first();

  if (parseInt(backupCount.count) > parseInt(documentCount.count)) {
    issues.push('More backup records than existing documents - data integrity issue');
  }

  // Check for orphaned backup records
  const orphanedBackups = await db('hr_document_role_migration_backup')
    .leftJoin('hr_documents', 'hr_document_role_migration_backup.document_id', 'hr_documents.id')
    .whereNull('hr_documents.id')
    .count('* as count')
    .first();

  if (parseInt(orphanedBackups.count) > 0) {
    issues.push(`${orphanedBackups.count} backup records reference non-existent documents`);
  }

  return {
    isValid: issues.length === 0,
    issues
  };
}

/**
 * Execute the rollback process
 */
async function executeRollback() {
  const results = {
    restored: 0,
    errors: 0,
    errorDetails: []
  };

  // Get all backup records
  const backupRecords = await db('hr_document_role_migration_backup')
    .select('document_id', 'original_access_roles', 'migration_status');

  console.log(`📊 Restoring ${backupRecords.length} documents...`);

  // Process each backup record
  for (const backup of backupRecords) {
    try {
      // Restore original access roles
      await db('hr_documents')
        .where('id', backup.document_id)
        .update({
          access_roles: backup.original_access_roles,
          updated_at: db.fn.now()
        });

      results.restored++;

      if (results.restored % 100 === 0) {
        console.log(`  Restored ${results.restored}/${backupRecords.length} documents...`);
      }

    } catch (error) {
      results.errors++;
      results.errorDetails.push({
        document_id: backup.document_id,
        error: error.message
      });

      console.error(`❌ Error restoring document ${backup.document_id}:`, error.message);
    }
  }

  return results;
}

/**
 * Clean up migration artifacts
 */
async function cleanupMigrationArtifacts(dryRun = false) {
  console.log(`🧹 ${dryRun ? 'Would clean up' : 'Cleaning up'} migration artifacts...`);

  const artifactTables = [
    'hr_document_role_migration_backup',
    'hr_document_role_mapping'
  ];

  for (const table of artifactTables) {
    const exists = await db.schema.hasTable(table);
    if (exists) {
      if (dryRun) {
        const count = await db(table).count('* as count').first();
        console.log(`  Would drop table '${table}' (${count.count} records)`);
      } else {
        await db.schema.dropTable(table);
        console.log(`  ✅ Dropped table '${table}'`);
      }
    }
  }

  // Check for auto-created roles during migration
  const autoCreatedRoles = await db('organization_roles')
    .where('description', 'like', '%Auto-created role during document migration%')
    .select('id', 'name', 'organization_id');

  if (autoCreatedRoles.length > 0) {
    console.log(`  Found ${autoCreatedRoles.length} auto-created roles`);
    
    if (dryRun) {
      console.log('  Would remove auto-created roles:');
      autoCreatedRoles.forEach(role => {
        console.log(`    - ${role.name} (${role.id})`);
      });
    } else {
      // Note: We don't automatically delete these roles as they might be in use
      console.log('  ⚠️  Auto-created roles found but not removed (they may be in use)');
      console.log('  Manual review recommended for these roles:');
      autoCreatedRoles.forEach(role => {
        console.log(`    - ${role.name} (${role.id})`);
      });
    }
  }

  return true;
}

/**
 * Generate rollback report
 */
async function generateRollbackReport(rollbackResults) {
  const report = {
    timestamp: new Date().toISOString(),
    rollbackResults,
    preRollbackStatus: await getMigrationStatus(),
    postRollbackValidation: await validatePostRollback()
  };

  return report;
}

/**
 * Validate system state after rollback
 */
async function validatePostRollback() {
  const issues = [];

  // Check if any documents still have migrated roles format
  // This is a basic check - in practice, you'd want more sophisticated validation
  const documentsWithPossibleMigratedRoles = await db('hr_documents')
    .whereRaw("access_roles::text LIKE '%Administrator%' OR access_roles::text LIKE '%Owner%'")
    .count('* as count')
    .first();

  // Note: This is a rough heuristic - some documents might legitimately have these roles
  if (parseInt(documentsWithPossibleMigratedRoles.count) > 0) {
    issues.push(`${documentsWithPossibleMigratedRoles.count} documents may still have migrated role format`);
  }

  return {
    isValid: issues.length === 0,
    issues
  };
}

/**
 * Show migration status without performing rollback
 */
async function showMigrationStatus() {
  console.log('📊 Document Role Migration Status');
  console.log('=================================');

  const backupExists = await db.schema.hasTable('hr_document_role_migration_backup');
  if (!backupExists) {
    console.log('❌ No migration backup found. Migration has not been run or has been cleaned up.');
    return;
  }

  const status = await getMigrationStatus();
  console.log(`Total documents migrated: ${status.totalDocuments}`);
  console.log(`Successful migrations: ${status.successful}`);
  console.log(`Partial migrations: ${status.partial}`);
  console.log(`Failed migrations: ${status.failed}`);
  console.log();

  // Show sample of migration results
  const sampleResults = await db('hr_document_role_migration_backup')
    .select('document_id', 'original_access_roles', 'migrated_access_roles', 'migration_status', 'migration_notes')
    .limit(10);

  console.log('Sample migration results:');
  sampleResults.forEach(result => {
    console.log(`Document ${result.document_id} (${result.migration_status}):`);
    console.log(`  Original: ${JSON.stringify(result.original_access_roles)}`);
    console.log(`  Migrated: ${JSON.stringify(result.migrated_access_roles)}`);
    if (result.migration_notes) {
      console.log(`  Notes: ${result.migration_notes}`);
    }
    console.log();
  });
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    dryRun: args.includes('--dry-run') || args.includes('--dry'),
    force: args.includes('--force'),
    live: args.includes('--live'),
    status: args.includes('--status'),
    cleanupOnly: args.includes('--cleanup-only'),
    cleanup: !args.includes('--no-cleanup')
  };

  if (options.status) {
    showMigrationStatus()
      .then(() => process.exit(0))
      .catch(error => {
        console.error('Failed to show status:', error);
        process.exit(1);
      });
    return;
  }

  if (!options.live && !options.dryRun && !options.cleanupOnly) {
    console.log('Usage: node rollback-document-roles.js [options]');
    console.log('');
    console.log('Options:');
    console.log('  --dry-run      Simulate the rollback without making changes');
    console.log('  --live         Execute the actual rollback');
    console.log('  --force        Force rollback even if validation fails');
    console.log('  --status       Show current migration status');
    console.log('  --cleanup-only Only clean up migration artifacts');
    console.log('  --no-cleanup   Skip cleanup of migration artifacts after rollback');
    process.exit(1);
  }

  rollbackDocumentRoles(options)
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = { rollbackDocumentRoles, showMigrationStatus };