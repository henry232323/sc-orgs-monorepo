import { HRActivityService } from '../services/hr_activity_service';
import { HRActivityModel, CreateHRActivityData } from '../models/hr_activity_model';
import db from '../config/database';

// Mock the logger to avoid console output during tests
jest.mock('../config/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

describe('HRActivityService', () => {
  let hrActivityService: HRActivityService;
  let testOrganizationId: string;
  let testUserId: string;

  beforeAll(async () => {
    hrActivityService = new HRActivityService();
    
    // Create test organization
    const [org] = await db('organizations').insert({
      name: 'Test Organization Service',
      rsi_org_id: 'TEST-ORG-HR-SERVICE',
      description: 'Test organization for HR activity service tests',
      owner_id: '00000000-0000-0000-0000-000000000001'
    }).returning('id');
    testOrganizationId = org.id;

    // Create test user
    const [user] = await db('users').insert({
      rsi_handle: 'test_service_user',
      email: 'test.service@example.com',
      is_verified: true
    }).returning('id');
    testUserId = user.id;
  });

  afterAll(async () => {
    // Clean up test data
    await db('hr_activities').where('organization_id', testOrganizationId).del();
    await db('organizations').where('id', testOrganizationId).del();
    await db('users').where('id', testUserId).del();
  });

  afterEach(async () => {
    // Clean up activities after each test
    await db('hr_activities').where('organization_id', testOrganizationId).del();
  });

  describe('createActivity', () => {
    it('should create a new HR activity', async () => {
      const activityData: CreateHRActivityData = {
        organization_id: testOrganizationId,
        activity_type: 'application_submitted',
        user_id: testUserId,
        user_handle: 'test_service_user',
        user_avatar_url: 'https://example.com/avatar.jpg',
        title: 'Application Submitted',
        description: 'User submitted an application to join the organization',
        metadata: {
          application_id: 'test-app-123'
        }
      };

      const activity = await hrActivityService.createActivity(activityData);

      expect(activity).toBeDefined();
      expect(activity.id).toBeDefined();
      expect(activity.organization_id).toBe(testOrganizationId);
      expect(activity.activity_type).toBe('application_submitted');
      expect(activity.title).toBe('Application Submitted');
    });

    it('should throw error for invalid activity data', async () => {
      const invalidData = {
        organization_id: testOrganizationId,
        activity_type: 'invalid_type' as any,
        user_id: testUserId,
        user_handle: 'test_service_user',
        title: 'Invalid Activity',
        description: 'This should fail'
      };

      await expect(hrActivityService.createActivity(invalidData)).rejects.toThrow('Invalid activity type');
    });

    it('should throw error for missing required fields', async () => {
      const incompleteData = {
        organization_id: testOrganizationId,
        activity_type: 'application_submitted' as any,
        user_id: testUserId,
        // Missing user_handle, title, description
      } as CreateHRActivityData;

      await expect(hrActivityService.createActivity(incompleteData)).rejects.toThrow('Missing required field');
    });

    it('should throw error for title too long', async () => {
      const longTitleData: CreateHRActivityData = {
        organization_id: testOrganizationId,
        activity_type: 'application_submitted',
        user_id: testUserId,
        user_handle: 'test_service_user',
        title: 'A'.repeat(256), // Too long
        description: 'Valid description'
      };

      await expect(hrActivityService.createActivity(longTitleData)).rejects.toThrow('Activity title must be 255 characters or less');
    });

    it('should throw error for description too long', async () => {
      const longDescriptionData: CreateHRActivityData = {
        organization_id: testOrganizationId,
        activity_type: 'application_submitted',
        user_id: testUserId,
        user_handle: 'test_service_user',
        title: 'Valid title',
        description: 'A'.repeat(1001) // Too long
      };

      await expect(hrActivityService.createActivity(longDescriptionData)).rejects.toThrow('Activity description must be 1000 characters or less');
    });
  });

  describe('getOrganizationActivities', () => {
    beforeEach(async () => {
      // Create test activities
      const activities: CreateHRActivityData[] = [
        {
          organization_id: testOrganizationId,
          activity_type: 'application_submitted',
          user_id: testUserId,
          user_handle: 'test_service_user',
          title: 'Application Submitted',
          description: 'First activity'
        },
        {
          organization_id: testOrganizationId,
          activity_type: 'skill_verified',
          user_id: testUserId,
          user_handle: 'test_service_user',
          title: 'Skill Verified',
          description: 'Second activity'
        }
      ];

      for (const activityData of activities) {
        await hrActivityService.createActivity(activityData);
      }
    });

    it('should get organization activities with default pagination', async () => {
      const result = await hrActivityService.getOrganizationActivities(testOrganizationId);

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should handle custom pagination parameters', async () => {
      const result = await hrActivityService.getOrganizationActivities(testOrganizationId, {
        page: 1,
        limit: 1
      });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(1);
    });

    it('should validate and correct invalid pagination parameters', async () => {
      const result = await hrActivityService.getOrganizationActivities(testOrganizationId, {
        page: -1, // Invalid, should be corrected to 1
        limit: 200 // Invalid, should be corrected to 100
      });

      expect(result.page).toBe(1);
      expect(result.limit).toBe(100);
    });

    it('should filter by activity types', async () => {
      const result = await hrActivityService.getOrganizationActivities(testOrganizationId, {
        activity_types: ['skill_verified']
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].activity_type).toBe('skill_verified');
    });

    it('should filter by user ID', async () => {
      const result = await hrActivityService.getOrganizationActivities(testOrganizationId, {
        user_id: testUserId
      });

      expect(result.data).toHaveLength(2);
      result.data.forEach(activity => {
        expect(activity.user_id).toBe(testUserId);
      });
    });
  });

  describe('getUserActivities', () => {
    beforeEach(async () => {
      // Create test activities for user
      const activities: CreateHRActivityData[] = [
        {
          organization_id: testOrganizationId,
          activity_type: 'application_submitted',
          user_id: testUserId,
          user_handle: 'test_service_user',
          title: 'User Application',
          description: 'User activity 1'
        },
        {
          organization_id: testOrganizationId,
          activity_type: 'skill_verified',
          user_id: testUserId,
          user_handle: 'test_service_user',
          title: 'User Skill',
          description: 'User activity 2'
        }
      ];

      for (const activityData of activities) {
        await hrActivityService.createActivity(activityData);
      }
    });

    it('should get user activities with default limit', async () => {
      const activities = await hrActivityService.getUserActivities(testUserId);

      expect(activities).toHaveLength(2);
      activities.forEach(activity => {
        expect(activity.user_id).toBe(testUserId);
      });
    });

    it('should respect custom limit', async () => {
      const activities = await hrActivityService.getUserActivities(testUserId, 1);

      expect(activities).toHaveLength(1);
    });

    it('should validate and correct invalid limit', async () => {
      const activities = await hrActivityService.getUserActivities(testUserId, 100); // Should be capped at 50

      expect(activities).toHaveLength(2); // Only 2 activities exist
    });
  });

  describe('getActivityById', () => {
    it('should get activity by ID', async () => {
      const activityData: CreateHRActivityData = {
        organization_id: testOrganizationId,
        activity_type: 'document_acknowledged',
        user_id: testUserId,
        user_handle: 'test_service_user',
        title: 'Document Acknowledged',
        description: 'User acknowledged a document'
      };

      const createdActivity = await hrActivityService.createActivity(activityData);
      const retrievedActivity = await hrActivityService.getActivityById(createdActivity.id);

      expect(retrievedActivity).toBeDefined();
      expect(retrievedActivity!.id).toBe(createdActivity.id);
      expect(retrievedActivity!.title).toBe('Document Acknowledged');
    });

    it('should return null for non-existent activity', async () => {
      const activity = await hrActivityService.getActivityById('00000000-0000-0000-0000-000000000000');
      expect(activity).toBeNull();
    });
  });

  describe('deleteActivity', () => {
    it('should delete activity by ID', async () => {
      const activityData: CreateHRActivityData = {
        organization_id: testOrganizationId,
        activity_type: 'performance_review_submitted',
        user_id: testUserId,
        user_handle: 'test_service_user',
        title: 'Performance Review',
        description: 'User submitted performance review'
      };

      const createdActivity = await hrActivityService.createActivity(activityData);
      const deleteResult = await hrActivityService.deleteActivity(createdActivity.id);

      expect(deleteResult).toBe(true);

      // Verify activity is deleted
      const retrievedActivity = await hrActivityService.getActivityById(createdActivity.id);
      expect(retrievedActivity).toBeNull();
    });

    it('should return false for non-existent activity', async () => {
      const deleteResult = await hrActivityService.deleteActivity('00000000-0000-0000-0000-000000000000');
      expect(deleteResult).toBe(false);
    });
  });

  describe('convenience methods', () => {
    it('should create application submitted activity', async () => {
      const activity = await hrActivityService.createApplicationSubmittedActivity(
        testOrganizationId,
        testUserId,
        'test_service_user',
        'https://example.com/avatar.jpg',
        'app-123',
        'Test Organization'
      );

      expect(activity.activity_type).toBe('application_submitted');
      expect(activity.title).toBe('Application submitted to Test Organization');
      expect(activity.metadata.application_id).toBe('app-123');
    });

    it('should create application status changed activity', async () => {
      const activity = await hrActivityService.createApplicationStatusChangedActivity(
        testOrganizationId,
        testUserId,
        'test_service_user',
        undefined,
        'app-123',
        'Test Organization',
        'pending',
        'approved',
        'reviewer-123'
      );

      expect(activity.activity_type).toBe('application_status_changed');
      expect(activity.title).toBe('Application status changed to approved');
      expect(activity.metadata.old_status).toBe('pending');
      expect(activity.metadata.new_status).toBe('approved');
    });

    it('should create onboarding completed activity', async () => {
      const activity = await hrActivityService.createOnboardingCompletedActivity(
        testOrganizationId,
        testUserId,
        'test_service_user',
        undefined,
        'onboarding-123',
        'Test Organization',
        'Developer'
      );

      expect(activity.activity_type).toBe('onboarding_completed');
      expect(activity.title).toBe('Onboarding completed for Developer');
      expect(activity.metadata.role_name).toBe('Developer');
    });

    it('should create performance review submitted activity', async () => {
      const activity = await hrActivityService.createPerformanceReviewSubmittedActivity(
        testOrganizationId,
        testUserId,
        'test_service_user',
        undefined,
        'review-123',
        'Test Organization',
        'Q1 2024',
        4
      );

      expect(activity.activity_type).toBe('performance_review_submitted');
      expect(activity.title).toBe('Performance review completed');
      expect(activity.metadata.review_period).toBe('Q1 2024');
      expect(activity.metadata.overall_rating).toBe(4);
    });

    it('should create skill verified activity', async () => {
      const activity = await hrActivityService.createSkillVerifiedActivity(
        testOrganizationId,
        testUserId,
        'test_service_user',
        undefined,
        'skill-123',
        'JavaScript',
        'Advanced',
        'verifier-123'
      );

      expect(activity.activity_type).toBe('skill_verified');
      expect(activity.title).toBe('JavaScript skill verified');
      expect(activity.metadata.skill_name).toBe('JavaScript');
      expect(activity.metadata.proficiency_level).toBe('Advanced');
    });

    it('should create document acknowledged activity', async () => {
      const activity = await hrActivityService.createDocumentAcknowledgedActivity(
        testOrganizationId,
        testUserId,
        'test_service_user',
        undefined,
        'doc-123',
        'Employee Handbook',
        'Test Organization'
      );

      expect(activity.activity_type).toBe('document_acknowledged');
      expect(activity.title).toBe('Document acknowledged: Employee Handbook');
      expect(activity.metadata.document_title).toBe('Employee Handbook');
    });
  });
});