const { ORGANIZATION_PERMISSIONS } = require('../dist/types/role');

exports.up = async function (knex) {
  console.log('Ensuring owner roles have all permissions...');

  // Get all owner roles
  const ownerRoles = await knex('organization_roles')
    .where({ name: 'Owner' })
    .select('id', 'organization_id');

  console.log(`Found ${ownerRoles.length} owner roles to update`);

  for (const ownerRole of ownerRoles) {
    // Get all available permissions
    const allPermissions = Object.values(ORGANIZATION_PERMISSIONS);
    
    // Get current permissions for this owner role
    const currentPermissions = await knex('organization_permissions')
      .where({ role_id: ownerRole.id, granted: true })
      .select('permission');

    const currentPermissionNames = currentPermissions.map(p => p.permission);
    
    // Find missing permissions
    const missingPermissions = allPermissions.filter(
      permission => !currentPermissionNames.includes(permission)
    );

    // Add missing permissions
    if (missingPermissions.length > 0) {
      console.log(`Adding ${missingPermissions.length} missing permissions to owner role ${ownerRole.id}`);
      
      const permissionInserts = missingPermissions.map(permission => ({
        id: require('uuid').v4(),
        role_id: ownerRole.id,
        permission,
        granted: true,
        created_at: new Date(),
        updated_at: new Date(),
      }));

      await knex('organization_permissions').insert(permissionInserts);
    } else {
      console.log(`Owner role ${ownerRole.id} already has all permissions`);
    }
  }

  console.log('Owner role permissions update completed');
};

exports.down = async function (knex) {
  // This migration only adds permissions, so we don't need to remove them
  // The owner role should always have all permissions
  console.log('Rollback: Owner role permissions remain unchanged');
};