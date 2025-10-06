import db from '../config/database';
import {
  OrganizationRole,
  OrganizationPermission,
  CreateRoleData,
  UpdateRoleData,
  OrganizationMemberWithRole,
  ORGANIZATION_PERMISSIONS,
  DEFAULT_ROLE_CONFIGS,
} from '../types/role';
import { v4 as uuidv4 } from 'uuid';

export class RoleModel {
  /**
   * Create default roles for a new organization
   */
  async createDefaultRoles(
    organizationId: string
  ): Promise<OrganizationRole[]> {
    const roles: OrganizationRole[] = [];

    // Create Owner role with special handling
    const ownerRole = await this.createOwnerRole(organizationId);
    roles.push(ownerRole);

    // Create Admin role
    const adminRole = await this.createRole({
      organization_id: organizationId,
      name: DEFAULT_ROLE_CONFIGS.ADMIN.name,
      description: DEFAULT_ROLE_CONFIGS.ADMIN.description,
      rank: DEFAULT_ROLE_CONFIGS.ADMIN.rank,
      permissions: DEFAULT_ROLE_CONFIGS.ADMIN.permissions,
    });
    roles.push(adminRole);

    // Create Member role
    const memberRole = await this.createRole({
      organization_id: organizationId,
      name: DEFAULT_ROLE_CONFIGS.MEMBER.name,
      description: DEFAULT_ROLE_CONFIGS.MEMBER.description,
      rank: DEFAULT_ROLE_CONFIGS.MEMBER.rank,
      permissions: DEFAULT_ROLE_CONFIGS.MEMBER.permissions,
    });
    roles.push(memberRole);

    return roles;
  }

  /**
   * Create Owner role with all permissions (special method)
   */
  async createOwnerRole(organizationId: string): Promise<OrganizationRole> {
    // Create the role with is_editable: false (only the original owner role)
    const [role] = await db('organization_roles')
      .insert({
        organization_id: organizationId,
        name: DEFAULT_ROLE_CONFIGS.OWNER.name,
        description: DEFAULT_ROLE_CONFIGS.OWNER.description,
        rank: DEFAULT_ROLE_CONFIGS.OWNER.rank,
        is_system_role: true,
        is_editable: false, // Only the original owner role cannot be edited
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');

    // Grant ALL available permissions to the owner role
    const allPermissions = Object.values(ORGANIZATION_PERMISSIONS);
    const permissionInserts = allPermissions.map(permission => ({
      role_id: role.id,
      permission,
      granted: true,
      created_at: new Date(),
      updated_at: new Date(),
    }));

    await db('organization_permissions').insert(permissionInserts);

    // Return role with permissions
    const roleWithPermissions = await this.findById(role.id);
    if (!roleWithPermissions) {
      throw new Error('Failed to create owner role');
    }
    return roleWithPermissions;
  }

  /**
   * Create a new role with permissions
   */
  async createRole(roleData: CreateRoleData): Promise<OrganizationRole> {
    // Let PostgreSQL generate the role UUID
    const [role] = await db('organization_roles')
      .insert({
        organization_id: roleData.organization_id,
        name: roleData.name,
        description: roleData.description,
        rank: roleData.rank,
        is_system_role: false,
        is_editable: true,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');

    // Create permissions for the role
    if (roleData.permissions && roleData.permissions.length > 0) {
      const permissionInserts = roleData.permissions.map(permission => ({
        // Let PostgreSQL generate permission UUIDs too
        role_id: role.id,
        permission,
        granted: true,
        created_at: new Date(),
        updated_at: new Date(),
      }));

      await db('organization_permissions').insert(permissionInserts);
    }

    // Return role with permissions
    const roleWithPermissions = await this.findById(role.id);
    if (!roleWithPermissions) {
      throw new Error('Failed to create role');
    }
    return roleWithPermissions;
  }

  /**
   * Find role by ID with permissions
   */
  async findById(roleId: string): Promise<OrganizationRole | null> {
    const role = await db('organization_roles').where({ id: roleId }).first();

    if (!role) return null;

    // Get permissions for this role
    const permissions = await db('organization_permissions')
      .where({ role_id: roleId })
      .select('*');

    return {
      ...role,
      permissions,
    };
  }

  /**
   * Find role by organization and name
   */
  async findByOrganizationAndName(
    organizationId: string,
    name: string
  ): Promise<OrganizationRole | null> {
    const role = await db('organization_roles')
      .where({ organization_id: organizationId, name })
      .first();

    if (!role) return null;

    return this.findById(role.id);
  }

  /**
   * Get all roles for an organization
   */
  async getRolesByOrganization(
    organizationId: string
  ): Promise<OrganizationRole[]> {
    const roles = await db('organization_roles')
      .where({ organization_id: organizationId, is_active: true })
      .orderBy('rank', 'desc')
      .orderBy('name', 'asc');

    // Get permissions for each role
    const rolesWithPermissions = await Promise.all(
      roles.map(async role => {
        const permissions = await db('organization_permissions')
          .where({ role_id: role.id })
          .select('*');

        return {
          ...role,
          permissions,
        };
      })
    );

    return rolesWithPermissions;
  }

  /**
   * Update a role
   */
  async updateRole(
    roleId: string,
    updateData: UpdateRoleData
  ): Promise<OrganizationRole | null> {
    // Check if role exists and is editable
    const existingRole = await db('organization_roles')
      .where({ id: roleId })
      .first();

    if (!existingRole) return null;
    if (!existingRole.is_editable) {
      throw new Error('This role cannot be edited');
    }

    // Update role data (exclude permissions as they're stored separately)
    const { permissions, ...roleData } = updateData;
    const [updatedRole] = await db('organization_roles')
      .where({ id: roleId })
      .update({
        ...roleData,
        updated_at: new Date(),
      })
      .returning('*');

    // Update permissions if provided
    if (updateData.permissions) {
      // Remove existing permissions
      await db('organization_permissions').where({ role_id: roleId }).del();

      // Add new permissions
      if (updateData.permissions.length > 0) {
        const permissionInserts = updateData.permissions.map(permission => ({
          id: uuidv4(),
          role_id: roleId,
          permission,
          granted: true,
          created_at: new Date(),
          updated_at: new Date(),
        }));

        await db('organization_permissions').insert(permissionInserts);
      }
    }

    return this.findById(roleId);
  }

  /**
   * Delete a role (only if it's not a system role and not in use)
   */
  async deleteRole(roleId: string): Promise<boolean> {
    // Check if role exists and is deletable
    const role = await db('organization_roles').where({ id: roleId }).first();

    if (!role) return false;
    if (!role.is_editable) {
      throw new Error('This role cannot be deleted');
    }
    if (role.is_system_role) {
      throw new Error('System roles cannot be deleted');
    }

    // Check if role is in use
    const memberCount = await db('organization_members')
      .where({ role_id: roleId })
      .count('* as count')
      .first();

    if (parseInt(memberCount?.count as string) > 0) {
      throw new Error('Cannot delete role that is assigned to members');
    }

    // Delete permissions first
    await db('organization_permissions').where({ role_id: roleId }).del();

    // Delete the role
    const deleted = await db('organization_roles').where({ id: roleId }).del();

    return deleted > 0;
  }

  /**
   * Assign a role to a user
   */
  async assignRoleToUser(
    organizationId: string,
    userId: string,
    roleId: string
  ): Promise<boolean> {
    // Check if role exists in the organization
    const role = await db('organization_roles')
      .where({ id: roleId, organization_id: organizationId })
      .first();

    if (!role) {
      throw new Error('Role not found in this organization');
    }

    // Update or insert member record
    const existingMember = await db('organization_members')
      .where({ organization_id: organizationId, user_id: userId })
      .first();

    if (existingMember) {
      // Update existing member
      await db('organization_members')
        .where({ organization_id: organizationId, user_id: userId })
        .update({
          role_id: roleId,
          updated_at: new Date(),
        });
    } else {
      // Create new member record - let PostgreSQL generate the UUID
      await db('organization_members').insert({
        organization_id: organizationId,
        user_id: userId,
        role_id: roleId,
        is_active: true,
        joined_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    return true;
  }

  /**
   * Get user's role in an organization
   */
  async getUserRole(
    organizationId: string,
    userId: string
  ): Promise<string | null> {
    const member = await db('organization_members')
      .where({
        organization_id: organizationId,
        user_id: userId,
        is_active: true,
      })
      .first();

    if (!member) return null;

    // If role_id exists, get the role name from organization_roles table
    if (member.role_id) {
      const role = await this.findById(member.role_id);
      return role ? role.name : null;
    }

    // Fallback to the old role string field for backward compatibility
    return member.role || null;
  }

  /**
   * Get user's full role object in an organization
   */
  async getUserRoleObject(
    organizationId: string,
    userId: string
  ): Promise<OrganizationRole | null> {
    const member = await db('organization_members')
      .where({
        organization_id: organizationId,
        user_id: userId,
        is_active: true,
      })
      .first();

    if (!member) return null;

    // If role_id exists, get the full role object
    if (member.role_id) {
      return await this.findById(member.role_id);
    }

    // Fallback: try to find role by name for backward compatibility
    if (member.role) {
      return await this.findByOrganizationAndName(organizationId, member.role);
    }

    return null;
  }

  /**
   * Check if user has a specific permission in an organization
   */
  async userHasPermission(
    organizationId: string,
    userId: string,
    permission: string
  ): Promise<boolean> {
    const role = await this.getUserRoleObject(organizationId, userId);
    if (!role) return false;

    const permissionRecord = await db('organization_permissions')
      .where({ role_id: role.id, permission, granted: true })
      .first();

    return !!permissionRecord;
  }

  /**
   * Get all members of an organization with their roles
   * Hidden members are only shown to other members of the same organization
   */
  async getOrganizationMembers(
    organizationId: string,
    options: { limit: number; offset: number; viewerUserId?: string } = {
      limit: 50,
      offset: 0,
    }
  ): Promise<OrganizationMemberWithRole[]> {
    // Check if the viewer is a member of this organization
    let viewerIsMember = false;
    if (options.viewerUserId) {
      const viewerMembership = await db('organization_members')
        .where({
          organization_id: organizationId,
          user_id: options.viewerUserId,
          is_active: true,
        })
        .first();
      viewerIsMember = !!viewerMembership;
    }

    // Build the query - if viewer is not a member, exclude hidden members
    let query = db('organization_members')
      .join('users', 'organization_members.user_id', 'users.id')
      .leftJoin(
        'organization_roles',
        'organization_members.role_id',
        'organization_roles.id'
      )
      .where({
        'organization_members.organization_id': organizationId,
        'organization_members.is_active': true,
      });

    // If viewer is not a member of this org, hide members who have set their membership as hidden
    if (!viewerIsMember) {
      query = query.where('organization_members.is_hidden', false);
    }

    const members = await query
      .select(
        'organization_members.*',
        'users.rsi_handle',
        'users.avatar_url',
        'users.is_rsi_verified',
        'organization_roles.name as role_name',
        'organization_roles.rank as role_rank',
        'organization_roles.description as role_description'
      )
      .limit(options.limit)
      .offset(options.offset)
      .orderBy('organization_roles.rank', 'desc')
      .orderBy('organization_members.joined_at', 'asc');

    // Get permissions for each member's role
    const membersWithRoles = await Promise.all(
      members.map(async member => {
        let role: OrganizationRole | null = null;
        if (member.role_id) {
          role = await this.findById(member.role_id);
        }

        return {
          id: member.id,
          organization_id: member.organization_id,
          user_id: member.user_id,
          role_id: member.role_id,
          role,
          is_active: member.is_active,
          joined_at: member.joined_at,
          last_activity_at: member.last_activity_at,
          created_at: member.created_at,
          updated_at: member.updated_at,
          user: {
            id: member.user_id,
            rsi_handle: member.rsi_handle,
            avatar_url: member.avatar_url,
            is_rsi_verified: member.is_rsi_verified,
          },
        };
      })
    );

    return membersWithRoles as OrganizationMemberWithRole[];
  }

  /**
   * Remove a user from an organization
   */
  async removeUserFromOrganization(
    organizationId: string,
    userId: string
  ): Promise<boolean> {
    const deleted = await db('organization_members')
      .where({ organization_id: organizationId, user_id: userId })
      .del();

    return deleted > 0;
  }

  /**
   * Check if a user can manage another user's role
   */
  async canManageUserRole(
    organizationId: string,
    managerUserId: string,
    targetUserId: string
  ): Promise<boolean> {
    const managerRole = await this.getUserRoleObject(
      organizationId,
      managerUserId
    );
    const targetRole = await this.getUserRoleObject(
      organizationId,
      targetUserId
    );

    if (!managerRole || !targetRole) return false;

    // Check if manager has manage_roles permission
    const hasManageRolesPermission = await this.userHasPermission(
      organizationId,
      managerUserId,
      ORGANIZATION_PERMISSIONS.MANAGE_ROLES
    );

    if (!hasManageRolesPermission) return false;

    // Manager can only manage users with lower rank
    return managerRole.rank > targetRole.rank;
  }

  /**
   * Ensure owner role has all permissions (for existing organizations)
   */
  async ensureOwnerRoleHasAllPermissions(organizationId: string): Promise<void> {
    const ownerRole = await this.findByOrganizationAndName(
      organizationId,
      DEFAULT_ROLE_CONFIGS.OWNER.name
    );

    if (!ownerRole) return;

    // Get all available permissions
    const allPermissions = Object.values(ORGANIZATION_PERMISSIONS);
    
    // Get current permissions for the owner role
    const currentPermissions = await db('organization_permissions')
      .where({ role_id: ownerRole.id, granted: true })
      .select('permission');

    const currentPermissionNames = currentPermissions.map(p => p.permission);
    
    // Find missing permissions
    const missingPermissions = allPermissions.filter(
      permission => !currentPermissionNames.includes(permission)
    );

    // Add missing permissions
    if (missingPermissions.length > 0) {
      const permissionInserts = missingPermissions.map(permission => ({
        role_id: ownerRole.id,
        permission,
        granted: true,
        created_at: new Date(),
        updated_at: new Date(),
      }));

      await db('organization_permissions').insert(permissionInserts);
    }
  }

  // HR-specific permission checking methods

  /**
   * Check if user has HR Manager permissions
   */
  async userIsHRManager(
    organizationId: string,
    userId: string
  ): Promise<boolean> {
    return await this.userHasPermission(
      organizationId,
      userId,
      ORGANIZATION_PERMISSIONS.HR_MANAGER
    );
  }

  /**
   * Check if user has Recruiter permissions
   */
  async userIsRecruiter(
    organizationId: string,
    userId: string
  ): Promise<boolean> {
    return await this.userHasPermission(
      organizationId,
      userId,
      ORGANIZATION_PERMISSIONS.HR_RECRUITER
    );
  }

  /**
   * Check if user has Supervisor permissions
   */
  async userIsSupervisor(
    organizationId: string,
    userId: string
  ): Promise<boolean> {
    return await this.userHasPermission(
      organizationId,
      userId,
      ORGANIZATION_PERMISSIONS.HR_SUPERVISOR
    );
  }

  /**
   * Check if user has any HR role (Manager, Recruiter, or Supervisor)
   */
  async userHasHRRole(
    organizationId: string,
    userId: string
  ): Promise<boolean> {
    const isHRManager = await this.userIsHRManager(organizationId, userId);
    const isRecruiter = await this.userIsRecruiter(organizationId, userId);
    const isSupervisor = await this.userIsSupervisor(organizationId, userId);
    
    return isHRManager || isRecruiter || isSupervisor;
  }

  /**
   * Check if user can manage HR applications
   */
  async userCanManageHRApplications(
    organizationId: string,
    userId: string
  ): Promise<boolean> {
    return await this.userHasPermission(
      organizationId,
      userId,
      ORGANIZATION_PERMISSIONS.MANAGE_HR_APPLICATIONS
    );
  }

  /**
   * Check if user can view HR applications
   */
  async userCanViewHRApplications(
    organizationId: string,
    userId: string
  ): Promise<boolean> {
    return await this.userHasPermission(
      organizationId,
      userId,
      ORGANIZATION_PERMISSIONS.VIEW_HR_APPLICATIONS
    );
  }

  /**
   * Check if user can process HR applications
   */
  async userCanProcessHRApplications(
    organizationId: string,
    userId: string
  ): Promise<boolean> {
    return await this.userHasPermission(
      organizationId,
      userId,
      ORGANIZATION_PERMISSIONS.PROCESS_HR_APPLICATIONS
    );
  }

  /**
   * Check if user can manage HR onboarding
   */
  async userCanManageHROnboarding(
    organizationId: string,
    userId: string
  ): Promise<boolean> {
    return await this.userHasPermission(
      organizationId,
      userId,
      ORGANIZATION_PERMISSIONS.MANAGE_HR_ONBOARDING
    );
  }

  /**
   * Check if user can view HR onboarding
   */
  async userCanViewHROnboarding(
    organizationId: string,
    userId: string
  ): Promise<boolean> {
    return await this.userHasPermission(
      organizationId,
      userId,
      ORGANIZATION_PERMISSIONS.VIEW_HR_ONBOARDING
    );
  }

  /**
   * Check if user can manage HR performance reviews
   */
  async userCanManageHRPerformance(
    organizationId: string,
    userId: string
  ): Promise<boolean> {
    return await this.userHasPermission(
      organizationId,
      userId,
      ORGANIZATION_PERMISSIONS.MANAGE_HR_PERFORMANCE
    );
  }

  /**
   * Check if user can conduct performance reviews
   */
  async userCanConductPerformanceReviews(
    organizationId: string,
    userId: string
  ): Promise<boolean> {
    return await this.userHasPermission(
      organizationId,
      userId,
      ORGANIZATION_PERMISSIONS.CONDUCT_PERFORMANCE_REVIEWS
    );
  }

  /**
   * Check if user can manage HR skills
   */
  async userCanManageHRSkills(
    organizationId: string,
    userId: string
  ): Promise<boolean> {
    return await this.userHasPermission(
      organizationId,
      userId,
      ORGANIZATION_PERMISSIONS.MANAGE_HR_SKILLS
    );
  }

  /**
   * Check if user can verify skills
   */
  async userCanVerifySkills(
    organizationId: string,
    userId: string
  ): Promise<boolean> {
    return await this.userHasPermission(
      organizationId,
      userId,
      ORGANIZATION_PERMISSIONS.VERIFY_SKILLS
    );
  }

  /**
   * Check if user can manage HR documents
   */
  async userCanManageHRDocuments(
    organizationId: string,
    userId: string
  ): Promise<boolean> {
    return await this.userHasPermission(
      organizationId,
      userId,
      ORGANIZATION_PERMISSIONS.MANAGE_HR_DOCUMENTS
    );
  }

  /**
   * Check if user can view HR analytics
   */
  async userCanViewHRAnalytics(
    organizationId: string,
    userId: string
  ): Promise<boolean> {
    return await this.userHasPermission(
      organizationId,
      userId,
      ORGANIZATION_PERMISSIONS.VIEW_HR_ANALYTICS
    );
  }

  /**
   * Create HR roles for an organization
   */
  async createHRRoles(organizationId: string): Promise<OrganizationRole[]> {
    const hrRoles: OrganizationRole[] = [];

    // Create HR Manager role
    const hrManagerRole = await this.createRole({
      organization_id: organizationId,
      name: DEFAULT_ROLE_CONFIGS.HR_MANAGER.name,
      description: DEFAULT_ROLE_CONFIGS.HR_MANAGER.description,
      rank: DEFAULT_ROLE_CONFIGS.HR_MANAGER.rank,
      permissions: DEFAULT_ROLE_CONFIGS.HR_MANAGER.permissions,
    });
    hrRoles.push(hrManagerRole);

    // Create Recruiter role
    const recruiterRole = await this.createRole({
      organization_id: organizationId,
      name: DEFAULT_ROLE_CONFIGS.RECRUITER.name,
      description: DEFAULT_ROLE_CONFIGS.RECRUITER.description,
      rank: DEFAULT_ROLE_CONFIGS.RECRUITER.rank,
      permissions: DEFAULT_ROLE_CONFIGS.RECRUITER.permissions,
    });
    hrRoles.push(recruiterRole);

    // Create Supervisor role
    const supervisorRole = await this.createRole({
      organization_id: organizationId,
      name: DEFAULT_ROLE_CONFIGS.SUPERVISOR.name,
      description: DEFAULT_ROLE_CONFIGS.SUPERVISOR.description,
      rank: DEFAULT_ROLE_CONFIGS.SUPERVISOR.rank,
      permissions: DEFAULT_ROLE_CONFIGS.SUPERVISOR.permissions,
    });
    hrRoles.push(supervisorRole);

    return hrRoles;
  }

  /**
   * Assign HR role to user with validation
   */
  async assignHRRole(
    organizationId: string,
    userId: string,
    hrRoleName: 'HR Manager' | 'Recruiter' | 'Supervisor',
    assignedBy: string
  ): Promise<boolean> {
    // Check if the assigner has permission to assign roles
    const canAssignRoles = await this.userHasPermission(
      organizationId,
      assignedBy,
      ORGANIZATION_PERMISSIONS.ASSIGN_ROLES
    );

    if (!canAssignRoles) {
      throw new Error('User does not have permission to assign roles');
    }

    // Find the HR role
    const hrRole = await this.findByOrganizationAndName(organizationId, hrRoleName);
    if (!hrRole) {
      throw new Error(`HR role '${hrRoleName}' not found in organization`);
    }

    // Assign the role
    return await this.assignRoleToUser(organizationId, userId, hrRole.id);
  }

  /**
   * Validate HR role assignment permissions
   */
  async validateHRRoleAssignment(
    organizationId: string,
    assignerId: string,
    targetUserId: string,
    hrRoleName: string
  ): Promise<{ valid: boolean; reason?: string }> {
    // Check if assigner has role assignment permissions
    const canAssignRoles = await this.userHasPermission(
      organizationId,
      assignerId,
      ORGANIZATION_PERMISSIONS.ASSIGN_ROLES
    );

    if (!canAssignRoles) {
      return { valid: false, reason: 'Insufficient permissions to assign roles' };
    }

    // Check if target user is a member of the organization
    const targetRole = await this.getUserRoleObject(organizationId, targetUserId);
    if (!targetRole) {
      return { valid: false, reason: 'Target user is not a member of this organization' };
    }

    // Check if HR role exists
    const hrRole = await this.findByOrganizationAndName(organizationId, hrRoleName);
    if (!hrRole) {
      return { valid: false, reason: `HR role '${hrRoleName}' does not exist` };
    }

    // Check rank hierarchy - assigner must have higher rank than the role being assigned
    const assignerRole = await this.getUserRoleObject(organizationId, assignerId);
    if (!assignerRole || assignerRole.rank <= hrRole.rank) {
      return { valid: false, reason: 'Cannot assign role with equal or higher rank' };
    }

    return { valid: true };
  }
}
