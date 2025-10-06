import request from 'supertest';
import express from 'express';
import { HRActivityController } from '../controllers/hr_activity_controller';
import { HRActivityService } from '../services/hr_activity_service';
import { HRActivityModel } from '../models/hr_activity_model';

// Mock the logger to avoid console output during tests
jest.mock('../config/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

// Mock the database to avoid actual database operations
jest.mock('../config/database', () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe('HR Activity Integration', () => {
  let app: express.Application;
  let hrActivityController: HRActivityController;
  let hrActivityService: HRActivityService;
  let hrActivityModel: HRActivityModel;

  beforeEach(() => {
    // Setup Express app
    app = express();
    app.use(express.json());
    
    // Initialize components
    hrActivityModel = new HRActivityModel();
    hrActivityService = new HRActivityService();
    hrActivityController = new HRActivityController();
  });

  describe('Component Integration', () => {
    it('should create HRActivityModel instance', () => {
      expect(hrActivityModel).toBeInstanceOf(HRActivityModel);
    });

    it('should create HRActivityService instance', () => {
      expect(hrActivityService).toBeInstanceOf(HRActivityService);
    });

    it('should create HRActivityController instance', () => {
      expect(hrActivityController).toBeInstanceOf(HRActivityController);
    });

    it('should have all required methods in HRActivityModel', () => {
      expect(typeof hrActivityModel.create).toBe('function');
      expect(typeof hrActivityModel.getOrganizationActivities).toBe('function');
      expect(typeof hrActivityModel.getUserActivities).toBe('function');
      expect(typeof hrActivityModel.getById).toBe('function');
      expect(typeof hrActivityModel.deleteById).toBe('function');
      expect(typeof hrActivityModel.getOrganizationActivityStats).toBe('function');
      expect(typeof hrActivityModel.createBulk).toBe('function');
    });

    it('should have all required methods in HRActivityService', () => {
      expect(typeof hrActivityService.createActivity).toBe('function');
      expect(typeof hrActivityService.getOrganizationActivities).toBe('function');
      expect(typeof hrActivityService.getUserActivities).toBe('function');
      expect(typeof hrActivityService.getActivityById).toBe('function');
      expect(typeof hrActivityService.deleteActivity).toBe('function');
      expect(typeof hrActivityService.getOrganizationActivityStats).toBe('function');
      
      // Convenience methods
      expect(typeof hrActivityService.createApplicationSubmittedActivity).toBe('function');
      expect(typeof hrActivityService.createApplicationStatusChangedActivity).toBe('function');
      expect(typeof hrActivityService.createOnboardingCompletedActivity).toBe('function');
      expect(typeof hrActivityService.createPerformanceReviewSubmittedActivity).toBe('function');
      expect(typeof hrActivityService.createSkillVerifiedActivity).toBe('function');
      expect(typeof hrActivityService.createDocumentAcknowledgedActivity).toBe('function');
    });

    it('should have all required methods in HRActivityController', () => {
      expect(typeof hrActivityController.getOrganizationActivities).toBe('function');
      expect(typeof hrActivityController.getUserActivities).toBe('function');
      expect(typeof hrActivityController.getActivityById).toBe('function');
      expect(typeof hrActivityController.getOrganizationActivityStats).toBe('function');
      expect(typeof hrActivityController.deleteActivity).toBe('function');
    });
  });

  describe('Service Validation', () => {
    it('should validate activity data in service', () => {
      const invalidData = {
        organization_id: 'org-123',
        activity_type: 'invalid_type' as any,
        user_id: 'user-123',
        user_handle: 'test_user',
        title: 'Test Activity',
        description: 'Test description'
      };

      expect(() => {
        (hrActivityService as any).validateActivityData(invalidData);
      }).toThrow('Invalid activity type');
    });

    it('should validate required fields in service', () => {
      const incompleteData = {
        organization_id: 'org-123',
        activity_type: 'application_submitted' as any,
        user_id: 'user-123',
        // Missing required fields
      };

      expect(() => {
        (hrActivityService as any).validateActivityData(incompleteData);
      }).toThrow('Missing required field');
    });

    it('should validate title length in service', () => {
      const longTitleData = {
        organization_id: 'org-123',
        activity_type: 'application_submitted' as any,
        user_id: 'user-123',
        user_handle: 'test_user',
        title: 'A'.repeat(256), // Too long
        description: 'Valid description'
      };

      expect(() => {
        (hrActivityService as any).validateActivityData(longTitleData);
      }).toThrow('Activity title must be 255 characters or less');
    });

    it('should validate description length in service', () => {
      const longDescriptionData = {
        organization_id: 'org-123',
        activity_type: 'application_submitted' as any,
        user_id: 'user-123',
        user_handle: 'test_user',
        title: 'Valid title',
        description: 'A'.repeat(1001) // Too long
      };

      expect(() => {
        (hrActivityService as any).validateActivityData(longDescriptionData);
      }).toThrow('Activity description must be 1000 characters or less');
    });

    it('should accept valid activity data', () => {
      const validData = {
        organization_id: 'org-123',
        activity_type: 'application_submitted' as any,
        user_id: 'user-123',
        user_handle: 'test_user',
        title: 'Valid title',
        description: 'Valid description'
      };

      expect(() => {
        (hrActivityService as any).validateActivityData(validData);
      }).not.toThrow();
    });
  });

  describe('Activity Type Validation', () => {
    const validActivityTypes = [
      'application_submitted',
      'application_status_changed',
      'onboarding_completed',
      'performance_review_submitted',
      'skill_verified',
      'document_acknowledged'
    ];

    validActivityTypes.forEach(activityType => {
      it(`should accept valid activity type: ${activityType}`, () => {
        const validData = {
          organization_id: 'org-123',
          activity_type: activityType as any,
          user_id: 'user-123',
          user_handle: 'test_user',
          title: 'Valid title',
          description: 'Valid description'
        };

        expect(() => {
          (hrActivityService as any).validateActivityData(validData);
        }).not.toThrow();
      });
    });
  });

  describe('Convenience Method Parameters', () => {
    it('should create application submitted activity with correct parameters', () => {
      const createActivitySpy = jest.spyOn(hrActivityService, 'createActivity').mockResolvedValue({} as any);

      hrActivityService.createApplicationSubmittedActivity(
        'org-123',
        'user-123',
        'test_user',
        'https://example.com/avatar.jpg',
        'app-123',
        'Test Organization'
      );

      expect(createActivitySpy).toHaveBeenCalledWith({
        organization_id: 'org-123',
        activity_type: 'application_submitted',
        user_id: 'user-123',
        user_handle: 'test_user',
        user_avatar_url: 'https://example.com/avatar.jpg',
        title: 'Application submitted to Test Organization',
        description: 'test_user submitted an application to join the organization',
        metadata: {
          application_id: 'app-123',
          organization_name: 'Test Organization'
        }
      });

      createActivitySpy.mockRestore();
    });

    it('should create skill verified activity with correct parameters', () => {
      const createActivitySpy = jest.spyOn(hrActivityService, 'createActivity').mockResolvedValue({} as any);

      hrActivityService.createSkillVerifiedActivity(
        'org-123',
        'user-123',
        'test_user',
        undefined,
        'skill-123',
        'JavaScript',
        'Advanced',
        'verifier-123'
      );

      expect(createActivitySpy).toHaveBeenCalledWith({
        organization_id: 'org-123',
        activity_type: 'skill_verified',
        user_id: 'user-123',
        user_handle: 'test_user',
        user_avatar_url: undefined,
        title: 'JavaScript skill verified',
        description: 'test_user\'s JavaScript skill was verified at Advanced level',
        metadata: {
          skill_id: 'skill-123',
          skill_name: 'JavaScript',
          proficiency_level: 'Advanced',
          verifier_id: 'verifier-123'
        }
      });

      createActivitySpy.mockRestore();
    });
  });
});