import request from 'supertest';
import express from 'express';
import { HRActivityController } from '../controllers/hr_activity_controller';
import { HRActivityService } from '../services/hr_activity_service';
import { getUserFromRequest } from '../utils/user-casting';

// Mock dependencies
jest.mock('../services/hr_activity_service');
jest.mock('../utils/user-casting');
jest.mock('../config/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const MockedHRActivityService = HRActivityService as jest.MockedClass<typeof HRActivityService>;
const mockedGetUserFromRequest = getUserFromRequest as jest.MockedFunction<typeof getUserFromRequest>;

describe('HRActivityController', () => {
  let app: express.Application;
  let hrActivityController: HRActivityController;
  let mockHRActivityService: jest.Mocked<HRActivityService>;

  const mockUser = {
    id: 'user-123',
    rsi_handle: 'test_user',
    email: 'test@example.com',
    discord_id: null,
    is_rsi_verified: true,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  };

  const mockActivity = {
    id: 'activity-123',
    organization_id: 'org-123',
    activity_type: 'application_submitted' as const,
    user_id: 'user-123',
    user_handle: 'test_user',
    user_avatar_url: 'https://example.com/avatar.jpg',
    title: 'Application Submitted',
    description: 'User submitted an application',
    metadata: { application_id: 'app-123' },
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-01T10:00:00Z'
  };

  beforeEach(() => {
    // Reset mocks
    MockedHRActivityService.mockClear();
    mockedGetUserFromRequest.mockClear();

    // Create mock service instance
    mockHRActivityService = {
      getOrganizationActivities: jest.fn(),
      getUserActivities: jest.fn(),
      getActivityById: jest.fn(),
      deleteActivity: jest.fn(),
      getOrganizationActivityStats: jest.fn(),
      createActivity: jest.fn(),
      createApplicationSubmittedActivity: jest.fn(),
      createApplicationStatusChangedActivity: jest.fn(),
      createOnboardingCompletedActivity: jest.fn(),
      createPerformanceReviewSubmittedActivity: jest.fn(),
      createSkillVerifiedActivity: jest.fn(),
      createDocumentAcknowledgedActivity: jest.fn(),
    } as any;

    MockedHRActivityService.mockImplementation(() => mockHRActivityService);

    // Setup Express app
    app = express();
    app.use(express.json());
    hrActivityController = new HRActivityController();

    // Setup routes
    app.get('/organizations/:id/hr-activities', hrActivityController.getOrganizationActivities.bind(hrActivityController));
    app.get('/organizations/:id/hr-activities/stats', hrActivityController.getOrganizationActivityStats.bind(hrActivityController));
    app.get('/auth/hr-activities', hrActivityController.getUserActivities.bind(hrActivityController));
    app.get('/hr-activities/:id', hrActivityController.getActivityById.bind(hrActivityController));
    app.delete('/hr-activities/:id', hrActivityController.deleteActivity.bind(hrActivityController));
  });

  describe('getOrganizationActivities', () => {
    it('should get organization activities successfully', async () => {
      const mockResult = {
        data: [mockActivity],
        total: 1,
        page: 1,
        limit: 20
      };

      mockedGetUserFromRequest.mockReturnValue(mockUser);
      mockHRActivityService.getOrganizationActivities.mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/organizations/org-123/hr-activities')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: [mockActivity],
        total: 1,
        page: 1,
        limit: 20,
        has_more: false
      });

      expect(mockHRActivityService.getOrganizationActivities).toHaveBeenCalledWith('org-123', {
        page: 1,
        limit: 20,
        activity_types: undefined,
        date_from: undefined,
        date_to: undefined,
        user_id: undefined
      });
    });

    it('should handle query parameters correctly', async () => {
      const mockResult = {
        data: [mockActivity],
        total: 1,
        page: 2,
        limit: 10
      };

      mockedGetUserFromRequest.mockReturnValue(mockUser);
      mockHRActivityService.getOrganizationActivities.mockResolvedValue(mockResult);

      await request(app)
        .get('/organizations/org-123/hr-activities')
        .query({
          page: '2',
          limit: '10',
          activity_types: 'application_submitted,skill_verified',
          date_from: '2024-01-01T00:00:00Z',
          date_to: '2024-01-31T23:59:59Z',
          user_id: 'user-456'
        })
        .expect(200);

      expect(mockHRActivityService.getOrganizationActivities).toHaveBeenCalledWith('org-123', {
        page: 2,
        limit: 10,
        activity_types: ['application_submitted', 'skill_verified'],
        date_from: new Date('2024-01-01T00:00:00Z'),
        date_to: new Date('2024-01-31T23:59:59Z'),
        user_id: 'user-456'
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      mockedGetUserFromRequest.mockReturnValue(null);

      const response = await request(app)
        .get('/organizations/org-123/hr-activities')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: 'Authentication required'
      });
    });

    it('should return 400 for invalid date format', async () => {
      mockedGetUserFromRequest.mockReturnValue(mockUser);

      const response = await request(app)
        .get('/organizations/org-123/hr-activities')
        .query({ date_from: 'invalid-date' })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid date_from format. Use ISO 8601 format.'
      });
    });

    it('should handle service errors', async () => {
      mockedGetUserFromRequest.mockReturnValue(mockUser);
      mockHRActivityService.getOrganizationActivities.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .get('/organizations/org-123/hr-activities')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to fetch HR activities'
      });
    });
  });

  describe('getUserActivities', () => {
    it('should get user activities successfully', async () => {
      const mockActivities = [mockActivity];

      mockedGetUserFromRequest.mockReturnValue(mockUser);
      mockHRActivityService.getUserActivities.mockResolvedValue(mockActivities);

      const response = await request(app)
        .get('/auth/hr-activities')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockActivities,
        total: 1
      });

      expect(mockHRActivityService.getUserActivities).toHaveBeenCalledWith('user-123', 10);
    });

    it('should handle custom limit parameter', async () => {
      mockedGetUserFromRequest.mockReturnValue(mockUser);
      mockHRActivityService.getUserActivities.mockResolvedValue([]);

      await request(app)
        .get('/auth/hr-activities')
        .query({ limit: '5' })
        .expect(200);

      expect(mockHRActivityService.getUserActivities).toHaveBeenCalledWith('user-123', 5);
    });

    it('should return 401 when user is not authenticated', async () => {
      mockedGetUserFromRequest.mockReturnValue(null);

      const response = await request(app)
        .get('/auth/hr-activities')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: 'Authentication required'
      });
    });
  });

  describe('getActivityById', () => {
    it('should get activity by ID successfully', async () => {
      mockedGetUserFromRequest.mockReturnValue(mockUser);
      mockHRActivityService.getActivityById.mockResolvedValue(mockActivity);

      const response = await request(app)
        .get('/hr-activities/activity-123')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockActivity
      });

      expect(mockHRActivityService.getActivityById).toHaveBeenCalledWith('activity-123');
    });

    it('should return 404 when activity not found', async () => {
      mockedGetUserFromRequest.mockReturnValue(mockUser);
      mockHRActivityService.getActivityById.mockResolvedValue(null);

      const response = await request(app)
        .get('/hr-activities/nonexistent')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'HR activity not found'
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      mockedGetUserFromRequest.mockReturnValue(null);

      const response = await request(app)
        .get('/hr-activities/activity-123')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: 'Authentication required'
      });
    });
  });

  describe('getOrganizationActivityStats', () => {
    it('should get activity stats successfully', async () => {
      const mockStats = {
        total_activities: 10,
        activities_by_type: {
          application_submitted: 5,
          application_status_changed: 2,
          onboarding_completed: 1,
          performance_review_submitted: 1,
          skill_verified: 1,
          document_acknowledged: 0
        },
        recent_activity_trend: [
          { date: '2024-01-01', count: 3 },
          { date: '2024-01-02', count: 2 }
        ]
      };

      mockedGetUserFromRequest.mockReturnValue(mockUser);
      mockHRActivityService.getOrganizationActivityStats.mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/organizations/org-123/hr-activities/stats')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockStats
      });

      expect(mockHRActivityService.getOrganizationActivityStats).toHaveBeenCalledWith(
        'org-123',
        undefined,
        undefined
      );
    });

    it('should handle date range parameters', async () => {
      const mockStats = {
        total_activities: 5,
        activities_by_type: {
          application_submitted: 3,
          application_status_changed: 1,
          onboarding_completed: 1,
          performance_review_submitted: 0,
          skill_verified: 0,
          document_acknowledged: 0
        },
        recent_activity_trend: []
      };

      mockedGetUserFromRequest.mockReturnValue(mockUser);
      mockHRActivityService.getOrganizationActivityStats.mockResolvedValue(mockStats);

      await request(app)
        .get('/organizations/org-123/hr-activities/stats')
        .query({
          date_from: '2024-01-01T00:00:00Z',
          date_to: '2024-01-31T23:59:59Z'
        })
        .expect(200);

      expect(mockHRActivityService.getOrganizationActivityStats).toHaveBeenCalledWith(
        'org-123',
        new Date('2024-01-01T00:00:00Z'),
        new Date('2024-01-31T23:59:59Z')
      );
    });

    it('should return 401 when user is not authenticated', async () => {
      mockedGetUserFromRequest.mockReturnValue(null);

      const response = await request(app)
        .get('/organizations/org-123/hr-activities/stats')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: 'Authentication required'
      });
    });
  });

  describe('deleteActivity', () => {
    it('should delete activity successfully', async () => {
      mockedGetUserFromRequest.mockReturnValue(mockUser);
      mockHRActivityService.deleteActivity.mockResolvedValue(true);

      const response = await request(app)
        .delete('/hr-activities/activity-123')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'HR activity deleted successfully'
      });

      expect(mockHRActivityService.deleteActivity).toHaveBeenCalledWith('activity-123');
    });

    it('should return 404 when activity not found', async () => {
      mockedGetUserFromRequest.mockReturnValue(mockUser);
      mockHRActivityService.deleteActivity.mockResolvedValue(false);

      const response = await request(app)
        .delete('/hr-activities/nonexistent')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'HR activity not found'
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      mockedGetUserFromRequest.mockReturnValue(null);

      const response = await request(app)
        .delete('/hr-activities/activity-123')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: 'Authentication required'
      });
    });
  });
});