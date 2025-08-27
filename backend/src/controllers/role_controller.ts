import { Request, Response } from 'express';
import { RoleModel } from '../models/role_model';
import { OrganizationModel } from '../models/organization_model';
import {
  CreateRoleData,
  UpdateRoleData,
  ORGANIZATION_PERMISSIONS,
} from '../types/role';
import { User } from '../types/user';
import logger from '../config/logger';
import db from '../config/database';

import { getUserFromRequest } from '../utils/user-casting';
export class RoleController {
  private roleModel = new RoleModel();
  private organizationModel = new OrganizationModel();

  /**
   * Helper method to convert spectrum ID to internal organization ID
   */
  private async getOrganizationIdFromSpectrum(spectrumId: string): Promise<string | null> {
    const organization = await db('organizations')
      .select('id')
      .where('rsi_org_id', spectrumId)
      .first();
    
    return organization?.id || null;
  }

  /**
   * Get all roles for an organization
   */
  async getOrganizationRoles(req: Request, res: Response): Promise<void> {
    try {
      const { spectrumId } = req.params;
      const userId = getUserFromRequest(req)?.id;

      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Convert spectrum ID to internal ID
      const organizationId = await this.getOrganizationIdFromSpectrum(spectrumId);
      if (!organizationId) {
        res.status(404).json({ error: 'Organization not found' });
        return;
      }

      // Check if user is a member of the organization
      const isMember = await this.organizationModel.isUserMember(
        organizationId,
        userId
      );
      if (!isMember) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      // Ensure owner role has all permissions before returning roles
      await this.roleModel.ensureOwnerRoleHasAllPermissions(organizationId);
      
      const roles = await this.roleModel.getRolesByOrganization(organizationId);
      res.json({ roles });
    } catch (error) {
      logger.error('Error getting organization roles:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Create a new role
   */
  async createRole(req: Request, res: Response): Promise<void> {
    try {
      const { spectrumId } = req.params;
      const userId = getUserFromRequest(req)?.id;
      const { name, description, rank, permissions } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Convert spectrum ID to internal ID
      const organizationId = await this.getOrganizationIdFromSpectrum(spectrumId);
      if (!organizationId) {
        res.status(404).json({ error: 'Organization not found' });
        return;
      }

      // Check if user has permission to create roles
      const canCreateRoles = await this.roleModel.userHasPermission(
        organizationId,
        userId,
        ORGANIZATION_PERMISSIONS.CREATE_ROLES
      );

      if (!canCreateRoles) {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }

      // Validate input
      if (!name || !rank) {
        res.status(400).json({ error: 'Name and rank are required' });
        return;
      }

      // Prevent creating roles named "Owner" - this name is reserved
      if (name === 'Owner') {
        res.status(400).json({ error: 'Role name "Owner" is reserved and cannot be used for custom roles' });
        return;
      }

      // Check if role name already exists
      const existingRole = await this.roleModel.findByOrganizationAndName(
        organizationId,
        name
      );
      if (existingRole) {
        res.status(409).json({ error: 'Role name already exists' });
        return;
      }

      const roleData: CreateRoleData = {
        organization_id: organizationId,
        name,
        description,
        rank: parseInt(rank),
        permissions: permissions || [],
      };

      const role = await this.roleModel.createRole(roleData);
      res.status(201).json({ role });
    } catch (error) {
      logger.error('Error creating role:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Update a role
   */
  async updateRole(req: Request, res: Response): Promise<void> {
    try {
      const { spectrumId, roleId } = req.params;
      const userId = getUserFromRequest(req)?.id;
      const { name, description, rank, permissions, is_active } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Convert spectrum ID to internal ID
      const organizationId = await this.getOrganizationIdFromSpectrum(spectrumId);
      if (!organizationId) {
        res.status(404).json({ error: 'Organization not found' });
        return;
      }

      // Check if user has permission to update roles
      const canUpdateRoles = await this.roleModel.userHasPermission(
        organizationId,
        userId,
        ORGANIZATION_PERMISSIONS.UPDATE_ROLES
      );

      if (!canUpdateRoles) {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }

      // Check if role exists in the organization
      const existingRole = await this.roleModel.findById(roleId);
      if (!existingRole || existingRole.organization_id !== organizationId) {
        res.status(404).json({ error: 'Role not found' });
        return;
      }

      // Prevent editing non-editable roles (like the original owner role)
      if (!existingRole.is_editable) {
        res.status(403).json({ 
          error: 'This role cannot be edited' 
        });
        return;
      }

      // Check if role name already exists (if name is being changed)
      if (name && name !== existingRole.name) {
        const nameExists = await this.roleModel.findByOrganizationAndName(
          organizationId,
          name
        );
        if (nameExists) {
          res.status(409).json({ error: 'Role name already exists' });
          return;
        }
      }

      const updateData: UpdateRoleData = {
        name,
        description,
        rank: rank ? parseInt(rank) : undefined,
        permissions,
        is_active,
      };

      const role = await this.roleModel.updateRole(roleId, updateData);
      if (!role) {
        res.status(404).json({ error: 'Role not found' });
        return;
      }

      res.json({ role });
    } catch (error) {
      logger.error('Error updating role:', error);
      if (
        error instanceof Error &&
        error.message.includes('cannot be edited')
      ) {
        res.status(403).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Delete a role
   */
  async deleteRole(req: Request, res: Response): Promise<void> {
    try {
      const { spectrumId, roleId } = req.params;
      const userId = getUserFromRequest(req)?.id;

      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Convert spectrum ID to internal ID
      const organizationId = await this.getOrganizationIdFromSpectrum(spectrumId);
      if (!organizationId) {
        res.status(404).json({ error: 'Organization not found' });
        return;
      }

      // Check if user has permission to delete roles
      const canDeleteRoles = await this.roleModel.userHasPermission(
        organizationId,
        userId,
        ORGANIZATION_PERMISSIONS.DELETE_ROLES
      );

      if (!canDeleteRoles) {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }

      // Check if role exists in the organization
      const existingRole = await this.roleModel.findById(roleId);
      if (!existingRole || existingRole.organization_id !== organizationId) {
        res.status(404).json({ error: 'Role not found' });
        return;
      }

      const deleted = await this.roleModel.deleteRole(roleId);
      if (!deleted) {
        res.status(404).json({ error: 'Role not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      logger.error('Error deleting role:', error);
      if (
        error instanceof Error &&
        (error.message.includes('cannot be deleted') ||
          error.message.includes('assigned to members'))
      ) {
        res.status(403).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Assign a role to a user
   */
  async assignRole(req: Request, res: Response): Promise<void> {
    try {
      const { spectrumId } = req.params;
      const userId = getUserFromRequest(req)?.id;
      const { targetUserId, roleId } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Convert spectrum ID to internal ID
      const organizationId = await this.getOrganizationIdFromSpectrum(spectrumId);
      if (!organizationId) {
        res.status(404).json({ error: 'Organization not found' });
        return;
      }

      // Check if user has permission to assign roles
      const canAssignRoles = await this.roleModel.userHasPermission(
        organizationId,
        userId,
        ORGANIZATION_PERMISSIONS.ASSIGN_ROLES
      );

      if (!canAssignRoles) {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }

      // Check if user can manage the target user's role
      const canManage = await this.roleModel.canManageUserRole(
        organizationId,
        userId,
        targetUserId
      );

      if (!canManage) {
        res.status(403).json({ error: 'Cannot assign role to this user' });
        return;
      }

      // Check if target user is a member of the organization
      const isMember = await this.organizationModel.isUserMember(
        organizationId,
        targetUserId
      );
      if (!isMember) {
        res
          .status(404)
          .json({ error: 'User is not a member of this organization' });
        return;
      }

      const success = await this.roleModel.assignRoleToUser(
        organizationId,
        targetUserId,
        roleId
      );
      if (!success) {
        res.status(400).json({ error: 'Failed to assign role' });
        return;
      }

      res.json({ success: true });
    } catch (error) {
      logger.error('Error assigning role:', error);
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get organization members with their roles
   * Hidden members are only visible to other members of the same organization
   */
  async getOrganizationMembers(req: Request, res: Response): Promise<void> {
    try {
      const { spectrumId } = req.params;
      const userId = getUserFromRequest(req)?.id; // May be undefined for unauthenticated users
      const { limit = 50, offset = 0 } = req.query;

      // Convert spectrum ID to internal ID
      const organization = await db('organizations')
        .select('id')
        .where('rsi_org_id', spectrumId)
        .first();

      if (!organization) {
        res.status(404).json({
          success: false,
          error: 'Organization not found',
        });
        return;
      }

      const members = await this.roleModel.getOrganizationMembers(
        organization.id,
        {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          viewerUserId: userId, // Pass the viewer's ID to determine visibility
        }
      );

      res.json({ members });
    } catch (error) {
      logger.error('Error getting organization members:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Remove a user from an organization
   */
  async removeMember(req: Request, res: Response): Promise<void> {
    try {
      const { spectrumId, userId: targetUserId } = req.params;
      const userId = getUserFromRequest(req)?.id;

      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Convert spectrum ID to internal ID
      const organizationId = await this.getOrganizationIdFromSpectrum(spectrumId);
      if (!organizationId) {
        res.status(404).json({ error: 'Organization not found' });
        return;
      }

      // Check if user has permission to manage members
      const canManageMembers = await this.roleModel.userHasPermission(
        organizationId,
        userId,
        ORGANIZATION_PERMISSIONS.MANAGE_MEMBERS
      );

      if (!canManageMembers) {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }

      // Check if user can manage the target user
      const canManage = await this.roleModel.canManageUserRole(
        organizationId,
        userId,
        targetUserId
      );

      if (!canManage) {
        res.status(403).json({ error: 'Cannot remove this user' });
        return;
      }

      const success = await this.roleModel.removeUserFromOrganization(
        organizationId,
        targetUserId
      );
      if (!success) {
        res.status(404).json({ error: 'User not found in organization' });
        return;
      }

      res.json({ success: true });
    } catch (error) {
      logger.error('Error removing member:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get available permissions
   */
  async getAvailablePermissions(req: Request, res: Response): Promise<void> {
    try {
      res.json({ permissions: ORGANIZATION_PERMISSIONS });
    } catch (error) {
      logger.error('Error getting available permissions:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
