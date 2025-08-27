const {
  ORGANIZATION_PERMISSIONS,
  DEFAULT_ROLE_CONFIGS,
} = require('../dist/types/role');

exports.seed = async function (knex) {
  // Get all organizations to create default roles for them
  const organizations = await knex('organizations').select('id');

  if (organizations.length === 0) {
    console.log('No organizations found, skipping role seeding');
    return;
  }

  console.log(
    `Creating default roles for ${organizations.length} organizations`
  );

  for (const orgData of organizations) {
    const organizationId = orgData.id;

    // Check if roles already exist for this organization
    const existingRoles = await knex('organization_roles')
      .where({ organization_id: organizationId })
      .count('* as count')
      .first();

    if (parseInt(existingRoles.count) > 0) {
      console.log(
        `Roles already exist for organization ${organizationId}, skipping`
      );
      continue;
    }

    // Create Owner role
    const ownerRoleId = require('uuid').v4();
    await knex('organization_roles').insert({
      id: ownerRoleId,
      organization_id: organizationId,
      name: DEFAULT_ROLE_CONFIGS.OWNER.name,
      description: DEFAULT_ROLE_CONFIGS.OWNER.description,
      rank: DEFAULT_ROLE_CONFIGS.OWNER.rank,
      is_system_role: DEFAULT_ROLE_CONFIGS.OWNER.is_system_role,
      is_editable: DEFAULT_ROLE_CONFIGS.OWNER.is_editable,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Create Owner permissions
    const ownerPermissions = DEFAULT_ROLE_CONFIGS.OWNER.permissions.map(
      permission => ({
        id: require('uuid').v4(),
        role_id: ownerRoleId,
        permission,
        granted: true,
        created_at: new Date(),
        updated_at: new Date(),
      })
    );
    await knex('organization_permissions').insert(ownerPermissions);

    // Create Admin role
    const adminRoleId = require('uuid').v4();
    await knex('organization_roles').insert({
      id: adminRoleId,
      organization_id: organizationId,
      name: DEFAULT_ROLE_CONFIGS.ADMIN.name,
      description: DEFAULT_ROLE_CONFIGS.ADMIN.description,
      rank: DEFAULT_ROLE_CONFIGS.ADMIN.rank,
      is_system_role: DEFAULT_ROLE_CONFIGS.ADMIN.is_system_role,
      is_editable: DEFAULT_ROLE_CONFIGS.ADMIN.is_editable,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Create Admin permissions
    const adminPermissions = DEFAULT_ROLE_CONFIGS.ADMIN.permissions.map(
      permission => ({
        id: require('uuid').v4(),
        role_id: adminRoleId,
        permission,
        granted: true,
        created_at: new Date(),
        updated_at: new Date(),
      })
    );
    await knex('organization_permissions').insert(adminPermissions);

    // Create Member role
    const memberRoleId = require('uuid').v4();
    await knex('organization_roles').insert({
      id: memberRoleId,
      organization_id: organizationId,
      name: DEFAULT_ROLE_CONFIGS.MEMBER.name,
      description: DEFAULT_ROLE_CONFIGS.MEMBER.description,
      rank: DEFAULT_ROLE_CONFIGS.MEMBER.rank,
      is_system_role: DEFAULT_ROLE_CONFIGS.MEMBER.is_system_role,
      is_editable: DEFAULT_ROLE_CONFIGS.MEMBER.is_editable,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Create Member permissions
    const memberPermissions = DEFAULT_ROLE_CONFIGS.MEMBER.permissions.map(
      permission => ({
        id: require('uuid').v4(),
        role_id: memberRoleId,
        permission,
        granted: true,
        created_at: new Date(),
        updated_at: new Date(),
      })
    );
    await knex('organization_permissions').insert(memberPermissions);

    // Update existing organization members to use the new role system
    // First, get the organization owner
    const orgRecord = await knex('organizations')
      .where({ id: organizationId })
      .first();

    if (orgRecord && orgRecord.owner_id) {
      // Update the owner's role
      await knex('organization_members')
        .where({ organization_id: organizationId, user_id: orgRecord.owner_id })
        .update({ role_id: ownerRoleId });
    }

    console.log(`Created default roles for organization ${organizationId}`);
  }

  console.log('Default roles seeding completed');
};
