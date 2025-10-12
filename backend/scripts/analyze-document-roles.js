#!/usr/bin/env node

/**
 * Document Role Migration Analysis Script
 * 
 * This script analyzes existing document access_roles data to:
 * 1. Identify unique access_roles values across all documents
 * 2. Generate a report of role usage across organizations
 * 3. Identify documents with unmappable roles
 * 4. Prepare data for role migration
 */

const knex = require('knex');
const config = require('../knexfile');
const fs = require('fs').promises;
const path = require('path');

// Initialize database connection
const db = knex(config[process.env.NODE_ENV || 'development']);

/**
 * Analyze document access roles across all organizations
 */
async function analyzeDocumentRoles() {
  console.log('🔍 Starting document role analysis...\n');

  try {
    // 1. Get all documents with their access_roles and organization info
    const documentsWithRoles = await db('hr_documents')
      .select(
        'hr_documents.id as document_id',
        'hr_documents.title',
        'hr_documents.access_roles',
        'hr_documents.organization_id',
        'organizations.name as organization_name'
      )
      .leftJoin('organizations', 'hr_documents.organization_id', 'organizations.id')
      .orderBy('organizations.name', 'hr_documents.title');

    console.log(`📊 Found ${documentsWithRoles.length} documents to analyze\n`);

    // 2. Extract and analyze unique access roles
    const roleUsageMap = new Map();
    const organizationRoleUsage = new Map();
    const documentsWithIssues = [];

    for (const doc of documentsWithRoles) {
      const accessRoles = Array.isArray(doc.access_roles) ? doc.access_roles : [];
      
      // Track overall role usage
      for (const role of accessRoles) {
        if (!roleUsageMap.has(role)) {
          roleUsageMap.set(role, {
            count: 0,
            organizations: new Set(),
            documents: []
          });
        }
        
        const roleData = roleUsageMap.get(role);
        roleData.count++;
        roleData.organizations.add(doc.organization_name || 'Unknown');
        roleData.documents.push({
          id: doc.document_id,
          title: doc.title,
          organization: doc.organization_name || 'Unknown'
        });
      }

      // Track organization-specific role usage
      const orgKey = doc.organization_id || 'unknown';
      if (!organizationRoleUsage.has(orgKey)) {
        organizationRoleUsage.set(orgKey, {
          name: doc.organization_name || 'Unknown',
          roles: new Map(),
          documentCount: 0
        });
      }

      const orgData = organizationRoleUsage.get(orgKey);
      orgData.documentCount++;

      for (const role of accessRoles) {
        if (!orgData.roles.has(role)) {
          orgData.roles.set(role, 0);
        }
        orgData.roles.set(role, orgData.roles.get(role) + 1);
      }

      // Check for potential issues
      if (accessRoles.length === 0) {
        documentsWithIssues.push({
          id: doc.document_id,
          title: doc.title,
          organization: doc.organization_name || 'Unknown',
          issue: 'No access roles defined'
        });
      }
    }

    // 3. Get existing organization roles for comparison
    const organizationRoles = await db('organization_roles')
      .select(
        'organization_roles.name as role_name',
        'organization_roles.organization_id',
        'organization_roles.is_system_role',
        'organization_roles.is_active',
        'organizations.name as organization_name'
      )
      .leftJoin('organizations', 'organization_roles.organization_id', 'organizations.id')
      .where('organization_roles.is_active', true)
      .orderBy('organizations.name', 'organization_roles.name');

    // 4. Build organization roles map
    const orgRolesMap = new Map();
    for (const role of organizationRoles) {
      const orgKey = role.organization_id;
      if (!orgRolesMap.has(orgKey)) {
        orgRolesMap.set(orgKey, {
          name: role.organization_name || 'Unknown',
          roles: []
        });
      }
      orgRolesMap.get(orgKey).roles.push({
        name: role.role_name,
        isSystem: role.is_system_role,
        isActive: role.is_active
      });
    }

    // 5. Generate analysis report
    const report = {
      summary: {
        totalDocuments: documentsWithRoles.length,
        totalOrganizations: organizationRoleUsage.size,
        uniqueAccessRoles: roleUsageMap.size,
        documentsWithIssues: documentsWithIssues.length
      },
      roleUsage: Array.from(roleUsageMap.entries()).map(([role, data]) => ({
        role,
        usageCount: data.count,
        organizationCount: data.organizations.size,
        organizations: Array.from(data.organizations),
        sampleDocuments: data.documents.slice(0, 5) // First 5 documents as examples
      })).sort((a, b) => b.usageCount - a.usageCount),
      organizationAnalysis: Array.from(organizationRoleUsage.entries()).map(([orgId, data]) => {
        const availableRoles = orgRolesMap.get(orgId)?.roles || [];
        const usedRoles = Array.from(data.roles.keys());
        const unmappableRoles = usedRoles.filter(role => 
          !availableRoles.some(availableRole => 
            availableRole.name.toLowerCase() === role.toLowerCase()
          )
        );

        return {
          organizationId: orgId,
          organizationName: data.name,
          documentCount: data.documentCount,
          usedRoles: Array.from(data.roles.entries()).map(([role, count]) => ({
            role,
            count
          })),
          availableRoles: availableRoles.map(r => r.name),
          unmappableRoles,
          needsAttention: unmappableRoles.length > 0
        };
      }).sort((a, b) => a.organizationName.localeCompare(b.organizationName)),
      documentsWithIssues,
      migrationRecommendations: generateMigrationRecommendations(roleUsageMap, orgRolesMap)
    };

    // 6. Save report to file
    const reportPath = path.join(__dirname, '../reports');
    await fs.mkdir(reportPath, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFile = path.join(reportPath, `document-role-analysis-${timestamp}.json`);
    
    await fs.writeFile(reportFile, JSON.stringify(report, null, 2));

    // 7. Display summary
    console.log('📋 ANALYSIS SUMMARY');
    console.log('==================');
    console.log(`Total Documents: ${report.summary.totalDocuments}`);
    console.log(`Total Organizations: ${report.summary.totalOrganizations}`);
    console.log(`Unique Access Roles Found: ${report.summary.uniqueAccessRoles}`);
    console.log(`Documents with Issues: ${report.summary.documentsWithIssues}`);
    console.log();

    console.log('🎯 MOST COMMON ROLES');
    console.log('====================');
    report.roleUsage.slice(0, 10).forEach(role => {
      console.log(`${role.role}: ${role.usageCount} documents across ${role.organizationCount} organizations`);
    });
    console.log();

    console.log('⚠️  ORGANIZATIONS NEEDING ATTENTION');
    console.log('===================================');
    const orgsNeedingAttention = report.organizationAnalysis.filter(org => org.needsAttention);
    if (orgsNeedingAttention.length === 0) {
      console.log('✅ All organizations have mappable roles!');
    } else {
      orgsNeedingAttention.forEach(org => {
        console.log(`${org.organizationName}:`);
        console.log(`  - Unmappable roles: ${org.unmappableRoles.join(', ')}`);
        console.log(`  - Available roles: ${org.availableRoles.join(', ')}`);
        console.log();
      });
    }

    console.log('💡 MIGRATION RECOMMENDATIONS');
    console.log('============================');
    report.migrationRecommendations.forEach(rec => {
      console.log(`${rec.type}: ${rec.description}`);
    });
    console.log();

    console.log(`📄 Full report saved to: ${reportFile}`);
    console.log('✅ Analysis complete!');

  } catch (error) {
    console.error('❌ Error during analysis:', error);
    throw error;
  } finally {
    await db.destroy();
  }
}

/**
 * Generate migration recommendations based on analysis
 */
function generateMigrationRecommendations(roleUsageMap, orgRolesMap) {
  const recommendations = [];

  // Common role mappings
  const commonMappings = {
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

  // Check for common roles that need mapping
  for (const [role, data] of roleUsageMap) {
    const lowerRole = role.toLowerCase();
    if (commonMappings[lowerRole] && commonMappings[lowerRole] !== role) {
      recommendations.push({
        type: 'ROLE_MAPPING',
        description: `Map "${role}" to "${commonMappings[lowerRole]}" (${data.count} documents affected)`
      });
    }
  }

  // Check for organizations without proper role structure
  const orgsWithoutRoles = [];
  for (const [orgId, orgData] of orgRolesMap) {
    if (orgData.roles.length === 0) {
      orgsWithoutRoles.push(orgData.name);
    }
  }

  if (orgsWithoutRoles.length > 0) {
    recommendations.push({
      type: 'MISSING_ROLES',
      description: `Create default roles for organizations: ${orgsWithoutRoles.join(', ')}`
    });
  }

  // Check for roles that appear frequently but don't exist in any organization
  const frequentUnmappedRoles = Array.from(roleUsageMap.entries())
    .filter(([role, data]) => data.count >= 5) // Roles used in 5+ documents
    .map(([role]) => role)
    .filter(role => {
      // Check if this role exists in any organization
      for (const [, orgData] of orgRolesMap) {
        if (orgData.roles.some(r => r.name.toLowerCase() === role.toLowerCase())) {
          return false;
        }
      }
      return true;
    });

  if (frequentUnmappedRoles.length > 0) {
    recommendations.push({
      type: 'CREATE_MISSING_ROLES',
      description: `Consider creating these frequently used roles: ${frequentUnmappedRoles.join(', ')}`
    });
  }

  return recommendations;
}

// Run the analysis if this script is executed directly
if (require.main === module) {
  analyzeDocumentRoles()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = { analyzeDocumentRoles };