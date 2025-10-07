// Hardcoded permissions from ORGANIZATION_PERMISSIONS
const ORGANIZATION_PERMISSIONS = {
  // Basic organization management
  VIEW_ORGANIZATION: 'view_organization',
  EDIT_ORGANIZATION: 'edit_organization',
  DELETE_ORGANIZATION: 'delete_organization',
  MANAGE_ORGANIZATION_SETTINGS: 'manage_organization_settings',

  // Member management
  VIEW_MEMBERS: 'view_members',
  INVITE_MEMBERS: 'invite_members',
  REMOVE_MEMBERS: 'remove_members',
  MANAGE_MEMBER_ROLES: 'manage_member_roles',

  // Role and permission management
  VIEW_ROLES: 'view_roles',
  CREATE_ROLES: 'create_roles',
  EDIT_ROLES: 'edit_roles',
  DELETE_ROLES: 'delete_roles',
  ASSIGN_ROLES: 'assign_roles',

  // Event management
  VIEW_EVENTS: 'view_events',
  CREATE_EVENTS: 'create_events',
  EDIT_EVENTS: 'edit_events',
  DELETE_EVENTS: 'delete_events',
  MANAGE_EVENT_REGISTRATIONS: 'manage_event_registrations',

  // Comment and interaction management
  MODERATE_COMMENTS: 'moderate_comments',
  DELETE_COMMENTS: 'delete_comments',
  MANAGE_UPVOTES: 'manage_upvotes',

  // Invitation and access management
  MANAGE_INVITATIONS: 'manage_invitations',
  VIEW_INVITATION_CODES: 'view_invitation_codes',
  GENERATE_INVITATION_CODES: 'generate_invitation_codes',

  // Discord integration
  MANAGE_DISCORD_INTEGRATION: 'manage_discord_integration',
  VIEW_DISCORD_INTEGRATION: 'view_discord_integration',
  UPDATE_DISCORD_INTEGRATION: 'update_discord_integration',

  // Analytics and reporting
  VIEW_ANALYTICS: 'view_analytics',
  VIEW_REPORTS: 'view_reports',

  // HR Management permissions
  HR_MANAGER: 'hr_manager',
  VIEW_APPLICATIONS: 'view_applications',
  MANAGE_APPLICATIONS: 'manage_applications',
  VIEW_ONBOARDING: 'view_onboarding',
  MANAGE_ONBOARDING: 'manage_onboarding',
  VIEW_PERFORMANCE_REVIEWS: 'view_performance_reviews',
  MANAGE_PERFORMANCE_REVIEWS: 'manage_performance_reviews',
  VIEW_SKILLS_MATRIX: 'view_skills_matrix',
  MANAGE_SKILLS_MATRIX: 'manage_skills_matrix',
  VIEW_DOCUMENTS: 'view_documents',
  MANAGE_DOCUMENTS: 'manage_documents',
  VIEW_ACTIVITY_FEED: 'view_activity_feed',

  // HR Analytics permissions
  VIEW_HR_ANALYTICS: 'view_hr_analytics',
  MANAGE_HR_ANALYTICS: 'manage_hr_analytics',
};

exports.up = async function(knex) {
  // Get all organizations
  const organizations = await knex('organizations').select('id');

  for (const org of organizations) {
    // Find the owner role for this organization
    const ownerRole = await knex('organization_roles')
      .where({
        organization_id: org.id,
        name: 'Owner',
        is_system_role: true
      })
      .first();

    if (ownerRole) {
      // Get all available permissions
      const allPermissions = Object.values(ORGANIZATION_PERMISSIONS);

      // Get existing permissions for this role
      const existingPermissions = await knex('organization_permissions')
        .where({ role_id: ownerRole.id })
        .pluck('permission');

      // Find missing permissions
      const missingPermissions = allPermissions.filter(
        permission => !existingPermissions.includes(permission)
      );

      // Add missing permissions
      if (missingPermissions.length > 0) {
        const permissionsToInsert = missingPermissions.map(permission => ({
          role_id: ownerRole.id,
          permission,
          created_at: new Date(),
          updated_at: new Date()
        }));

        await knex('organization_permissions').insert(permissionsToInsert);
        console.log(`Added ${missingPermissions.length} missing permissions to Owner role for org ${org.id}`);
      }
    }

    // Also update Admin role to have HR permissions
    const adminRole = await knex('organization_roles')
      .where({
        organization_id: org.id,
        name: 'Admin',
        is_system_role: true
      })
      .first();

    if (adminRole) {
      const hrPermissions = [
        ORGANIZATION_PERMISSIONS.VIEW_HR_ANALYTICS,
        ORGANIZATION_PERMISSIONS.MANAGE_HR_ANALYTICS,
        ORGANIZATION_PERMISSIONS.VIEW_ANALYTICS
      ];

      const existingAdminPermissions = await knex('organization_permissions')
        .where({ role_id: adminRole.id })
        .pluck('permission');

      const missingHrPermissions = hrPermissions.filter(
        permission => !existingAdminPermissions.includes(permission)
      );

      if (missingHrPermissions.length > 0) {
        const hrPermissionsToInsert = missingHrPermissions.map(permission => ({
          role_id: adminRole.id,
          permission,
          created_at: new Date(),
          updated_at: new Date()
        }));

        await knex('organization_permissions').insert(hrPermissionsToInsert);
        console.log(`Added ${missingHrPermissions.length} HR permissions to Admin role for org ${org.id}`);
      }
    }
  }
};

exports.down = function(knex) {
  // This migration is not easily reversible since we don't know which permissions
  // were missing before. We'll leave the permissions in place.
  console.log('Migration down: Leaving permissions in place for safety');
};
