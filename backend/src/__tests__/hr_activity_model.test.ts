import { HRActivityModel, CreateHRActivityData, HRActivityType } from '../models/hr_activity_model';
import db from '../config/database';

describe('HRActivityModel', () => {
  let hrActivityModel: HRActivityModel;
  let testOrganizationId: string;
  let testUserId: string;

  beforeAll(async () => {
    hrActivityModel = new HRActivityModel();
    
    // Create test organization
    const [org] = await db('organizations').insert({
      name: 'Test Organization',
      rsi_org_id: 'TEST-ORG-HR-ACTIVITY',
      description: 'Test organization for HR activity tests',
      owner_id: '00000000-0000-0000-0000-000000000001'
    }).returning('id');
    testOrganizationId = org.id;

    // Create test user
    const [user] = await db('users').insert({
      rsi_handle: 'test_hr_user',
      email: 'test.hr@example.com',
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

  describe('create', () => {
    it('should create a new HR activity', async () => {
      const activityData: CreateHRActivityData = {
        organization_id: testOrganizationId,
        activity_type: 'application_submitted',
        user_id: testUserId,
        user_handle: 'test_hr_user',
        user_avatar_url: 'https://example.com/avatar.jpg',
        title: 'Application Submitted',
        description: 'User submitted an application to join the organization',
        metadata: {
          application_id: 'test-app-123',
          organization_name: 'Test Organization'
        }
      };

      const activity = await hrActivityModel.create(activityData);

      expect(activity).toBeDefined();
      expect(activity.id).toBeDefined();
      expect(activity.organization_id).toBe(testOrganizationId);
      expect(activity.activity_type).toBe('application_submitted');
      expect(activity.user_id).toBe(testUserId);
      expect(activity.user_handle).toBe('test_hr_user');
      expect(activity.title).toBe('Application Submitted');
      expect(activity.description).toBe('User submitted an application to join the organization');
      expect(activity.metadata).toEqual({
        application_id: 'test-app-123',
        organization_name: 'Test Organization'
      });
      expect(activity.created_at).toBeDefined();
      expect(activity.updated_at).toBeDefined();
    });

    it('should create activity with default empty metadata', async () => {
      const activityData: CreateHRActivityData = {
        organization_id: testOrganizationId,
        activity_type: 'skill_verified',
        user_id: testUserId,
        user_handle: 'test_hr_user',
        title: 'Skill Verified',
        description: 'User skill was verified'
      };

      const activity = await hrActivityModel.create(activityData);

      expect(activity.metadata).toEqual({});
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
          user_handle: 'test_hr_user',
          title: 'Application Submitted',
          description: 'First activity'
        },
        {
          organization_id: testOrganizationId,
          activity_type: 'skill_verified',
          user_id: testUserId,
          user_handle: 'test_hr_user',
          title: 'Skill Verified',
          description: 'Second activity'
        },
        {
          organization_id: testOrganizationId,
          activity_type: 'onboarding_completed',
          user_id: testUserId,
          user_handle: 'test_hr_user',
          title: 'Onboarding Completed',
          description: 'Third activity'
        }
      ];

      for (const activityData of activities) {
        await hrActivityModel.create(activityData);
      }
    });

    it('should get paginated activities for organization', async () => {
      const result = await hrActivityModel.getOrganizationActivities(testOrganizationId, 1, 2);

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(3);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(2);
      
      // Should be ordered by created_at desc (most recent first)
      expect(result.data[0].title).toBe('Onboarding Completed');
      expect(result.data[1].title).toBe('Skill Verified');
    });

    it('should filter activities by type', async () => {
      const result = await hrActivityModel.getOrganizationActivities(
        testOrganizationId,
        1,
        10,
        { activity_types: ['skill_verified'] }
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].activity_type).toBe('skill_verified');
      expect(result.total).toBe(1);
    });

    it('should filter activities by user', async () => {
      const result = await hrActivityModel.getOrganizationActivities(
        testOrganizationId,
        1,
        10,
        { user_id: testUserId }
      );

      expect(result.data).toHaveLength(3);
      expect(result.total).toBe(3);
      result.data.forEach(activity => {
        expect(activity.user_id).toBe(testUserId);
      });
    });

    it('should filter activities by date range', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

      const result = await hrActivityModel.getOrganizationActivities(
        testOrganizationId,
        1,
        10,
        { 
          date_from: oneHourAgo,
          date_to: oneHourFromNow
        }
      );

      expect(result.data).toHaveLength(3);
      expect(result.total).toBe(3);
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
          user_handle: 'test_hr_user',
          title: 'Application Submitted',
          description: 'User activity 1'
        },
        {
          organization_id: testOrganizationId,
          activity_type: 'skill_verified',
          user_id: testUserId,
          user_handle: 'test_hr_user',
          title: 'Skill Verified',
          description: 'User activity 2'
        }
      ];

      for (const activityData of activities) {
        await hrActivityModel.create(activityData);
      }
    });

    it('should get user activities across all organizations', async () => {
      const activities = await hrActivityModel.getUserActivities(testUserId, 10);

      expect(activities).toHaveLength(2);
      activities.forEach(activity => {
        expect(activity.user_id).toBe(testUserId);
      });
      
      // Should be ordered by created_at desc
      expect(activities[0].title).toBe('Skill Verified');
      expect(activities[1].title).toBe('Application Submitted');
    });

    it('should respect limit parameter', async () => {
      const activities = await hrActivityModel.getUserActivities(testUserId, 1);

      expect(activities).toHaveLength(1);
      expect(activities[0].title).toBe('Skill Verified'); // Most recent
    });
  });

  describe('getById', () => {
    it('should get activity by ID', async () => {
      const activityData: CreateHRActivityData = {
        organization_id: testOrganizationId,
        activity_type: 'document_acknowledged',
        user_id: testUserId,
        user_handle: 'test_hr_user',
        title: 'Document Acknowledged',
        description: 'User acknowledged a document'
      };

      const createdActivity = await hrActivityModel.create(activityData);
      const retrievedActivity = await hrActivityModel.getById(createdActivity.id);

      expect(retrievedActivity).toBeDefined();
      expect(retrievedActivity!.id).toBe(createdActivity.id);
      expect(retrievedActivity!.title).toBe('Document Acknowledged');
    });

    it('should return null for non-existent activity', async () => {
      const activity = await hrActivityModel.getById('00000000-0000-0000-0000-000000000000');
      expect(activity).toBeNull();
    });
  });

  describe('deleteById', () => {
    it('should delete activity by ID', async () => {
      const activityData: CreateHRActivityData = {
        organization_id: testOrganizationId,
        activity_type: 'performance_review_submitted',
        user_id: testUserId,
        user_handle: 'test_hr_user',
        title: 'Performance Review Submitted',
        description: 'User submitted performance review'
      };

      const createdActivity = await hrActivityModel.create(activityData);
      const deleteResult = await hrActivityModel.deleteById(createdActivity.id);

      expect(deleteResult).toBe(true);

      // Verify activity is deleted
      const retrievedActivity = await hrActivityModel.getById(createdActivity.id);
      expect(retrievedActivity).toBeNull();
    });

    it('should return false for non-existent activity', async () => {
      const deleteResult = await hrActivityModel.deleteById('00000000-0000-0000-0000-000000000000');
      expect(deleteResult).toBe(false);
    });
  });

  describe('getOrganizationActivityStats', () => {
    beforeEach(async () => {
      // Create test activities with different types
      const activities: CreateHRActivityData[] = [
        {
          organization_id: testOrganizationId,
          activity_type: 'application_submitted',
          user_id: testUserId,
          user_handle: 'test_hr_user',
          title: 'Application 1',
          description: 'First application'
        },
        {
          organization_id: testOrganizationId,
          activity_type: 'application_submitted',
          user_id: testUserId,
          user_handle: 'test_hr_user',
          title: 'Application 2',
          description: 'Second application'
        },
        {
          organization_id: testOrganizationId,
          activity_type: 'skill_verified',
          user_id: testUserId,
          user_handle: 'test_hr_user',
          title: 'Skill Verified',
          description: 'Skill verification'
        }
      ];

      for (const activityData of activities) {
        await hrActivityModel.create(activityData);
      }
    });

    it('should get activity statistics for organization', async () => {
      const stats = await hrActivityModel.getOrganizationActivityStats(testOrganizationId);

      expect(stats.total_activities).toBe(3);
      expect(stats.activities_by_type.application_submitted).toBe(2);
      expect(stats.activities_by_type.skill_verified).toBe(1);
      expect(stats.activities_by_type.onboarding_completed).toBe(0);
      expect(stats.recent_activity_trend).toBeDefined();
      expect(Array.isArray(stats.recent_activity_trend)).toBe(true);
    });
  });

  describe('createBulk', () => {
    it('should create multiple activities in bulk', async () => {
      const activities: CreateHRActivityData[] = [
        {
          organization_id: testOrganizationId,
          activity_type: 'application_submitted',
          user_id: testUserId,
          user_handle: 'test_hr_user',
          title: 'Bulk Activity 1',
          description: 'First bulk activity'
        },
        {
          organization_id: testOrganizationId,
          activity_type: 'skill_verified',
          user_id: testUserId,
          user_handle: 'test_hr_user',
          title: 'Bulk Activity 2',
          description: 'Second bulk activity'
        }
      ];

      const createdActivities = await hrActivityModel.createBulk(activities);

      expect(createdActivities).toHaveLength(2);
      expect(createdActivities[0].title).toBe('Bulk Activity 1');
      expect(createdActivities[1].title).toBe('Bulk Activity 2');
      
      // Verify activities were actually created in database
      const result = await hrActivityModel.getOrganizationActivities(testOrganizationId);
      expect(result.total).toBe(2);
    });
  });
});