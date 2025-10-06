import { Request, Response } from 'express';
import { HRPermissionHelper } from '../middleware/hr_permissions';
import { getUserFromRequest } from './user-casting';
import logger from '../config/logger';

/**
 * Utility functions for HR permission validation in controllers
 */
export class HRPermissionValidators {
  /**
   * Validate user can access HR resource with specific permission
   */
  static async validateHRAccess(
    req: Request,
    res: Response,
    requiredPermission: string,
    resourceType: string,
    resourceId?: string
  ): Promise<{ valid: boolean; userId?: string; organizationId?: string }> {
    const userId = getUserFromRequest(req)?.id;
    const { organizationId } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return { valid: false };
    }

    if (!organizationId) {
      res.status(400).json({
        success: false,
        error: 'Organization ID is required',
      });
      return { valid: false };
    }

    try {
      const hasPermission = await HRPermissionHelper.hasHRPermission(
        organizationId,
        userId,
        requiredPermission
      );

      if (!hasPermission) {
        // Log access attempt
        await HRPermissionHelper.logHRAccess(
          userId,
          organizationId,
          'PERMISSION_DENIED',
          resourceType,
          resourceId,
          false,
          { required_permission: requiredPermission }
        );

        res.status(403).json({
          success: false,
          error: `Insufficient permissions for ${resourceType}`,
        });
        return { valid: false };
      }

      // Log successful access
      await HRPermissionHelper.logHRAccess(
        userId,
        organizationId,
        'PERMISSION_GRANTED',
        resourceType,
        resourceId,
        true,
        { required_permission: requiredPermission }
      );

      return { valid: true, userId, organizationId };
    } catch (error) {
      logger.error('Error validating HR access:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
      return { valid: false };
    }
  }

  /**
   * Validate user has specific HR role
   */
  static async validateHRRole(
    req: Request,
    res: Response,
    requiredRoles: ('HR_MANAGER' | 'RECRUITER' | 'SUPERVISOR')[],
    resourceType: string,
    resourceId?: string
  ): Promise<{ valid: boolean; userId?: string; organizationId?: string }> {
    const userId = getUserFromRequest(req)?.id;
    const { organizationId } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return { valid: false };
    }

    if (!organizationId) {
      res.status(400).json({
        success: false,
        error: 'Organization ID is required',
      });
      return { valid: false };
    }

    try {
      const userPermissions = await HRPermissionHelper.getUserHRPermissions(
        organizationId,
        userId
      );

      const hasRequiredRole = requiredRoles.some(role => {
        switch (role) {
          case 'HR_MANAGER':
            return userPermissions.isHRManager;
          case 'RECRUITER':
            return userPermissions.isRecruiter;
          case 'SUPERVISOR':
            return userPermissions.isSupervisor;
          default:
            return false;
        }
      });

      if (!hasRequiredRole) {
        // Log access attempt
        await HRPermissionHelper.logHRAccess(
          userId,
          organizationId,
          'ROLE_DENIED',
          resourceType,
          resourceId,
          false,
          { required_roles: requiredRoles }
        );

        res.status(403).json({
          success: false,
          error: `Insufficient role permissions for ${resourceType}`,
        });
        return { valid: false };
      }

      // Log successful access
      await HRPermissionHelper.logHRAccess(
        userId,
        organizationId,
        'ROLE_GRANTED',
        resourceType,
        resourceId,
        true,
        { required_roles: requiredRoles }
      );

      return { valid: true, userId, organizationId };
    } catch (error) {
      logger.error('Error validating HR role:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
      return { valid: false };
    }
  }

  /**
   * Check if user can access specific user's HR data (for supervisors)
   */
  static async canAccessUserHRData(
    organizationId: string,
    accessorUserId: string,
    targetUserId: string
  ): Promise<boolean> {
    try {
      const permissions = await HRPermissionHelper.getUserHRPermissions(
        organizationId,
        accessorUserId
      );

      // HR Managers can access all data
      if (permissions.isHRManager) {
        return true;
      }

      // Users can always access their own data
      if (accessorUserId === targetUserId) {
        return true;
      }

      // TODO: Implement supervisor-direct report relationship checking
      // For now, supervisors can access all data in their organization
      if (permissions.isSupervisor) {
        return true;
      }

      // Recruiters can access limited data for recruitment purposes
      if (permissions.isRecruiter) {
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error checking user HR data access:', error);
      return false;
    }
  }

  /**
   * Filter HR data based on user permissions
   */
  static filterHRDataByPermissions(
    data: any[],
    permissions: any,
    userId: string
  ): any[] {
    if (!permissions) {
      return [];
    }

    // HR Managers get full access
    if (permissions.isHRManager) {
      return data;
    }

    // Filter based on role and permissions
    return data.filter(item => {
      // Users can see their own data
      if (item.user_id === userId || item.reviewee_id === userId) {
        return true;
      }

      // Supervisors can see their direct reports (simplified for now)
      if (permissions.isSupervisor) {
        return true; // TODO: Implement proper direct report filtering
      }

      // Recruiters can see application-related data
      if (permissions.isRecruiter && item.type === 'application') {
        return true;
      }

      return false;
    });
  }

  /**
   * Validate bulk operation permissions
   */
  static async validateBulkOperationPermissions(
    req: Request,
    res: Response,
    requiredPermission: string,
    resourceType: string,
    resourceIds: string[]
  ): Promise<{ valid: boolean; userId?: string; organizationId?: string }> {
    const validation = await this.validateHRAccess(
      req,
      res,
      requiredPermission,
      resourceType
    );

    if (!validation.valid) {
      return validation;
    }

    // Log bulk operation
    await HRPermissionHelper.logHRAccess(
      validation.userId!,
      validation.organizationId!,
      'BULK_OPERATION',
      resourceType,
      undefined,
      true,
      {
        required_permission: requiredPermission,
        resource_count: resourceIds.length,
        resource_ids: resourceIds,
      }
    );

    return validation;
  }

  /**
   * Validate resource ownership or management permissions
   */
  static async validateResourceAccess(
    req: Request,
    res: Response,
    resourceType: string,
    resourceId: string,
    resourceOwnerId?: string,
    requiredPermission?: string
  ): Promise<{ valid: boolean; userId?: string; organizationId?: string }> {
    const userId = getUserFromRequest(req)?.id;
    const { organizationId } = req.params;

    if (!userId || !organizationId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return { valid: false };
    }

    try {
      // Check if user owns the resource
      if (resourceOwnerId && resourceOwnerId === userId) {
        await HRPermissionHelper.logHRAccess(
          userId,
          organizationId,
          'OWNER_ACCESS',
          resourceType,
          resourceId,
          true
        );
        return { valid: true, userId, organizationId };
      }

      // Check if user has management permission
      if (requiredPermission) {
        const hasPermission = await HRPermissionHelper.hasHRPermission(
          organizationId,
          userId,
          requiredPermission
        );

        if (hasPermission) {
          await HRPermissionHelper.logHRAccess(
            userId,
            organizationId,
            'PERMISSION_ACCESS',
            resourceType,
            resourceId,
            true,
            { required_permission: requiredPermission }
          );
          return { valid: true, userId, organizationId };
        }
      }

      // Access denied
      await HRPermissionHelper.logHRAccess(
        userId,
        organizationId,
        'ACCESS_DENIED',
        resourceType,
        resourceId,
        false,
        { required_permission: requiredPermission, resource_owner: resourceOwnerId }
      );

      res.status(403).json({
        success: false,
        error: `Insufficient permissions to access ${resourceType}`,
      });
      return { valid: false };
    } catch (error) {
      logger.error('Error validating resource access:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
      return { valid: false };
    }
  }
}

/**
 * Decorator for HR permission validation
 */
export function requireHRPermissionValidation(permission: string, resourceType: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (req: Request, res: Response, ...args: any[]) {
      const validation = await HRPermissionValidators.validateHRAccess(
        req,
        res,
        permission,
        resourceType
      );

      if (!validation.valid) {
        return; // Response already sent by validator
      }

      return method.apply(this, [req, res, ...args]);
    };

    return descriptor;
  };
}

/**
 * Decorator for HR role validation
 */
export function requireHRRoleValidation(
  roles: ('HR_MANAGER' | 'RECRUITER' | 'SUPERVISOR')[],
  resourceType: string
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (req: Request, res: Response, ...args: any[]) {
      const validation = await HRPermissionValidators.validateHRRole(
        req,
        res,
        roles,
        resourceType
      );

      if (!validation.valid) {
        return; // Response already sent by validator
      }

      return method.apply(this, [req, res, ...args]);
    };

    return descriptor;
  };
}