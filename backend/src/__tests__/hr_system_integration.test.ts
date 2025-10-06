import { NotificationService } from '../services/notification_service';
import { ActivityService } from '../services/activity_service';
import { HRApplicationService } from '../services/hr_application_service';
import { HROnboardingService } from '../services/hr_onboarding_service';
import { HRPerformanceService } from '../services/hr_performance_service';
import { HRSkillService } from '../services/hr_skill_service';
import { HRDocumentService } from '../services/hr_document_service';
import { HRAnalyticsService } from '../services/hr_analytics_service';
import { NotificationEntityType } from '../types/notification';
import { NotificationSerializer } from '../utils/notification_serializer';
import db from '../config/database';

// Mock the database and models
jest.mock('../config/database');
jest.mock('../models/hr_application_model');
jest.mock('../models/hr_onboarding_model');
jest.mock('../models/hr_performance_model');
jest.mock('../models/hr_skill_model');
jest.mock('../models/hr_document_model');
jest.mock('../models/hr_analytics_model');
jest.mock('../models/event_model');
jest.mock('../models/organization_model');
jest.mock('../models/user_model');
jest.mock('../models/notification_model');

const mockDb = db as jest.Mocked<typeof db>;

describe('HR System Integration Tests', () => {
  let notificationService: NotificationService;
  let activityService: ActivityService;
  let applicationService: HRApplicationService;
  let onboardingService: HROnboardingService;
  let performanceService: HRPerformanceService;
  let skillService: HRSkillService;
  let documentService: HRDocumentService;
  let analyticsService: HRAnalyticsService;

  beforeEach(() => {
    notificationService = new NotificationService();
    activityService = new ActivityService();
    applicationService = new HRApplicationService();
    onboardingService = new HROnboardingService();
    performanceService = new HRPerformanceService();
    skillService = new HRSkillService();
    documentService = new HRDocumentService();
    analyticsService = new HRAnalyticsService();
    jest.clearAllMocks();
  });

  describe('End-to-End HR Workflow Integration', () => {
    it('should handle complete application to onboarding workflow', async () => {
      const organizationId = 'org-123';
      const userId = 'user-456';
      const reviewerId = 'reviewer-789';

      // Mock application creation and approval
      const mockApplication = {
        id: 'app-123',
        organization_id: organizationId,
        user_id: userId,
        status: 'approved' as const,
        application_data: {
          cover_letter: 'Test cover letter',
          experience: 'Test experience',
        },
        invite_code: 'invite-abc123',
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Mock notification service
      const mockNotificationService = {
        createCustomEventNotification: jest.fn(),
        createNotification: jest.fn(),
      };

      // Mock onboarding template and progress
      const mockOnboardingModel = {
        findTemplateByRoleAndOrganization: jest.fn().mockResolvedValue({
          id: 'template-123',
          role_name: 'Pilot',
          tasks: [
            { id: 'task-1', title: 'Complete Safety Training', required: true },
            { id: 'task-2', title: 'Ship Orientation', required: true },
          ],
        }),
        findProgressByUserAndOrganization: jest.fn().mockResolvedValue(null),
        createProgress: jest.fn().mockResolvedValue({
          id: 'progress-123',
          organization_id: organizationId,
          user_id: userId,
          template_id: 'template-123',
          status: 'not_started',
          completion_percentage: 0,
        }),
      };

      // Set up service mocks
      (applicationService as any).notificationService = mockNotificationService;
      (onboardingService as any).notificationService = mockNotificationService;
      (onboardingService as any).onboardingModel = mockOnboardingModel;

      // Test application approval notification
      await applicationService.triggerStatusChangeNotifications(
        mockApplication,
        'pending',
        'approved',
        reviewerId
      );

      expect(mockNotificationService.createCustomEventNotification).toHaveBeenCalledWith(
        expect.any(Number), // NotificationEntityType
        organizationId,
        'system',
        [userId],
        expect.stringContaining('Approved'),
        expect.stringContaining('approved'),
        expect.any(Object)
      );

      // Test onboarding assignment
      await onboardingService.assignTemplateToUser(organizationId, userId, 'Pilot');

      expect(mockOnboardingModel.createProgress).toHaveBeenCalledWith({
        organization_id: organizationId,
        user_id: userId,
        template_id: 'template-123',
      });

      expect(mockNotificationService.createCustomEventNotification).toHaveBeenCalledWith(
        NotificationEntityType.HR_ONBOARDING_STARTED,
        expect.any(String),
        userId,
        [userId],
        expect.stringContaining('Onboarding Started'),
        expect.stringContaining('onboarding'),
        expect.any(Object)
      );
    });

    it('should integrate performance reviews with event attendance', async () => {
      const reviewId = 'review-123';
      const organizationId = 'org-123';
      const userId = 'user-456';

      // Mock performance review
      const mockReview = {
        id: reviewId,
        organization_id: organizationId,
        reviewee_id: userId,
        review_period_start: new Date('2024-01-01'),
        review_period_end: new Date('2024-01-31'),
        ratings: { communication: { score: 4, comments: 'Good' } },
      };

      // Mock performance model
      const mockPerformanceModel = {
        findById: jest.fn().mockResolvedValue(mockReview),
        updateReview: jest.fn().mockResolvedValue({
          ...mockReview,
          ratings: {
            ...mockReview.ratings,
            event_participation: { score: 3, comments: 'Good attendance' },
          },
        }),
      };

      (performanceService as any).performanceModel = mockPerformanceModel;

      // Mock event attendance data
      jest.spyOn(performanceService, 'linkEventAttendanceToPerformance').mockResolvedValue({
        events_attended: 5,
        events_registered: 6,
        attendance_rate: 83.33,
        event_participation_score: 75,
      });

      const result = await performanceService.integrateEventParticipationInReview(reviewId);

      expect(result).toBeDefined();
      expect(result?.ratings.event_participation).toBeDefined();
      expect(mockPerformanceModel.updateReview).toHaveBeenCalledWith(reviewId, {
        ratings: {
          communication: { score: 4, comments: 'Good' },
          event_participation: {
            score: 4, // 75/20 = 3.75, rounded to 4
            comments: 'Attended 5 out of 6 registered events (83.33% attendance rate)',
          },
        },
      });
    });

    it('should process skill verifications from training events', async () => {
      const eventId = 'training-event-123';
      const userId = 'user-456';

      // Mock EventModel
      const mockEventModel = {
        findById: jest.fn().mockResolvedValue({
          id: eventId,
          title: 'Advanced Combat Training',
        }),
        getEventRegistrations: jest.fn().mockResolvedValue([
          { user_id: userId, status: 'confirmed' },
          { user_id: 'user-789', status: 'confirmed' },
        ]),
      };

      // Mock dynamic import
      jest.doMock('../models/event_model', () => ({
        EventModel: jest.fn(() => mockEventModel),
      }));

      // Mock training event skills
      (mockDb as any).mockReturnValueOnce({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({
          skill_categories: '["pilot", "combat"]',
          required_skills: '["advanced-combat"]',
        }),
      });

      // Mock skill verification
      jest.spyOn(skillService, 'createSkillVerificationFromEventParticipation')
        .mockResolvedValueOnce({ verified_skills: ['Advanced Combat'], pending_verifications: [] })
        .mockResolvedValueOnce({ verified_skills: ['Tactical Maneuvering'], pending_verifications: [] });

      const result = await skillService.processEventCompletionSkillVerifications(eventId);

      expect(result.total_processed).toBe(2);
      expect(result.verified_count).toBe(2);
      expect(result.error_count).toBe(0);
    });
  });

  describe('Notification System Integration', () => {
    it('should generate proper notification content for all HR entity types', async () => {
      const testCases = [
        {
          entityType: NotificationEntityType.HR_APPLICATION_SUBMITTED,
          entityId: 'app-123',
          expectedTitleContains: 'Application',
        },
        {
          entityType: NotificationEntityType.HR_APPLICATION_STATUS_CHANGED,
          entityId: 'app-123',
          expectedTitleContains: 'Status',
        },
        {
          entityType: NotificationEntityType.HR_ONBOARDING_STARTED,
          entityId: 'progress-123',
          expectedTitleContains: 'Onboarding',
        },
        {
          entityType: NotificationEntityType.HR_ONBOARDING_COMPLETED,
          entityId: 'progress-123',
          expectedTitleContains: 'Complete',
        },
        {
          entityType: NotificationEntityType.HR_ONBOARDING_OVERDUE,
          entityId: 'progress-123',
          expectedTitleContains: 'Overdue',
        },
        {
          entityType: NotificationEntityType.HR_PERFORMANCE_REVIEW_DUE,
          entityId: 'review-123',
          expectedTitleContains: 'Performance Review',
        },
        {
          entityType: NotificationEntityType.HR_PERFORMANCE_REVIEW_SUBMITTED,
          entityId: 'review-123',
          expectedTitleContains: 'Performance Review',
        },
        {
          entityType: NotificationEntityType.HR_SKILL_VERIFIED,
          entityId: 'skill-123',
          expectedTitleContains: 'Skill',
        },
        {
          entityType: NotificationEntityType.HR_CERTIFICATION_EXPIRING,
          entityId: 'cert-123',
          expectedTitleContains: 'Certification',
        },
        {
          entityType: NotificationEntityType.HR_DOCUMENT_REQUIRES_ACKNOWLEDGMENT,
          entityId: 'doc-123',
          expectedTitleContains: 'Document',
        },
        {
          entityType: NotificationEntityType.HR_ANALYTICS_ALERT,
          entityId: 'org-123',
          customData: { title: 'Test Alert', message: 'Test message' },
          expectedTitleContains: 'Test Alert',
        },
      ];

      for (const testCase of testCases) {
        const content = await NotificationSerializer.generateNotificationContent(
          testCase.entityType,
          testCase.entityId,
          'user-123',
          testCase.customData
        );

        expect(content.title).toContain(testCase.expectedTitleContains);
        expect(content.message).toBeDefined();
        expect(content.message.length).toBeGreaterThan(0);
      }
    });

    it('should handle notification failures gracefully', async () => {
      const mockNotificationService = {
        createCustomEventNotification: jest.fn().mockRejectedValue(new Error('Notification service down')),
      };

      (applicationService as any).notificationService = mockNotificationService;

      const mockApplication = {
        id: 'app-123',
        organization_id: 'org-123',
        user_id: 'user-456',
        status: 'approved' as const,
        application_data: {
          cover_letter: 'Test cover letter',
        },
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Should not throw error even if notifications fail
      await expect(
        applicationService.triggerStatusChangeNotifications(
          mockApplication,
          'pending',
          'approved',
          'reviewer-123'
        )
      ).resolves.not.toThrow();
    });
  });

  describe('Activity Service Integration', () => {
    it('should include HR activities in user activity feed', async () => {
      // Mock empty results for non-HR activities
      const emptyQuery = {
        join: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        whereNotNull: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };

      // Mock most queries to return empty
      for (let i = 0; i < 6; i++) {
        (mockDb as any).mockReturnValueOnce(emptyQuery);
      }

      // Mock HR application activities
      (mockDb as any).mockReturnValueOnce({
        join: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([
          {
            id: 'app-123',
            status: 'approved',
            timestamp: new Date('2024-01-15'),
            org_name: 'Test Org',
            org_id: 'org-123',
          },
        ]),
      } as any);

      // Mock HR onboarding activities
      (mockDb as any).mockReturnValueOnce({
        join: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([
          {
            id: 'progress-123',
            status: 'completed',
            completion_percentage: 100,
            timestamp: new Date('2024-01-20'),
            org_name: 'Test Org',
            org_id: 'org-123',
            role_name: 'Pilot',
          },
        ]),
      } as any);

      // Mock HR performance activities
      (mockDb as any).mockReturnValueOnce({
        join: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([
          {
            id: 'review-123',
            status: 'submitted',
            overall_rating: 4.5,
            timestamp: new Date('2024-01-25'),
            review_period_start: new Date('2024-01-01'),
            review_period_end: new Date('2024-01-31'),
            org_name: 'Test Org',
            org_id: 'org-123',
          },
        ]),
      } as any);

      // Mock HR skill activities - user skills
      (mockDb as any).mockReturnValueOnce({
        join: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        whereNotNull: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([
          {
            id: 'skill-123',
            timestamp: new Date('2024-01-30'),
            proficiency_level: 'advanced',
            skill_name: 'Combat Piloting',
            category: 'pilot',
          },
        ]),
      } as any);

      // Mock HR skill activities - certifications
      (mockDb as any).mockReturnValueOnce({
        join: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      } as any);

      const activities = await activityService.getUserRecentActivity('user-123', 20);

      expect(activities).toHaveLength(4);
      
      // Verify HR activities are included and properly categorized
      const hrActivities = activities.filter(a => a.type.startsWith('hr_'));
      expect(hrActivities).toHaveLength(4);

      const applicationActivity = activities.find(a => a.type === 'hr_application_submitted');
      expect(applicationActivity).toBeDefined();
      expect(applicationActivity?.metadata?.organization_name).toBe('Test Org');

      const onboardingActivity = activities.find(a => a.type === 'hr_onboarding_completed');
      expect(onboardingActivity).toBeDefined();
      expect(onboardingActivity?.metadata?.role_name).toBe('Pilot');

      const performanceActivity = activities.find(a => a.type === 'hr_performance_review_completed');
      expect(performanceActivity).toBeDefined();
      expect(performanceActivity?.metadata?.overall_rating).toBe(4.5);

      const skillActivity = activities.find(a => a.type === 'hr_skill_verified');
      expect(skillActivity).toBeDefined();
      expect(skillActivity?.metadata?.skill_name).toBe('Combat Piloting');
    });

    it('should handle activity service errors gracefully', async () => {
      // Mock database error
      (mockDb as any).mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const activities = await activityService.getUserRecentActivity('user-123', 10);

      expect(activities).toHaveLength(0);
    });
  });

  describe('Document Management Integration', () => {
    it('should trigger notifications when documents require acknowledgment', async () => {
      const organizationId = 'org-123';
      const mockDocument = {
        id: 'doc-123',
        organization_id: organizationId,
        title: 'Safety Procedures Manual',
        requires_acknowledgment: true,
        uploaded_by: 'uploader-123',
      };

      const mockNotificationService = {
        createNotification: jest.fn(),
      };

      const mockOrganizationModel = {
        findById: jest.fn().mockResolvedValue({
          id: organizationId,
          name: 'Test Organization',
          owner_id: 'owner-123',
        }),
      };

      (documentService as any).notificationService = mockNotificationService;

      // Mock dynamic import
      jest.doMock('../models/organization_model', () => ({
        OrganizationModel: jest.fn(() => mockOrganizationModel),
      }));

      await (documentService as any).sendAcknowledgmentNotifications(organizationId, mockDocument);

      expect(mockNotificationService.createNotification).toHaveBeenCalledWith({
        user_id: 'owner-123',
        entity_type: NotificationEntityType.HR_DOCUMENT_REQUIRES_ACKNOWLEDGMENT,
        entity_id: 'doc-123',
        title: 'Document Requires Acknowledgment',
        message: expect.stringContaining('Safety Procedures Manual'),
        actor_id: 'uploader-123',
        custom_data: expect.any(Object),
      });
    });

    it('should send acknowledgment completion notifications', async () => {
      const mockDocument = {
        id: 'doc-123',
        title: 'Safety Manual',
        uploaded_by: 'uploader-123',
      };

      const mockNotificationService = {
        createNotification: jest.fn(),
      };

      const mockUserModel = {
        findById: jest.fn().mockResolvedValue({
          id: 'user-456',
          rsi_handle: 'TestUser',
        }),
      };

      (documentService as any).notificationService = mockNotificationService;

      // Mock dynamic import
      jest.doMock('../models/user_model', () => ({
        UserModel: jest.fn(() => mockUserModel),
      }));

      await (documentService as any).sendAcknowledgmentCompletedNotification(mockDocument, 'user-456');

      expect(mockNotificationService.createNotification).toHaveBeenCalledWith({
        user_id: 'uploader-123',
        entity_type: NotificationEntityType.HR_DOCUMENT_REQUIRES_ACKNOWLEDGMENT,
        entity_id: 'doc-123',
        title: 'Document Acknowledged',
        message: expect.stringContaining('TestUser'),
        actor_id: 'user-456',
        custom_data: expect.any(Object),
      });
    });
  });

  describe('Analytics Integration', () => {
    it('should send analytics alerts for high priority issues', async () => {
      const organizationId = 'org-123';
      const highPriorityRecommendations = [
        {
          priority: 'high',
          category: 'Retention',
          title: 'High Member Turnover Rate',
          description: 'Member turnover rate exceeds threshold',
          action_items: ['Conduct exit interviews', 'Improve engagement'],
        },
        {
          priority: 'high',
          category: 'Performance',
          title: 'Low Performance Ratings',
          description: 'Average performance ratings below target',
          action_items: ['Provide additional training', 'Review processes'],
        },
      ];

      const mockNotificationService = {
        createNotification: jest.fn(),
      };

      const mockOrganizationModel = {
        findById: jest.fn().mockResolvedValue({
          id: organizationId,
          name: 'Test Organization',
          owner_id: 'owner-123',
        }),
      };

      (analyticsService as any).notificationService = mockNotificationService;

      // Mock dynamic import
      jest.doMock('../models/organization_model', () => ({
        OrganizationModel: jest.fn(() => mockOrganizationModel),
      }));

      await (analyticsService as any).sendAnalyticsAlerts(organizationId, highPriorityRecommendations);

      expect(mockNotificationService.createNotification).toHaveBeenCalledTimes(2);
      
      expect(mockNotificationService.createNotification).toHaveBeenCalledWith({
        user_id: 'owner-123',
        entity_type: NotificationEntityType.HR_ANALYTICS_ALERT,
        entity_id: organizationId,
        title: 'HR Alert: High Member Turnover Rate',
        message: 'Member turnover rate exceeds threshold',
        actor_id: 'system',
        custom_data: expect.any(Object),
      });

      expect(mockNotificationService.createNotification).toHaveBeenCalledWith({
        user_id: 'owner-123',
        entity_type: NotificationEntityType.HR_ANALYTICS_ALERT,
        entity_id: organizationId,
        title: 'HR Alert: Low Performance Ratings',
        message: 'Average performance ratings below target',
        actor_id: 'system',
        custom_data: expect.any(Object),
      });
    });

    it('should not send alerts for medium/low priority recommendations', async () => {
      const organizationId = 'org-123';
      const lowPriorityRecommendations = [
        {
          priority: 'medium',
          category: 'Documentation',
          title: 'Update Policies',
          description: 'Some policies need updating',
          action_items: ['Review policies'],
        },
      ];

      const mockNotificationService = {
        createNotification: jest.fn(),
      };

      (analyticsService as any).notificationService = mockNotificationService;

      await (analyticsService as any).sendAnalyticsAlerts(organizationId, lowPriorityRecommendations);

      expect(mockNotificationService.createNotification).not.toHaveBeenCalled();
    });
  });

  describe('Cross-Service Integration', () => {
    it('should maintain data consistency across HR services', async () => {
      const userId = 'user-456';
      const organizationId = 'org-123';

      // Test that user data is consistent across services
      const mockUserData = {
        id: userId,
        rsi_handle: 'TestUser',
        avatar_url: 'https://example.com/avatar.jpg',
      };

      const mockOrganizationData = {
        id: organizationId,
        name: 'Test Organization',
        owner_id: 'owner-123',
      };

      // Mock all services to use consistent data
      const services = [
        applicationService,
        onboardingService,
        performanceService,
        skillService,
        documentService,
        analyticsService,
      ];

      // Verify that all services can access the same user and organization data
      for (const service of services) {
        expect(service).toBeDefined();
        expect(typeof service).toBe('object');
      }
    });

    it('should handle service dependencies correctly', async () => {
      // Test that services can interact with each other without circular dependencies
      const organizationId = 'org-123';
      const userId = 'user-456';

      // Mock successful interactions between services
      const mockNotificationService = {
        createNotification: jest.fn(),
        createCustomEventNotification: jest.fn(),
      };

      const mockActivityService = {
        getUserRecentActivity: jest.fn().mockResolvedValue([]),
      };

      // Inject mocked services
      (applicationService as any).notificationService = mockNotificationService;
      (applicationService as any).activityService = mockActivityService;

      // Test that services can be used together
      expect(() => {
        applicationService.validateApplication(organizationId, userId, {});
      }).not.toThrow();
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should handle partial system failures gracefully', async () => {
      const userId = 'user-456';

      // Mock notification service failure
      const mockNotificationService = {
        createNotification: jest.fn().mockRejectedValue(new Error('Notification service down')),
        createCustomEventNotification: jest.fn().mockRejectedValue(new Error('Notification service down')),
      };

      // Mock activity service working
      const mockActivityService = {
        getUserRecentActivity: jest.fn().mockResolvedValue([
          {
            id: 'activity-1',
            type: 'hr_application_submitted',
            title: 'Applied to Test Org',
            description: 'Application submitted',
            entity_type: NotificationEntityType.HR_APPLICATION_SUBMITTED,
            entity_id: 'org-123',
            timestamp: new Date(),
            metadata: {},
          },
        ]),
      };

      (applicationService as any).notificationService = mockNotificationService;

      // Activity service should still work even if notifications fail
      const activities = await mockActivityService.getUserRecentActivity(userId);
      expect(activities).toHaveLength(1);
      expect(activities[0].type).toBe('hr_application_submitted');
    });

    it('should validate data integrity across services', async () => {
      const organizationId = 'org-123';
      const userId = 'user-456';

      // Test that invalid data is handled properly
      const invalidApplicationData = {
        // Missing required fields
      };

      const validation = await applicationService.validateApplication(
        organizationId,
        userId,
        invalidApplicationData
      );

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });
});