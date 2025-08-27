import { Request, Response, NextFunction } from 'express';
import { EventModel } from '../models/event_model';
import { OrganizationModel } from '../models/organization_model';
import { RoleModel } from '../models/role_model';
import logger from '../config/logger';
import db from '../config/database';

import { getUserFromRequest } from '../utils/user-casting';
// Permission helper functions for use in controllers
export class PermissionHelper {
  private static eventModel = new EventModel();
  private static organizationModel = new OrganizationModel();
  private static roleModel = new RoleModel();

  /**
   * Check if user can perform a specific action on an event
   */
  static async canUserManageEvent(
    eventId: string,
    userId: string,
    requiredPermission?: string
  ): Promise<{ canManage: boolean; event?: any; reason?: string }> {
    try {
      const event = await this.eventModel.findById(eventId);
      if (!event) {
        return { canManage: false, reason: 'Event not found' };
      }

      // Event creator can always manage their events
      if (event.created_by === userId) {
        return { canManage: true, event };
      }

      // For orgless events, only the creator can manage
      if (!event.organization_id) {
        return {
          canManage: false,
          event,
          reason: 'Only the event creator can manage orgless events',
        };
      }

      // For organization events, check organization permissions
      const orgPermission = await this.canUserManageOrganization(
        event.organization_id,
        userId,
        requiredPermission
      );

      return {
        canManage: orgPermission.canManage,
        event,
        reason: orgPermission.reason,
      };
    } catch (error) {
      logger.error('Error checking event management permission:', error);
      return { canManage: false, reason: 'Internal server error' };
    }
  }

  /**
   * Check if user can perform a specific action on an organization
   */
  static async canUserManageOrganization(
    organizationId: string,
    userId: string,
    requiredPermission?: string
  ): Promise<{
    canManage: boolean;
    organization?: any;
    userRole?: string;
    reason?: string;
  }> {
    try {
      const organization =
        await this.organizationModel.findById(organizationId);
      if (!organization) {
        return { canManage: false, reason: 'Organization not found' };
      }

      // Organization owner always has all permissions
      if (organization.owner_id === userId) {
        return {
          canManage: true,
          organization,
          userRole: 'Owner',
        };
      }

      // Get user's role in the organization
      const userRole = await this.roleModel.getUserRole(organizationId, userId);
      if (!userRole) {
        return {
          canManage: false,
          organization,
          reason: 'User is not a member of this organization',
        };
      }

      // If no specific permission required, any member can manage
      if (!requiredPermission) {
        return {
          canManage: true,
          organization,
          userRole,
        };
      }

      // Check if user has the required permission
      const hasPermission = await this.roleModel.userHasPermission(
        organizationId,
        userId,
        requiredPermission
      );

      return {
        canManage: hasPermission,
        organization,
        userRole,
        reason: hasPermission
          ? undefined
          : `Missing required permission: ${requiredPermission}`,
      };
    } catch (error) {
      logger.error('Error checking organization management permission:', error);
      return { canManage: false, reason: 'Internal server error' };
    }
  }

  /**
   * Check if user is the owner of an event (creator or org owner)
   */
  static async isEventOwner(eventId: string, userId: string): Promise<boolean> {
    const result = await this.canUserManageEvent(eventId, userId);
    return result.canManage;
  }

  /**
   * Check if user is the owner of an organization
   */
  static async isOrganizationOwner(
    organizationId: string,
    userId: string
  ): Promise<boolean> {
    try {
      const organization =
        await this.organizationModel.findById(organizationId);
      return organization?.owner_id === userId;
    } catch (error) {
      logger.error('Error checking organization ownership:', error);
      return false;
    }
  }

  /**
   * Check if user has a specific permission in an organization
   */
  static async hasOrganizationPermission(
    organizationId: string,
    userId: string,
    permission: string
  ): Promise<boolean> {
    const result = await this.canUserManageOrganization(
      organizationId,
      userId,
      permission
    );
    return result.canManage;
  }
}

// Middleware factory for event permissions
export const requireEventPermission = (requiredPermission?: string) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id: eventId } = req.params;
      const userId = getUserFromRequest(req)?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      if (!eventId) {
        res.status(400).json({
          success: false,
          error: 'Event ID is required',
        });
        return;
      }

      const result = await PermissionHelper.canUserManageEvent(
        eventId,
        userId,
        requiredPermission
      );

      if (!result.canManage) {
        res.status(result.reason === 'Event not found' ? 404 : 403).json({
          success: false,
          error: result.reason || 'Insufficient permissions',
        });
        return;
      }

      // Add event to request for use in controller
      req.event = result.event;
      next();
    } catch (error) {
      logger.error('Error in requireEventPermission middleware:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  };
};

// Middleware factory for organization permissions
export const requireOrganizationPermission = (requiredPermission?: string) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { organizationId } = req.params;
      const userId = getUserFromRequest(req)?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      if (!organizationId) {
        res.status(400).json({
          success: false,
          error: 'Organization ID is required',
        });
        return;
      }

      const result = await PermissionHelper.canUserManageOrganization(
        organizationId,
        userId,
        requiredPermission
      );

      if (!result.canManage) {
        res
          .status(result.reason === 'Organization not found' ? 404 : 403)
          .json({
            success: false,
            error: result.reason || 'Insufficient permissions',
          });
        return;
      }

      // Add organization and user role to request for use in controller
      req.organization = result.organization;
      req.userRole = result.userRole;
      next();
    } catch (error) {
      logger.error('Error in requireOrganizationPermission middleware:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  };
};

// Middleware for spectrum ID based organization permissions
export const requireOrganizationPermissionBySpectrum = (requiredPermission?: string) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { spectrumId } = req.params;
      const userId = getUserFromRequest(req)?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      if (!spectrumId) {
        res.status(400).json({
          success: false,
          error: 'Organization spectrum ID is required',
        });
        return;
      }

      // Get organization by spectrum ID
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

      const result = await PermissionHelper.canUserManageOrganization(
        organization.id,
        userId,
        requiredPermission
      );

      if (!result.canManage) {
        res
          .status(result.reason === 'Organization not found' ? 404 : 403)
          .json({
            success: false,
            error: result.reason || 'Insufficient permissions',
          });
        return;
      }

      // Add organization and user role to request for use in controller
      req.organization = result.organization;
      req.userRole = result.userRole;
      next();
    } catch (error) {
      logger.error('Error in requireOrganizationPermissionBySpectrum middleware:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  };
};

// Specific middleware for common use cases
export const requireEventOwnership = requireEventPermission();
export const requireEventEditPermission = requireEventPermission('EDIT_EVENTS');
export const requireEventDeletePermission =
  requireEventPermission('DELETE_EVENTS');
export const requireEventNotificationPermission =
  requireEventPermission('SEND_NOTIFICATIONS');

export const requireOrganizationOwnership = requireOrganizationPermission();
export const requireOrganizationEditPermission =
  requireOrganizationPermission('EDIT_ORGANIZATION');
export const requireOrganizationMemberManagement =
  requireOrganizationPermission('MANAGE_MEMBERS');
export const requireOrganizationRoleManagement =
  requireOrganizationPermission('MANAGE_ROLES');

// Organization permission that works with resolveOrganization middleware
export const requireResolvedOrganizationPermission = (requiredPermission?: string) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = getUserFromRequest(req)?.id;
      const organization = req.org;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      if (!organization) {
        res.status(400).json({
          success: false,
          error: 'Organization not resolved',
        });
        return;
      }

      // Check permissions using the resolved organization
      const permission = await PermissionHelper.canUserManageOrganization(
        organization.id,
        userId,
        requiredPermission
      );

      if (!permission.canManage) {
        res.status(403).json({
          success: false,
          error: permission.reason || 'Insufficient permissions',
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Error in requireResolvedOrganizationPermission middleware:', error);
      res.status(500).json({
        success: false,
        error: 'Permission check failed',
      });
    }
  };
};

// Analytics permission (works with resolveOrganization middleware)
export const requireOrganizationAnalyticsPermission = requireResolvedOrganizationPermission('VIEW_ANALYTICS');
