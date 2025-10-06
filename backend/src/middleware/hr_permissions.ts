import { Request, Response, NextFunction } from 'express';
import { RoleModel } from '../models/role_model';
import { ORGANIZATION_PERMISSIONS } from '../types/role';
import logger from '../config/logger';
import { getUserFromRequest } from '../utils/user-casting';

export class HRPermissionHelper {
  private static roleModel = new RoleModel();

  /**
   * Check if user has HR Manager permissions
   */
  static async isHRManager(
    organizationId: string,
    userId: string
  ): Promise<boolean> {
    return await this.roleModel.userIsHRManager(organizationId, userId);
  }

  /**
   * Check if user has Recruiter permissions
   */
  static async isRecruiter(
    organizationId: string,
    userId: string
  ): Promise<boolean> {
    return await this.roleModel.userIsRecruiter(organizationId, userId);
  }

  /**
   * Check if user has Supervisor permissions
   */
  static async isSupervisor(
    organizationId: string,
    userId: string
  ): Promise<boolean> {
    return await this.roleModel.userIsSupervisor(organizationId, userId);
  }

  /**
   * Check if user has any HR role
   */
  static async hasHRRole(
    organizationId: string,
    userId: string
  ): Promise<boolean> {
    return await this.roleModel.userHasHRRole(organizationId, userId);
  }

  /**
   * Check if user has specific HR permission
   */
  static async hasHRPermission(
    organizationId: string,
    userId: string,
    permission: string
  ): Promise<boolean> {
    return await this.roleModel.userHasPermission(organizationId, userId, permission);
  }

  /**
   * Get user's HR permissions for data filtering
   */
  static async getUserHRPermissions(
    organizationId: string,
    userId: string
  ): Promise<{
    canManageApplications: boolean;
    canViewApplications: boolean;
    canProcessApplications: boolean;
    canManageOnboarding: boolean;
    canViewOnboarding: boolean;
    canManagePerformance: boolean;
    canConductReviews: boolean;
    canManageSkills: boolean;
    canVerifySkills: boolean;
    canManageDocuments: boolean;
    canViewAnalytics: boolean;
    isHRManager: boolean;
    isRecruiter: boolean;
    isSupervisor: boolean;
  }> {
    const [
      canManageApplications,
      canViewApplications,
      canProcessApplications,
      canManageOnboarding,
      canViewOnboarding,
      canManagePerformance,
      canConductReviews,
      canManageSkills,
      canVerifySkills,
      canManageDocuments,
      canViewAnalytics,
      isHRManager,
      isRecruiter,
      isSupervisor,
    ] = await Promise.all([
      this.roleModel.userCanManageHRApplications(organizationId, userId),
      this.roleModel.userCanViewHRApplications(organizationId, userId),
      this.roleModel.userCanProcessHRApplications(organizationId, userId),
      this.roleModel.userCanManageHROnboarding(organizationId, userId),
      this.roleModel.userCanViewHROnboarding(organizationId, userId),
      this.roleModel.userCanManageHRPerformance(organizationId, userId),
      this.roleModel.userCanConductPerformanceReviews(organizationId, userId),
      this.roleModel.userCanManageHRSkills(organizationId, userId),
      this.roleModel.userCanVerifySkills(organizationId, userId),
      this.roleModel.userCanManageHRDocuments(organizationId, userId),
      this.roleModel.userCanViewHRAnalytics(organizationId, userId),
      this.roleModel.userIsHRManager(organizationId, userId),
      this.roleModel.userIsRecruiter(organizationId, userId),
      this.roleModel.userIsSupervisor(organizationId, userId),
    ]);

    return {
      canManageApplications,
      canViewApplications,
      canProcessApplications,
      canManageOnboarding,
      canViewOnboarding,
      canManagePerformance,
      canConductReviews,
      canManageSkills,
      canVerifySkills,
      canManageDocuments,
      canViewAnalytics,
      isHRManager,
      isRecruiter,
      isSupervisor,
    };
  }

  /**
   * Log HR system access for audit purposes
   */
  static async logHRAccess(
    userId: string,
    organizationId: string,
    action: string,
    resource: string,
    resourceId?: string,
    success: boolean = true,
    details?: any
  ): Promise<void> {
    try {
      const logData = {
        user_id: userId,
        organization_id: organizationId,
        action,
        resource,
        resource_id: resourceId,
        success,
        details: details ? JSON.stringify(details) : null,
        ip_address: null, // Will be set by middleware if available
        user_agent: null, // Will be set by middleware if available
        timestamp: new Date(),
      };

      logger.info('HR System Access', logData);
      
      // TODO: Store in dedicated audit log table if needed for compliance
      // await db('hr_audit_logs').insert(logData);
    } catch (error) {
      logger.error('Failed to log HR access:', error);
    }
  }
}

// Middleware factory for HR permissions
export const requireHRPermission = (requiredPermission: string) => {
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

      const hasPermission = await HRPermissionHelper.hasHRPermission(
        organizationId,
        userId,
        requiredPermission
      );

      if (!hasPermission) {
        // Log failed access attempt
        await HRPermissionHelper.logHRAccess(
          userId,
          organizationId,
          'ACCESS_DENIED',
          req.route?.path || req.path,
          undefined,
          false,
          { required_permission: requiredPermission }
        );

        res.status(403).json({
          success: false,
          error: `Insufficient permissions. Required: ${requiredPermission}`,
        });
        return;
      }

      // Log successful access
      await HRPermissionHelper.logHRAccess(
        userId,
        organizationId,
        'ACCESS_GRANTED',
        req.route?.path || req.path,
        undefined,
        true,
        { required_permission: requiredPermission }
      );

      // Add HR permissions to request for use in controller
      req.hrPermissions = await HRPermissionHelper.getUserHRPermissions(
        organizationId,
        userId
      );

      next();
    } catch (error) {
      logger.error('Error in requireHRPermission middleware:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  };
};

// Middleware factory for HR role-based access
export const requireHRRole = (roles: ('HR_MANAGER' | 'RECRUITER' | 'SUPERVISOR')[]) => {
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

      const userPermissions = await HRPermissionHelper.getUserHRPermissions(
        organizationId,
        userId
      );

      const hasRequiredRole = roles.some(role => {
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
        // Log failed access attempt
        await HRPermissionHelper.logHRAccess(
          userId,
          organizationId,
          'ROLE_ACCESS_DENIED',
          req.route?.path || req.path,
          undefined,
          false,
          { required_roles: roles }
        );

        res.status(403).json({
          success: false,
          error: `Insufficient role permissions. Required one of: ${roles.join(', ')}`,
        });
        return;
      }

      // Log successful access
      await HRPermissionHelper.logHRAccess(
        userId,
        organizationId,
        'ROLE_ACCESS_GRANTED',
        req.route?.path || req.path,
        undefined,
        true,
        { required_roles: roles }
      );

      // Add HR permissions to request for use in controller
      req.hrPermissions = userPermissions;

      next();
    } catch (error) {
      logger.error('Error in requireHRRole middleware:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  };
};

// Middleware for data filtering based on HR permissions
export const addHRDataFilter = () => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { organizationId } = req.params;
      const userId = getUserFromRequest(req)?.id;

      if (!userId || !organizationId) {
        next();
        return;
      }

      // Add HR permissions to request for data filtering
      req.hrPermissions = await HRPermissionHelper.getUserHRPermissions(
        organizationId,
        userId
      );

      // Add data filtering logic based on role
      req.hrDataFilter = {
        // Supervisors can only see their direct reports
        limitToDirectReports: req.hrPermissions?.isSupervisor && !req.hrPermissions?.isHRManager,
        // Recruiters can see all applications but limited performance data
        limitPerformanceData: req.hrPermissions?.isRecruiter && !req.hrPermissions?.isHRManager,
        // HR Managers can see all data
        fullAccess: req.hrPermissions?.isHRManager,
      };

      next();
    } catch (error) {
      logger.error('Error in addHRDataFilter middleware:', error);
      next(); // Continue without filtering on error
    }
  };
};

// Specific middleware for common HR use cases

// Application management
export const requireApplicationManagement = requireHRPermission(
  ORGANIZATION_PERMISSIONS.MANAGE_HR_APPLICATIONS
);
export const requireApplicationView = requireHRPermission(
  ORGANIZATION_PERMISSIONS.VIEW_HR_APPLICATIONS
);
export const requireApplicationProcessing = requireHRPermission(
  ORGANIZATION_PERMISSIONS.PROCESS_HR_APPLICATIONS
);

// Onboarding management
export const requireOnboardingManagement = requireHRPermission(
  ORGANIZATION_PERMISSIONS.MANAGE_HR_ONBOARDING
);
export const requireOnboardingView = requireHRPermission(
  ORGANIZATION_PERMISSIONS.VIEW_HR_ONBOARDING
);

// Performance management
export const requirePerformanceManagement = requireHRPermission(
  ORGANIZATION_PERMISSIONS.MANAGE_HR_PERFORMANCE
);
export const requirePerformanceReviewConduct = requireHRPermission(
  ORGANIZATION_PERMISSIONS.CONDUCT_PERFORMANCE_REVIEWS
);

// Skills management
export const requireSkillsManagement = requireHRPermission(
  ORGANIZATION_PERMISSIONS.MANAGE_HR_SKILLS
);
export const requireSkillsVerification = requireHRPermission(
  ORGANIZATION_PERMISSIONS.VERIFY_SKILLS
);

// Document management
export const requireDocumentManagement = requireHRPermission(
  ORGANIZATION_PERMISSIONS.MANAGE_HR_DOCUMENTS
);
export const requireDocumentView = requireHRPermission(
  ORGANIZATION_PERMISSIONS.VIEW_HR_DOCUMENTS
);

// Analytics
export const requireHRAnalytics = requireHRPermission(
  ORGANIZATION_PERMISSIONS.VIEW_HR_ANALYTICS
);

// Role-based middleware
export const requireHRManagerRole = requireHRRole(['HR_MANAGER']);
export const requireRecruiterRole = requireHRRole(['RECRUITER']);
export const requireSupervisorRole = requireHRRole(['SUPERVISOR']);
export const requireAnyHRRole = requireHRRole(['HR_MANAGER', 'RECRUITER', 'SUPERVISOR']);

// Combined middleware for common workflows
export const requireHRManagerOrRecruiter = requireHRRole(['HR_MANAGER', 'RECRUITER']);
export const requireHRManagerOrSupervisor = requireHRRole(['HR_MANAGER', 'SUPERVISOR']);