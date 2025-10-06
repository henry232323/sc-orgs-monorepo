import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Mock dependencies
jest.mock('../config/logger');
jest.mock('../utils/user-casting', () => ({
  getUserFromRequest: jest.fn(),
}));

// Import after mocking
import {
  requireHRPermission,
  requireHRRole,
  addHRDataFilter,
  requireApplicationManagement,
  requireHRManagerRole,
  HRPermissionHelper,
} from '../middleware/hr_permissions';
import { ORGANIZATION_PERMISSIONS } from '../types/role';
import { getUserFromRequest } from '../utils/user-casting';

describe('HR Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let testUserId: string;
  let testOrganizationId: string;

  beforeAll(() => {
    testUserId = uuidv4();
    testOrganizationId = uuidv4();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockReq = {
      params: { organizationId: testOrganizationId },
      route: { path: '/test' },
      path: '/test',
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis() as any,
      json: jest.fn() as any,
    };
    
    mockNext = jest.fn();

    (getUserFromRequest as jest.MockedFunction<any>).mockReturnValue({
      id: testUserId,
    });
  });

  describe('requireHRPermission middleware', () => {
    it('should allow access with valid permission', async () => {
      jest.spyOn(HRPermissionHelper, 'hasHRPermission').mockResolvedValue(true);
      jest.spyOn(HRPermissionHelper, 'getUserHRPermissions').mockResolvedValue({
        canManageApplications: true,
        isHRManager: true,
      } as any);
      jest.spyOn(HRPermissionHelper, 'logHRAccess').mockResolvedValue();

      const middleware = requireHRPermission(ORGANIZATION_PERMISSIONS.MANAGE_HR_APPLICATIONS);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(HRPermissionHelper.hasHRPermission).toHaveBeenCalledWith(
        testOrganizationId,
        testUserId,
        ORGANIZATION_PERMISSIONS.MANAGE_HR_APPLICATIONS
      );
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockReq.hrPermissions).toBeDefined();
    });

    it('should deny access without authentication', async () => {
      (getUserFromRequest as jest.MockedFunction<any>).mockReturnValue(null);

      const middleware = requireHRPermission(ORGANIZATION_PERMISSIONS.MANAGE_HR_APPLICATIONS);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should deny access without organization ID', async () => {
      mockReq.params = {};

      const middleware = requireHRPermission(ORGANIZATION_PERMISSIONS.MANAGE_HR_APPLICATIONS);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Organization ID is required',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should deny access without required permission', async () => {
      jest.spyOn(HRPermissionHelper, 'hasHRPermission').mockResolvedValue(false);
      jest.spyOn(HRPermissionHelper, 'logHRAccess').mockResolvedValue();

      const middleware = requireHRPermission(ORGANIZATION_PERMISSIONS.MANAGE_HR_APPLICATIONS);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: `Insufficient permissions. Required: ${ORGANIZATION_PERMISSIONS.MANAGE_HR_APPLICATIONS}`,
      });
      expect(mockNext).not.toHaveBeenCalled();
      expect(HRPermissionHelper.logHRAccess).toHaveBeenCalledWith(
        testUserId,
        testOrganizationId,
        'ACCESS_DENIED',
        '/test',
        undefined,
        false,
        { required_permission: ORGANIZATION_PERMISSIONS.MANAGE_HR_APPLICATIONS }
      );
    });

    it('should handle errors gracefully', async () => {
      jest.spyOn(HRPermissionHelper, 'hasHRPermission').mockRejectedValue(new Error('Database error'));

      const middleware = requireHRPermission(ORGANIZATION_PERMISSIONS.MANAGE_HR_APPLICATIONS);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Internal server error',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireHRRole middleware', () => {
    it('should allow access with valid HR role', async () => {
      jest.spyOn(HRPermissionHelper, 'getUserHRPermissions').mockResolvedValue({
        isHRManager: true,
        isRecruiter: false,
        isSupervisor: false,
      } as any);
      jest.spyOn(HRPermissionHelper, 'logHRAccess').mockResolvedValue();

      const middleware = requireHRRole(['HR_MANAGER']);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockReq.hrPermissions).toBeDefined();
    });

    it('should allow access with any of multiple valid roles', async () => {
      jest.spyOn(HRPermissionHelper, 'getUserHRPermissions').mockResolvedValue({
        isHRManager: false,
        isRecruiter: true,
        isSupervisor: false,
      } as any);
      jest.spyOn(HRPermissionHelper, 'logHRAccess').mockResolvedValue();

      const middleware = requireHRRole(['HR_MANAGER', 'RECRUITER']);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should deny access without required role', async () => {
      jest.spyOn(HRPermissionHelper, 'getUserHRPermissions').mockResolvedValue({
        isHRManager: false,
        isRecruiter: false,
        isSupervisor: false,
      } as any);
      jest.spyOn(HRPermissionHelper, 'logHRAccess').mockResolvedValue();

      const middleware = requireHRRole(['HR_MANAGER']);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Insufficient role permissions. Required one of: HR_MANAGER',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should deny access without authentication', async () => {
      (getUserFromRequest as jest.MockedFunction<any>).mockReturnValue(null);

      const middleware = requireHRRole(['HR_MANAGER']);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      jest.spyOn(HRPermissionHelper, 'getUserHRPermissions').mockRejectedValue(new Error('Database error'));

      const middleware = requireHRRole(['HR_MANAGER']);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Internal server error',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('addHRDataFilter middleware', () => {
    it('should add HR permissions and data filter to request', async () => {
      const mockPermissions = {
        isHRManager: true,
        isSupervisor: false,
        isRecruiter: false,
        canManageApplications: true,
      };

      jest.spyOn(HRPermissionHelper, 'getUserHRPermissions').mockResolvedValue(mockPermissions as any);

      const middleware = addHRDataFilter();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.hrPermissions).toEqual(mockPermissions);
      expect(mockReq.hrDataFilter).toEqual({
        limitToDirectReports: false,
        limitPerformanceData: false,
        fullAccess: true,
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should set supervisor data filter correctly', async () => {
      const mockPermissions = {
        isHRManager: false,
        isSupervisor: true,
        isRecruiter: false,
      };

      jest.spyOn(HRPermissionHelper, 'getUserHRPermissions').mockResolvedValue(mockPermissions as any);

      const middleware = addHRDataFilter();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.hrDataFilter).toEqual({
        limitToDirectReports: true,
        limitPerformanceData: false,
        fullAccess: false,
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should set recruiter data filter correctly', async () => {
      const mockPermissions = {
        isHRManager: false,
        isSupervisor: false,
        isRecruiter: true,
      };

      jest.spyOn(HRPermissionHelper, 'getUserHRPermissions').mockResolvedValue(mockPermissions as any);

      const middleware = addHRDataFilter();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.hrDataFilter).toEqual({
        limitToDirectReports: false,
        limitPerformanceData: true,
        fullAccess: false,
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue without filtering if no user ID', async () => {
      (getUserFromRequest as jest.MockedFunction<any>).mockReturnValue(null);

      const middleware = addHRDataFilter();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.hrPermissions).toBeUndefined();
      expect(mockReq.hrDataFilter).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue without filtering if no organization ID', async () => {
      mockReq.params = {};

      const middleware = addHRDataFilter();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.hrPermissions).toBeUndefined();
      expect(mockReq.hrDataFilter).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue on error', async () => {
      jest.spyOn(HRPermissionHelper, 'getUserHRPermissions').mockRejectedValue(new Error('Database error'));

      const middleware = addHRDataFilter();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('Specific middleware functions', () => {
    it('should create requireApplicationManagement middleware correctly', async () => {
      jest.spyOn(HRPermissionHelper, 'hasHRPermission').mockResolvedValue(true);
      jest.spyOn(HRPermissionHelper, 'getUserHRPermissions').mockResolvedValue({} as any);
      jest.spyOn(HRPermissionHelper, 'logHRAccess').mockResolvedValue();

      await requireApplicationManagement(mockReq as Request, mockRes as Response, mockNext);

      expect(HRPermissionHelper.hasHRPermission).toHaveBeenCalledWith(
        testOrganizationId,
        testUserId,
        ORGANIZATION_PERMISSIONS.MANAGE_HR_APPLICATIONS
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('should create requireHRManagerRole middleware correctly', async () => {
      jest.spyOn(HRPermissionHelper, 'getUserHRPermissions').mockResolvedValue({
        isHRManager: true,
        isRecruiter: false,
        isSupervisor: false,
      } as any);
      jest.spyOn(HRPermissionHelper, 'logHRAccess').mockResolvedValue();

      await requireHRManagerRole(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Audit logging', () => {
    it('should log successful access attempts', async () => {
      jest.spyOn(HRPermissionHelper, 'hasHRPermission').mockResolvedValue(true);
      jest.spyOn(HRPermissionHelper, 'getUserHRPermissions').mockResolvedValue({} as any);
      jest.spyOn(HRPermissionHelper, 'logHRAccess').mockResolvedValue();

      const middleware = requireHRPermission(ORGANIZATION_PERMISSIONS.MANAGE_HR_APPLICATIONS);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(HRPermissionHelper.logHRAccess).toHaveBeenCalledWith(
        testUserId,
        testOrganizationId,
        'ACCESS_GRANTED',
        '/test',
        undefined,
        true,
        { required_permission: ORGANIZATION_PERMISSIONS.MANAGE_HR_APPLICATIONS }
      );
    });

    it('should log failed access attempts', async () => {
      jest.spyOn(HRPermissionHelper, 'hasHRPermission').mockResolvedValue(false);
      jest.spyOn(HRPermissionHelper, 'logHRAccess').mockResolvedValue();

      const middleware = requireHRPermission(ORGANIZATION_PERMISSIONS.MANAGE_HR_APPLICATIONS);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(HRPermissionHelper.logHRAccess).toHaveBeenCalledWith(
        testUserId,
        testOrganizationId,
        'ACCESS_DENIED',
        '/test',
        undefined,
        false,
        { required_permission: ORGANIZATION_PERMISSIONS.MANAGE_HR_APPLICATIONS }
      );
    });

    it('should log role-based access attempts', async () => {
      jest.spyOn(HRPermissionHelper, 'getUserHRPermissions').mockResolvedValue({
        isHRManager: true,
        isRecruiter: false,
        isSupervisor: false,
      } as any);
      jest.spyOn(HRPermissionHelper, 'logHRAccess').mockResolvedValue();

      const middleware = requireHRRole(['HR_MANAGER']);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(HRPermissionHelper.logHRAccess).toHaveBeenCalledWith(
        testUserId,
        testOrganizationId,
        'ROLE_ACCESS_GRANTED',
        '/test',
        undefined,
        true,
        { required_roles: ['HR_MANAGER'] }
      );
    });

    it('should log failed role-based access attempts', async () => {
      jest.spyOn(HRPermissionHelper, 'getUserHRPermissions').mockResolvedValue({
        isHRManager: false,
        isRecruiter: false,
        isSupervisor: false,
      } as any);
      jest.spyOn(HRPermissionHelper, 'logHRAccess').mockResolvedValue();

      const middleware = requireHRRole(['HR_MANAGER']);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(HRPermissionHelper.logHRAccess).toHaveBeenCalledWith(
        testUserId,
        testOrganizationId,
        'ROLE_ACCESS_DENIED',
        '/test',
        undefined,
        false,
        { required_roles: ['HR_MANAGER'] }
      );
    });
  });

  describe('Request enhancement', () => {
    it('should add hrPermissions to request object', async () => {
      const mockPermissions = {
        canManageApplications: true,
        canViewApplications: true,
        isHRManager: true,
        isRecruiter: false,
        isSupervisor: false,
      };

      jest.spyOn(HRPermissionHelper, 'hasHRPermission').mockResolvedValue(true);
      jest.spyOn(HRPermissionHelper, 'getUserHRPermissions').mockResolvedValue(mockPermissions as any);
      jest.spyOn(HRPermissionHelper, 'logHRAccess').mockResolvedValue();

      const middleware = requireHRPermission(ORGANIZATION_PERMISSIONS.MANAGE_HR_APPLICATIONS);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.hrPermissions).toEqual(mockPermissions);
    });

    it('should add hrDataFilter to request object', async () => {
      const mockPermissions = {
        isHRManager: false,
        isSupervisor: true,
        isRecruiter: false,
      };

      jest.spyOn(HRPermissionHelper, 'getUserHRPermissions').mockResolvedValue(mockPermissions as any);

      const middleware = addHRDataFilter();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.hrDataFilter).toEqual({
        limitToDirectReports: true,
        limitPerformanceData: false,
        fullAccess: false,
      });
    });
  });
});