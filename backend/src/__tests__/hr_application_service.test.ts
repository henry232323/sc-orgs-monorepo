import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { HRApplicationService } from '../services/hr_application_service';
import { HRApplicationModel, HRApplication } from '../models/hr_application_model';
import { NotificationService } from '../services/notification_service';
import { v4 as uuidv4 } from 'uuid';

// Mock dependencies
jest.mock('../models/hr_application_model');
jest.mock('../services/notification_service');
jest.mock('../models/organization_model');
jest.mock('../config/logger');

const MockedHRApplicationModel = HRApplicationModel as jest.MockedClass<typeof HRApplicationModel>;
const MockedNotificationService = NotificationService as jest.MockedClass<typeof NotificationService>;

describe('HRApplicationService', () => {
  let service: HRApplicationService;
  let mockApplicationModel: jest.Mocked<HRApplicationModel>;
  let mockNotificationService: jest.Mocked<NotificationService>;

  const testOrganizationId = uuidv4();
  const testUserId = uuidv4();
  const testApplicationId = uuidv4();

  const mockApplication: HRApplication = {
    id: testApplicationId,
    organization_id: testOrganizationId,
    user_id: testUserId,
    status: 'pending',
    application_data: {
      cover_letter: 'Test cover letter'
    },
    created_at: new Date(),
    updated_at: new Date()
  };

  beforeAll(() => {
    mockApplicationModel = {
      checkDuplicateApplication: jest.fn(),
      validateApplicationData: jest.fn(),
      getApplicationsByStatus: jest.fn(),
      findByOrganizationAndUser: jest.fn(),
      findById: jest.fn(),
      updateStatus: jest.fn(),
      generateInviteCode: jest.fn(),
      getApplicationStats: jest.fn(),
    } as any;

    mockNotificationService = {
      createCustomEventNotification: jest.fn(),
    } as any;

    MockedHRApplicationModel.mockImplementation(() => mockApplicationModel);
    MockedNotificationService.mockImplementation(() => mockNotificationService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    service = new HRApplicationService();
  });

  describe('validateApplication', () => {
    it('should return valid result for good application data', async () => {
      const applicationData = {
        cover_letter: 'Detailed cover letter with more than 100 characters explaining why I want to join this organization'
      };

      mockApplicationModel.checkDuplicateApplication.mockResolvedValue(false);
      mockApplicationModel.validateApplicationData.mockReturnValue([]);
      mockApplicationModel.getApplicationsByStatus.mockResolvedValue([]);

      const result = await service.validateApplication(
        testOrganizationId,
        testUserId,
        applicationData
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error for duplicate application', async () => {
      const applicationData = { cover_letter: 'Test' };

      mockApplicationModel.checkDuplicateApplication.mockResolvedValue(true);
      mockApplicationModel.validateApplicationData.mockReturnValue([]);

      const result = await service.validateApplication(
        testOrganizationId,
        testUserId,
        applicationData
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('User already has an active application for this organization');
    });
  });

  describe('preventDuplicateApplication', () => {
    it('should allow application when no existing application', async () => {
      mockApplicationModel.findByOrganizationAndUser.mockResolvedValue(null);

      const result = await service.preventDuplicateApplication(
        testOrganizationId,
        testUserId
      );

      expect(result.canApply).toBe(true);
    });

    it('should prevent application for active application', async () => {
      mockApplicationModel.findByOrganizationAndUser.mockResolvedValue(mockApplication);

      const result = await service.preventDuplicateApplication(
        testOrganizationId,
        testUserId
      );

      expect(result.canApply).toBe(false);
      expect(result.reason).toBe('You already have an active application for this organization');
    });
  });

  describe('generateInviteCodeForApproval', () => {
    it('should generate invite code for approved application', async () => {
      const approvedApplication = { ...mockApplication, status: 'approved' as const };
      const inviteCode = 'HR-ABC12345';

      mockApplicationModel.findById.mockResolvedValue(approvedApplication);
      mockApplicationModel.generateInviteCode.mockResolvedValue(inviteCode);

      const result = await service.generateInviteCodeForApproval(testApplicationId);

      expect(result).toBe(inviteCode);
    });

    it('should return null for non-approved application', async () => {
      mockApplicationModel.findById.mockResolvedValue(mockApplication);

      const result = await service.generateInviteCodeForApproval(testApplicationId);

      expect(result).toBeNull();
    });
  });

  describe('generateApplicationAnalytics', () => {
    it('should generate analytics', async () => {
      const mockStats = {
        total: 10,
        by_status: {
          pending: 2,
          under_review: 3,
          interview_scheduled: 1,
          approved: 2,
          rejected: 2
        },
        recent_count: 8
      };

      mockApplicationModel.getApplicationStats.mockResolvedValue(mockStats);

      const analytics = await service.generateApplicationAnalytics(testOrganizationId);

      expect(analytics.total_applications).toBe(10);
      expect(analytics.approval_rate).toBe(50);
    });
  });

  describe('processStatusChange', () => {
    it('should process status change successfully', async () => {
      const updatedApplication = {
        ...mockApplication,
        status: 'under_review' as const
      };

      mockApplicationModel.findById.mockResolvedValue(mockApplication);
      mockApplicationModel.updateStatus.mockResolvedValue(updatedApplication);

      const result = await service.processStatusChange(
        testApplicationId,
        'under_review',
        testUserId
      );

      expect(result).toEqual(updatedApplication);
    });

    it('should throw error for non-existent application', async () => {
      mockApplicationModel.findById.mockResolvedValue(null);

      await expect(service.processStatusChange(
        testApplicationId,
        'under_review',
        testUserId
      )).rejects.toThrow('Application not found');
    });
  });
});