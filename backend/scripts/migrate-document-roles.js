#!/usr/bin/env node

/**
 * Document Role Migration Script
 * 
 * This script executes the document access role migration with proper validation
 * and reporting. It should be run after analyzing the current role usage.
 */

const knex = require('knex');
const config = require('../knexfile');
const fs = require('fs').promises;
const path = require('path');

// Initialize database connection
const db = knex(config[process.env.NODE_ENV || 'development']);

/**
 * Execute the document role migration
 */
async function migrateDocumentRoles(options = {}) {
  const { dryRun = false, force = false } = options;
  
  console.log('🚀 Starting document role migration...');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE MIGRATION'}`);
  console.log();

  try {
    // 1. Pre-migration validation
    console.log('🔍 Running pre-migration validation...');
    
    const validationResults = await validatePreMigration();
    if (!validationResults.isValid && !force) {
      console.error('❌ Pre-migration validation failed. Use --force to proceed anyway.');
      console.error('Issues found:');
      validationResults.issues.forEach(issue => console.error(`  - ${issue}`));
      return false;
    }

    if (validationResults.issues.length > 0) {
      console.log('⚠️  Pre-migration warnings:');
      validationResults.issues.forEach(issue => console.log(`  - ${issue}`));
      console.log();
    }

    // 2. Check if migration has already been run
    const migrationExists = await db.schema.hasTable('hr_document_role_migration_backup');
    if (migrationExists && !force) {
      console.error('❌ Migration has already been run. Use --force to run again.');
      return false;
    }

    // 3. Create migration report
    const preMigrationReport = await generatePreMigrationReport();
    
    if (dryRun) {
      console.log('📋 DRY RUN RESULTS');
      console.log('==================');
      console.log(`Documents to migrate: ${preMigrationReport.documentsToMigrate}`);
      console.log(`Organizations affected: ${preMigrationReport.organizationsAffected}`);
      console.log(`Roles to be created: ${preMigrationReport.rolesToCreate.length}`);
      
      if (preMigrationReport.rolesToCreate.length > 0) {
        console.log('New roles that will be created:');
        preMigrationReport.rolesToCreate.forEach(role => {
          console.log(`  - ${role.name} (in ${role.organizationName})`);
        });
      }

      console.log(`Potential issues: ${preMigrationReport.potentialIssues.length}`);
      if (preMigrationReport.potentialIssues.length > 0) {
        console.log('Potential issues:');
        preMigrationReport.potentialIssues.forEach(issue => {
          console.log(`  - ${issue}`);
        });
      }

      console.log('\n✅ Dry run completed. Use --live to execute the migration.');
      return true;
    }

    // 4. Execute the migration
    console.log('🔄 Executing migration...');
    
    // Run the migration
    await db.migrate.up({ name: '20251012023820_migrate_document_access_roles.js' });

    // 5. Post-migration validation
    console.log('🔍 Running post-migration validation...');
    const postValidationResults = await validatePostMigration();
    
    if (!postValidationResults.isValid) {
      console.error('❌ Post-migration validation failed!');
      console.error('Issues found:');
      postValidationResults.issues.forEach(issue => console.error(`  - ${issue}`));
      
      console.log('🔄 Consider rolling back the migration...');
      return false;
    }

    // 6. Generate migration report
    const migrationReport = await generateMigrationReport();
    
    // Save report
    const reportPath = path.join(__dirname, '../reports');
    await fs.mkdir(reportPath, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFile = path.join(reportPath, `document-role-migration-${timestamp}.json`);
    
    await fs.writeFile(reportFile, JSON.stringify(migrationReport, null, 2));

    // 7. Display results
    console.log('\n✅ MIGRATION COMPLETED SUCCESSFULLY');
    console.log('===================================');
    console.log(`Documents migrated: ${migrationReport.summary.documentsProcessed}`);
    console.log(`Successful migrations: ${migrationReport.summary.successfulMigrations}`);
    console.log(`Partial migrations: ${migrationReport.summary.partialMigrations}`);
    console.log(`Failed migrations: ${migrationReport.summary.failedMigrations}`);
    console.log(`Roles created: ${migrationReport.summary.rolesCreated}`);
    console.log();
    console.log(`📄 Full report saved to: ${reportFile}`);

    return true;

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await db.destroy();
  }
}

/**
 * Validate system state before migration
 */
async function validatePreMigration() {
  const issues = [];
  
  // Check if required tables exist
  const requiredTables = ['hr_documents', 'organization_roles', 'organizations'];
  for (const table of requiredTables) {
    const exists = await db.schema.hasTable(table);
    if (!exists) {
      issues.push(`Required table '${table}' does not exist`);
    }
  }

  // Check if there are documents to migrate
  const documentCount = await db('hr_documents').count('id as count').first();
  if (parseInt(documentCount.count) === 0) {
    issues.push('No documents found to migrate');
  }

  // Check if organizations have roles
  const orgsWithoutRoles = await db('organizations')
    .leftJoin('organization_roles', 'organizations.id', 'organization_roles.organization_id')
    .whereNull('organization_roles.id')
    .select('organizations.id', 'organizations.name');

  if (orgsWithoutRoles.length > 0) {
    issues.push(`${orgsWithoutRoles.length} organizations have no roles defined`);
  }

  return {
    isValid: issues.length === 0,
    issues
  };
}

/**
 * Validate system state after migration
 */
async function validatePostMigration() {
  const issues = [];

  // Check if backup table was created
  const backupExists = await db.schema.hasTable('hr_document_role_migration_backup');
  if (!backupExists) {
    issues.push('Migration backup table was not created');
  }

  // Check if all documents have backup records
  const documentsWithoutBackup = await db('hr_documents')
    .leftJoin('hr_document_role_migration_backup', 'hr_documents.id', 'hr_document_role_migration_backup.document_id')
    .whereNull('hr_document_role_migration_backup.document_id')
    .count('hr_documents.id as count')
    .first();

  if (parseInt(documentsWithoutBackup.count) > 0) {
    issues.push(`${documentsWithoutBackup.count} documents do not have backup records`);
  }

  // Check for documents with empty access roles
  const documentsWithEmptyRoles = await db('hr_documents')
    .where(function() {
      this.whereNull('access_roles')
        .orWhere('access_roles', '[]')
        .orWhere('access_roles', '');
    })
    .count('id as count')
    .first();

  if (parseInt(documentsWithEmptyRoles.count) > 0) {
    issues.push(`${documentsWithEmptyRoles.count} documents have empty access roles after migration`);
  }

  return {
    isValid: issues.length === 0,
    issues
  };
}

/**
 * Generate pre-migration report
 */
async function generatePreMigrationReport() {
  const documents = await db('hr_documents')
    .select('id', 'access_roles', 'organization_id')
    .whereNotNull('access_roles');

  const organizations = await db('organizations')
    .select('id', 'name');

  const orgMap = {};
  organizations.forEach(org => {
    orgMap[org.id] = org.name;
  });

  const rolesToCreate = [];
  const potentialIssues = [];
  const organizationsAffected = new Set();

  // Analyze what roles would be created
  const roleMappings = {
    'owner': 'Owner',
    'admin': 'Administrator',
    'administrator': 'Administrator',
    'member': 'Member',
    'user': 'Member',
    'employee': 'Member',
    'manager': 'Manager',
    'hr': 'HR',
    'lead': 'Lead'
  };

  for (const doc of documents) {
    organizationsAffected.add(doc.organization_id);
    const roles = Array.isArray(doc.access_roles) ? doc.access_roles : [];
    
    for (const role of roles) {
      const mappedRole = roleMappings[role.toLowerCase()] || role;
      
      // Check if role exists in organization
      const existingRole = await db('organization_roles')
        .where('organization_id', doc.organization_id)
        .where('name', mappedRole)
        .first();

      if (!existingRole) {
        const roleToCreate = {
          name: mappedRole,
          organizationId: doc.organization_id,
          organizationName: orgMap[doc.organization_id] || 'Unknown'
        };

        if (!rolesToCreate.some(r => r.name === mappedRole && r.organizationId === doc.organization_id)) {
          rolesToCreate.push(roleToCreate);
        }
      }
    }
  }

  return {
    documentsToMigrate: documents.length,
    organizationsAffected: organizationsAffected.size,
    rolesToCreate,
    potentialIssues
  };
}

/**
 * Generate post-migration report
 */
async function generateMigrationReport() {
  const backupRecords = await db('hr_document_role_migration_backup')
    .select('*');

  const summary = {
    documentsProcessed: backupRecords.length,
    successfulMigrations: backupRecords.filter(r => r.migration_status === 'success').length,
    partialMigrations: backupRecords.filter(r => r.migration_status === 'partial').length,
    failedMigrations: backupRecords.filter(r => r.migration_status === 'error').length,
    rolesCreated: 0 // This would need to be tracked during migration
  };

  const details = {
    successfulMigrations: backupRecords.filter(r => r.migration_status === 'success'),
    partialMigrations: backupRecords.filter(r => r.migration_status === 'partial'),
    failedMigrations: backupRecords.filter(r => r.migration_status === 'error')
  };

  return {
    timestamp: new Date().toISOString(),
    summary,
    details
  };
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    dryRun: args.includes('--dry-run') || args.includes('--dry'),
    force: args.includes('--force'),
    live: args.includes('--live')
  };

  if (!options.live && !options.dryRun) {
    console.log('Usage: node migrate-document-roles.js [--dry-run|--live] [--force]');
    console.log('');
    console.log('Options:');
    console.log('  --dry-run  Simulate the migration without making changes');
    console.log('  --live     Execute the actual migration');
    console.log('  --force    Force migration even if validation fails');
    process.exit(1);
  }

  migrateDocumentRoles(options)
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateDocumentRoles };