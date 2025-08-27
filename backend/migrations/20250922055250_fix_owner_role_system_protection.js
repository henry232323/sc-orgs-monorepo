/**
 * Fix Owner roles to be properly protected system roles
 * Ensures Owner roles cannot be accidentally edited or deleted
 */

exports.up = function (knex) {
  return knex.raw(`
    -- Update all Owner roles to be system roles and non-editable
    UPDATE organization_roles 
    SET 
      is_system_role = true,
      is_editable = false,
      updated_at = NOW()
    WHERE name = 'Owner';
    
    -- Also fix any roles that might have been accidentally renamed but should be Owner
    -- (This handles cases where the role was created as Owner but renamed during testing)
    UPDATE organization_roles 
    SET 
      name = 'Owner',
      description = 'Organization owner with full permissions',
      is_system_role = true,
      is_editable = false,
      updated_at = NOW()
    WHERE 
      -- Find roles that have all permissions and are assigned to organization owners
      id IN (
        SELECT DISTINCT r.id 
        FROM organization_roles r
        JOIN organization_members om ON r.id = om.role_id
        JOIN organizations o ON r.organization_id = o.id AND om.user_id = o.owner_id
        WHERE r.name != 'Owner' 
          AND r.organization_id = om.organization_id
          AND om.is_active = true
      );
  `);
};

exports.down = function (knex) {
  return knex.raw(`
    -- Revert Owner roles back to regular editable roles (not recommended)
    UPDATE organization_roles 
    SET 
      is_system_role = false,
      is_editable = true,
      updated_at = NOW()
    WHERE name = 'Owner';
  `);
};