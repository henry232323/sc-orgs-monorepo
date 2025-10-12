# Document Role Migration Scripts

This directory contains scripts for migrating HR document access roles from hardcoded values to organization-specific roles.

## Overview

The HR document system originally used hardcoded access roles (like `['owner', 'admin', 'member']`) that didn't correspond to actual organization roles in the database. This migration maps these hardcoded roles to proper organization roles and creates missing roles as needed.

## Scripts

### 1. analyze-document-roles.js

**Purpose**: Analyzes existing document access_roles data to understand the current state and prepare for migration.

**Usage**:
```bash
node scripts/analyze-document-roles.js
```

**What it does**:
- Queries all documents to identify unique access_roles values
- Generates a report of role usage across organizations
- Identifies documents with unmappable roles
- Creates recommendations for the migration process
- Saves a detailed analysis report to `reports/document-role-analysis-{timestamp}.json`

**Output**:
- Console summary of findings
- Detailed JSON report with role usage statistics
- Migration recommendations

### 2. migrate-document-roles.js

**Purpose**: Executes the document access role migration with validation and reporting.

**Usage**:
```bash
# Dry run (recommended first)
node scripts/migrate-document-roles.js --dry-run

# Execute the migration
node scripts/migrate-document-roles.js --live

# Force migration even if validation fails
node scripts/migrate-document-roles.js --live --force
```

**What it does**:
- Validates system state before migration
- Creates backup tables for rollback capability
- Maps common roles to organization equivalents
- Creates missing roles in organizations as needed
- Updates document access_roles with valid organization role names
- Provides detailed reporting of migration results

**Options**:
- `--dry-run`: Simulate migration without making changes
- `--live`: Execute the actual migration
- `--force`: Proceed even if validation fails

### 3. rollback-document-roles.js

**Purpose**: Provides rollback functionality to restore original access_roles values.

**Usage**:
```bash
# Check migration status
node scripts/rollback-document-roles.js --status

# Dry run rollback
node scripts/rollback-document-roles.js --dry-run

# Execute rollback
node scripts/rollback-document-roles.js --live

# Clean up migration artifacts only
node scripts/rollback-document-roles.js --cleanup-only
```

**What it does**:
- Restores original access_roles from backup table
- Validates rollback preconditions
- Provides detailed rollback reporting
- Optionally cleans up migration artifacts

**Options**:
- `--status`: Show current migration status
- `--dry-run`: Simulate rollback without making changes
- `--live`: Execute the actual rollback
- `--force`: Force rollback even if validation fails
- `--cleanup-only`: Only clean up migration artifacts
- `--no-cleanup`: Skip cleanup after rollback

## Migration Process

### Step 1: Analysis
Run the analysis script to understand the current state:
```bash
node scripts/analyze-document-roles.js
```

Review the generated report to understand:
- How many documents will be affected
- What roles are currently in use
- Which organizations need attention
- What roles will be created

### Step 2: Dry Run Migration
Test the migration without making changes:
```bash
node scripts/migrate-document-roles.js --dry-run
```

This will show you exactly what changes would be made.

### Step 3: Execute Migration
If the dry run looks good, execute the migration:
```bash
node scripts/migrate-document-roles.js --live
```

### Step 4: Validate Results
Check the migration results:
```bash
node scripts/rollback-document-roles.js --status
```

### Step 5: Rollback (if needed)
If something goes wrong, you can rollback:
```bash
node scripts/rollback-document-roles.js --live
```

## Role Mapping Logic

The migration uses the following common role mappings:

| Original Role | Mapped To | Notes |
|---------------|-----------|-------|
| `owner` | `Owner` | Standard owner role |
| `admin` | `Administrator` | Admin to Administrator |
| `administrator` | `Administrator` | Direct mapping |
| `member` | `Member` | Standard member role |
| `user` | `Member` | User to Member mapping |
| `employee` | `Member` | Employee to Member mapping |
| `manager` | `Manager` | Standard manager role |
| `hr` | `HR` | HR role mapping |
| `lead` | `Lead` | Lead role mapping |
| `supervisor` | `Manager` | Supervisor to Manager mapping |
| `staff` | `Member` | Staff to Member mapping |

### Missing Role Creation

If a mapped role doesn't exist in an organization, the migration will create it with:
- Appropriate rank based on role hierarchy
- `is_system_role: false`
- `is_editable: true`
- `is_active: true`
- Description indicating it was auto-created during migration

## Database Changes

### Tables Created

1. **hr_document_role_migration_backup**
   - Stores original access_roles for rollback
   - Tracks migration status for each document
   - Includes migration notes and timestamps

2. **hr_document_role_mapping**
   - Defines role mapping rules
   - Can be customized before migration
   - Supports custom mapping logic

### Migration Status Tracking

Each document's migration is tracked with one of these statuses:
- `success`: All roles successfully mapped
- `partial`: Some roles couldn't be mapped but document was updated
- `error`: Migration failed for this document

## Error Handling

The scripts include comprehensive error handling:

- **Pre-migration validation**: Checks system state before starting
- **Per-document error handling**: Continues migration even if individual documents fail
- **Post-migration validation**: Verifies migration completed correctly
- **Rollback validation**: Ensures rollback is safe to perform

## Reports

All scripts generate detailed reports saved to the `reports/` directory:

- `document-role-analysis-{timestamp}.json`: Analysis results
- `document-role-migration-{timestamp}.json`: Migration results
- `document-role-rollback-{timestamp}.json`: Rollback results

## Troubleshooting

### Common Issues

1. **Organizations without roles**
   - The migration will create missing roles automatically
   - Review the analysis report to see which organizations need attention

2. **Unmappable roles**
   - Custom roles that don't match common mappings
   - These are preserved but flagged for manual review

3. **Permission errors**
   - Ensure the database user has CREATE, ALTER, and DROP permissions
   - Required for creating backup tables and migration artifacts

4. **Large datasets**
   - The migration processes documents in batches
   - Monitor progress through console output

### Recovery

If the migration fails partway through:
1. Check the migration status: `node scripts/rollback-document-roles.js --status`
2. Review error logs in the console output
3. Fix any underlying issues
4. Either continue with `--force` or rollback and retry

## Security Considerations

- **Backup verification**: Always verify backups before migration
- **Permission validation**: Ensure migrated roles maintain proper access control
- **Audit trail**: All changes are logged and can be traced
- **Rollback capability**: Complete rollback is always available

## Performance

- **Batch processing**: Documents are processed individually to handle errors gracefully
- **Index usage**: Migration uses existing indexes for optimal performance
- **Memory efficiency**: Large datasets are processed in streams where possible

## Testing

Before running in production:
1. Test on a copy of production data
2. Run analysis to understand impact
3. Execute dry run to validate logic
4. Test rollback functionality
5. Verify role permissions after migration

## Support

For issues or questions:
1. Check the generated reports for detailed information
2. Review console output for error messages
3. Use `--status` commands to check current state
4. Rollback if necessary and investigate issues