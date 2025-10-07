/**
 * Migration: Fix HR Organization Linkage
 * 
 * This migration fixes the organization linkage issues in HR tables:
 * 1. Makes hr_skills organization-specific instead of global
 * 2. Adds organization context to hr_user_skills
 * 3. Adds organization linkage to hr_performance_goals
 */

exports.up = async function(knex) {
  // Fix hr_skills table - add organization_id
  await knex.schema.alterTable('hr_skills', function(table) {
    // Add organization_id column as nullable first
    table
      .uuid('organization_id')
      .references('id')
      .inTable('organizations')
      .onDelete('CASCADE');
  });

  // Update existing skills to belong to the first organization (if any exists)
  const firstOrg = await knex('organizations').select('id').first();
  if (firstOrg) {
    await knex.raw(`
      UPDATE hr_skills 
      SET organization_id = ? 
      WHERE organization_id IS NULL
    `, [firstOrg.id]);
  } else {
    // If no organizations exist, delete all skills (they can't exist without an org)
    await knex('hr_skills').del();
  }

  // Now make the column not null and add constraints
  await knex.schema.alterTable('hr_skills', function(table) {
    table.uuid('organization_id').notNullable().alter();
  });

  // Drop the unique constraint on name and add new constraints/indexes
  await knex.schema.alterTable('hr_skills', function(table) {
    // Drop the unique constraint on name (since skills can now be duplicated across orgs)
    table.dropUnique(['name']);
    
    // Add composite unique constraint for name per organization
    table.unique(['organization_id', 'name'], 'hr_skills_org_name_unique');
    
    // Add index for organization queries
    table.index(['organization_id'], 'idx_hr_skills_organization_id');
    table.index(['organization_id', 'category'], 'idx_hr_skills_org_category');
  });

  // Fix hr_user_skills table - add organization context
  await knex.schema.alterTable('hr_user_skills', function(table) {
    // Add organization_id column as nullable first
    table
      .uuid('organization_id')
      .references('id')
      .inTable('organizations')
      .onDelete('CASCADE');
  });

  // Update existing user skills to belong to the first organization (if any exists)
  if (firstOrg) {
    await knex.raw(`
      UPDATE hr_user_skills 
      SET organization_id = ? 
      WHERE organization_id IS NULL
    `, [firstOrg.id]);
  } else {
    // If no organizations exist, delete all user skills
    await knex('hr_user_skills').del();
  }

  // Now make the column not null
  await knex.schema.alterTable('hr_user_skills', function(table) {
    table.uuid('organization_id').notNullable().alter();
  });

  // Drop existing constraint and add new ones
  await knex.schema.alterTable('hr_user_skills', function(table) {
    // Drop the existing unique constraint
    table.dropUnique(['user_id', 'skill_id']);
    
    // Add new composite unique constraint including organization
    table.unique(['user_id', 'skill_id', 'organization_id'], 'hr_user_skills_user_skill_org_unique');
    
    // Add indexes for organization queries
    table.index(['organization_id'], 'idx_hr_user_skills_organization_id');
    table.index(['organization_id', 'skill_id'], 'idx_hr_user_skills_org_skill');
    table.index(['organization_id', 'user_id'], 'idx_hr_user_skills_org_user');
  });

  // Fix hr_performance_goals table - add organization linkage
  await knex.schema.alterTable('hr_performance_goals', function(table) {
    // Add organization_id column as nullable first
    table
      .uuid('organization_id')
      .references('id')
      .inTable('organizations')
      .onDelete('CASCADE');
  });

  // Update existing goals to belong to the organization from their review
  await knex.raw(`
    UPDATE hr_performance_goals 
    SET organization_id = hr_performance_reviews.organization_id
    FROM hr_performance_reviews
    WHERE hr_performance_goals.review_id = hr_performance_reviews.id
    AND hr_performance_goals.organization_id IS NULL
  `);

  // Now make the column not null
  await knex.schema.alterTable('hr_performance_goals', function(table) {
    table.uuid('organization_id').notNullable().alter();
  });

  // Add indexes for organization queries
  await knex.schema.alterTable('hr_performance_goals', function(table) {
    table.index(['organization_id'], 'idx_hr_performance_goals_organization_id');
    table.index(['organization_id', 'user_id'], 'idx_hr_performance_goals_org_user');
    table.index(['organization_id', 'status'], 'idx_hr_performance_goals_org_status');
  });
};

exports.down = async function(knex) {
  // Revert hr_skills table changes
  await knex.schema.alterTable('hr_skills', function(table) {
    // Drop the new indexes
    table.dropIndex(['organization_id'], 'idx_hr_skills_organization_id');
    table.dropIndex(['organization_id', 'category'], 'idx_hr_skills_org_category');
    
    // Drop the composite unique constraint
    table.dropUnique(['organization_id', 'name'], 'hr_skills_org_name_unique');
  });

  // Re-add the original unique constraint on name
  await knex.schema.alterTable('hr_skills', function(table) {
    table.unique(['name']);
  });

  // Drop the organization_id column
  await knex.schema.alterTable('hr_skills', function(table) {
    table.dropColumn('organization_id');
  });

  // Revert hr_user_skills table changes
  await knex.schema.alterTable('hr_user_skills', function(table) {
    // Drop the new indexes
    table.dropIndex(['organization_id'], 'idx_hr_user_skills_organization_id');
    table.dropIndex(['organization_id', 'skill_id'], 'idx_hr_user_skills_org_skill');
    table.dropIndex(['organization_id', 'user_id'], 'idx_hr_user_skills_org_user');
    
    // Drop the new composite unique constraint
    table.dropUnique(['user_id', 'skill_id', 'organization_id'], 'hr_user_skills_user_skill_org_unique');
  });

  // Re-add the original unique constraint
  await knex.schema.alterTable('hr_user_skills', function(table) {
    table.unique(['user_id', 'skill_id']);
  });

  // Drop the organization_id column
  await knex.schema.alterTable('hr_user_skills', function(table) {
    table.dropColumn('organization_id');
  });

  // Revert hr_performance_goals table changes
  await knex.schema.alterTable('hr_performance_goals', function(table) {
    // Drop the new indexes
    table.dropIndex(['organization_id'], 'idx_hr_performance_goals_organization_id');
    table.dropIndex(['organization_id', 'user_id'], 'idx_hr_performance_goals_org_user');
    table.dropIndex(['organization_id', 'status'], 'idx_hr_performance_goals_org_status');
    
    // Drop the organization_id column
    table.dropColumn('organization_id');
  });
};