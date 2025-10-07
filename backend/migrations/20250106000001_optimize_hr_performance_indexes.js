/**
 * Migration: Optimize HR Performance Indexes
 * 
 * This migration adds comprehensive indexes for HR system performance optimization,
 * focusing on frequently queried columns and composite indexes for complex queries.
 */

exports.up = function(knex) {
  return Promise.all([
    // HR Activities table optimizations
    knex.schema.alterTable('hr_activities', function(table) {
      // Composite index for organization + activity type queries
      table.index(['organization_id', 'activity_type'], 'idx_hr_activities_org_type');
      
      // Composite index for organization + created_at (for recent activities)
      table.index(['organization_id', 'created_at'], 'idx_hr_activities_org_created');
      
      // Composite index for pagination with filters
      table.index(['organization_id', 'activity_type', 'created_at'], 'idx_hr_activities_org_type_created');
      
      // Index for user-specific activities
      table.index(['user_id', 'created_at'], 'idx_hr_activities_user_created');
    }),

    // HR Applications table optimizations
    knex.schema.alterTable('hr_applications', function(table) {
      // Composite index for status filtering with pagination
      table.index(['organization_id', 'status', 'created_at'], 'idx_hr_applications_org_status_created');
      
      // Index for reviewer queries
      table.index(['reviewer_id', 'status'], 'idx_hr_applications_reviewer_status');
      
      // Index for user application history
      table.index(['user_id', 'organization_id'], 'idx_hr_applications_user_org');
    }),

    // HR Skills table optimizations (skills are global, not per organization)
    knex.schema.alterTable('hr_skills', function(table) {
      // Composite index for verification required skills by category
      table.index(['category', 'verification_required'], 'idx_hr_skills_category_verification');
    }),

    // HR User Skills table optimizations (will be updated after organization linkage migration)
    knex.schema.alterTable('hr_user_skills', function(table) {
      // Composite index for user skill queries
      table.index(['user_id', 'skill_id'], 'idx_hr_user_skills_user_skill');
      
      // Composite index for skill statistics
      table.index(['skill_id', 'verified'], 'idx_hr_user_skills_skill_verified');
      
      // Index for proficiency level queries
      table.index(['skill_id', 'proficiency_level'], 'idx_hr_user_skills_skill_proficiency');
      
      // Composite index for verified skills
      table.index(['skill_id', 'verified', 'verified_at'], 'idx_hr_user_skills_skill_verified_at');
    }),

    // HR Performance Reviews table optimizations
    knex.schema.alterTable('hr_performance_reviews', function(table) {
      // Composite index for organization reviews by period
      table.index(['organization_id', 'review_period_start'], 'idx_hr_performance_org_period_start');
      
      // Index for reviewee queries by period
      table.index(['reviewee_id', 'review_period_start'], 'idx_hr_performance_reviewee_period');
      
      // Index for reviewer queries
      table.index(['reviewer_id', 'status'], 'idx_hr_performance_reviewer_status');
      
      // Composite index for status and period
      table.index(['organization_id', 'status', 'review_period_start'], 'idx_hr_performance_org_status_period');
    }),

    // HR Onboarding Progress table optimizations
    knex.schema.alterTable('hr_onboarding_progress', function(table) {
      // Composite index for organization onboarding tracking
      table.index(['organization_id', 'user_id'], 'idx_hr_onboarding_org_user');
      
      // Index for status queries
      table.index(['organization_id', 'status'], 'idx_hr_onboarding_org_status');
      
      // Index for progress tracking
      table.index(['user_id', 'status'], 'idx_hr_onboarding_user_status');
      
      // Index for completion percentage queries
      table.index(['organization_id', 'completion_percentage'], 'idx_hr_onboarding_org_completion');
    }),
  ]);
};

exports.down = function(knex) {
  return Promise.all([
    // Drop HR Activities indexes
    knex.schema.alterTable('hr_activities', function(table) {
      table.dropIndex(['organization_id', 'activity_type'], 'idx_hr_activities_org_type');
      table.dropIndex(['organization_id', 'created_at'], 'idx_hr_activities_org_created');
      table.dropIndex(['organization_id', 'activity_type', 'created_at'], 'idx_hr_activities_org_type_created');
      table.dropIndex(['user_id', 'created_at'], 'idx_hr_activities_user_created');
    }),

    // Drop HR Applications indexes
    knex.schema.alterTable('hr_applications', function(table) {
      table.dropIndex(['organization_id', 'status', 'created_at'], 'idx_hr_applications_org_status_created');
      table.dropIndex(['reviewer_id', 'status'], 'idx_hr_applications_reviewer_status');
      table.dropIndex(['user_id', 'organization_id'], 'idx_hr_applications_user_org');
    }),

    // Drop HR Skills indexes
    knex.schema.alterTable('hr_skills', function(table) {
      table.dropIndex(['category', 'verification_required'], 'idx_hr_skills_category_verification');
    }),

    // Drop HR User Skills indexes
    knex.schema.alterTable('hr_user_skills', function(table) {
      table.dropIndex(['user_id', 'skill_id'], 'idx_hr_user_skills_user_skill');
      table.dropIndex(['skill_id', 'verified'], 'idx_hr_user_skills_skill_verified');
      table.dropIndex(['skill_id', 'proficiency_level'], 'idx_hr_user_skills_skill_proficiency');
      table.dropIndex(['skill_id', 'verified', 'verified_at'], 'idx_hr_user_skills_skill_verified_at');
    }),

    // Drop HR Performance Reviews indexes
    knex.schema.alterTable('hr_performance_reviews', function(table) {
      table.dropIndex(['organization_id', 'review_period_start'], 'idx_hr_performance_org_period_start');
      table.dropIndex(['reviewee_id', 'review_period_start'], 'idx_hr_performance_reviewee_period');
      table.dropIndex(['reviewer_id', 'status'], 'idx_hr_performance_reviewer_status');
      table.dropIndex(['organization_id', 'status', 'review_period_start'], 'idx_hr_performance_org_status_period');
    }),

    // Drop HR Onboarding Progress indexes
    knex.schema.alterTable('hr_onboarding_progress', function(table) {
      table.dropIndex(['organization_id', 'user_id'], 'idx_hr_onboarding_org_user');
      table.dropIndex(['organization_id', 'status'], 'idx_hr_onboarding_org_status');
      table.dropIndex(['user_id', 'status'], 'idx_hr_onboarding_user_status');
      table.dropIndex(['organization_id', 'completion_percentage'], 'idx_hr_onboarding_org_completion');
    }),
  ]);
};