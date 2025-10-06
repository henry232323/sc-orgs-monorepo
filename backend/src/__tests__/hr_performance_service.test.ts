import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { HRPerformanceService, PerformanceAnalytics, ReviewCycleSchedule, ImprovementPlan } from '../services/hr_performance_service';
import { HRPerformanceModel, HRPerformanceReview, HRPerformanceGoal } from '../models/hr_performance_model';
import { NotificationService } from '../services/notification_service';
import { NotificationEntityType } from '../types/notification';
import { v4 as uuidv4 } from 'uuid';

// Mock dependencies
jest.mock('../models/hr_performance_model');
jest.mock('../services/notification_service');
jest.mock('../models/organization_model');
jest.mock('../config/logger');

// Mock database with proper structure
jest.mock('../config/database', () => {
  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    whereBetween: jest.fn().mockReturnThis(),
    join: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    returning: jest.fn(),
    first: jest.fn(),
    clone: jest.fn().mockReturnThis(),
    clearSelect: jest.fn().mockReturnThis(),
    count: jest.fn().mockReturnThis(),
    max: jest.fn().mockReturnThis(),
    as: jest.fn().mockReturnThis(),
    raw: jest.fn().mockReturnThis(),
  };

  const mockDb = jest.fn().mockReturnValue(mockQueryBuilder);
  Object.assign(mockDb, mockQueryBuilder);
  
  return {
    __esModule: true,
    default: mockDb,
  };
});

const MockedHRPerformanceModel = HRPerformanceModel as jest.MockedClass<typeof HRPerformanceModel>;
const MockedNotificationService = NotificationService as jest.MockedClass<typeof NotificationService>;

describe('HRPerformanceService', () => {
  let service: HRPerformanceService;
  let mockPerformanceModel: jest.Mocked<HRPerformanceModel>;
  let mockNotificationService: jest.Mocked<NotificationService>;
  let mockDb: any;

  const testOrganizationId = uuidv4();
  const testUserId = uuidv4();
  const testRevieweeId = uuidv4();
  const testReviewerId = uuidv4();
  const testReviewId = uuidv4();

  const mockReview: HRPerformanceReview = {
    id: testReviewId,
    organization_id: testOrganizationId,
    reviewee_id: testRevieweeId,
    reviewer_id: testReviewerId,
    review_period_start: new Date('2024-01-01'),
    review_period_end: new Date('2024-03-31'),
    status: 'draft',
    ratings: {
      communication: { score: 4, comments: 'Good communication' },
      technical: { score: 3, comments: 'Needs improvement' }
    },
    overall_rating: 3.5,
    strengths: 'Strong problem-solving skills',
    areas_for_improvement: 'Communication skills\nTime management',
    goals: [],
    created_at: new Date(),
    updated_at: new Date()
  };

  const mockOrganization = {
    id: testOrganizationId,
    owner_id: testUserId,
    name: 'Test Organization'
  };

  beforeAll(() => {
    // Mock database
    mockDb = {
      raw: jest.fn(),
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      join: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      returning: jest.fn(),
      first: jest.fn(),
      clone: jest.fn().mockReturnThis(),
      clearSelect: jest.fn().mockReturnThis(),
      count: jest.fn().mockReturnThis(),
      max: jest.fn().mockReturnThis(),
      as: jest.fn().mockReturnThis()
    };

    // Get the mocked database
    mockDb = require('../config/database').default;

    mockPerformanceModel = {
      getPerformanceAnalytics: jest.fn(),
      getPerformanceTrends: jest.fn(),
      findReviewById: jest.fn(),
      updateReview: jest.fn(),
      getGoalsByReviewId: jest.fn(),
      listReviews: jest.fn(),
      getReviewsWithUserInfo: jest.fn(),
    } as any;

    mockNotificationService = {
      createCustomEventNotification: jest.fn(),
    } as any;

    MockedHRPerformanceModel.mockImplementation(() => mockPerformanceModel);
    MockedNotificationService.mockImplementation(() => mockNotificationService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    service = new HRPerformanceService();
  });

  describe('scheduleReviewCycles', () => {
    beforeEach(() => {
      // Mock database queries for review cycle scheduling
      mockDb.returning.mockResolvedValue([
        {
          user_id: testRevieweeId,
          rsi_handle: 'testuser1',
          discord_username: 'testuser1#1234',
          joined_at: new Date('2023-01-01'),
          last_review_date: undefined
        },
        {
          user_id: `${testRevieweeId}_2`,
          rsi_handle: 'testuser2',
          discord_username: 'testuser2#5678',
          joined_at: new Date('2022-01-01'),
          last_review_date: new Date('2023-12-31')
        }
      ]);
    });

    it('should schedule review cycles for organization members', async () => {
      const schedules = await service.scheduleReviewCycles(testOrganizationId);

      expect(schedules).toHaveLength(2);
      
      // First user (new employee) - 90 days from join date
      expect(schedules[0].user_id).toBe(testRevieweeId);
      expect(schedules[0].rsi_handle).toBe('testuser1');
      expect(schedules[0].last_review_date).toBeNull();
      
      // Second user (existing employee) - 365 days from last review
      expect(schedules[1].user_id).toBe(`${testRevieweeId}_2`);
      expect(schedules[1].rsi_handle).toBe('testuser2');
      expect(schedules[1].last_review_date).toEqual(new Date('2023-12-31'));
    });

    it('should calculate correct due dates and overdue status', async () => {
      // Mock a user with overdue review
      mockDb.returning.mockResolvedValue([
        {
          user_id: testRevieweeId,
          rsi_handle: 'overdue_user',
          discord_username: 'overdue#1234',
          joined_at: new Date('2022-01-01'),
          last_review_date: new Date('2022-12-31') // Over a year ago
        }
      ]);

      const schedules = await service.scheduleReviewCycles(testOrganizationId);

      expect(schedules).toHaveLength(1);
      expect(schedules[0].is_overdue).toBe(true);
      expect(schedules[0].days_until_due).toBeLessThan(0);
    });

    it('should sort schedules with overdue first', async () => {
      mockDb.returning.mockResolvedValue([
        {
          user_id: `${testRevieweeId}_upcoming`,
          rsi_handle: 'upcoming_user',
          discord_username: 'upcoming#1234',
          joined_at: new Date(),
          last_review_date: undefined
        },
        {
          user_id: `${testRevieweeId}_overdue`,
          rsi_handle: 'overdue_user',
          discord_username: 'overdue#5678',
          joined_at: new Date('2022-01-01'),
          last_review_date: new Date('2022-12-31')
        }
      ]);

      const schedules = await service.scheduleReviewCycles(testOrganizationId);

      expect(schedules).toHaveLength(2);
      expect(schedules[0].rsi_handle).toBe('overdue_user');
      expect(schedules[0].is_overdue).toBe(true);
      expect(schedules[1].rsi_handle).toBe('upcoming_user');
      expect(schedules[1].is_overdue).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      mockDb.returning.mockRejectedValue(new Error('Database connection failed'));

      const schedules = await service.scheduleReviewCycles(testOrganizationId);

      expect(schedules).toEqual([]);
    });
  });

  describe('sendReviewCycleNotifications', () => {
    it('should send notifications for overdue reviews', async () => {
      const mockSchedules: ReviewCycleSchedule[] = [
        {
          user_id: testRevieweeId,
          rsi_handle: 'overdue_user',
          discord_username: 'overdue#1234',
          last_review_date: new Date('2022-12-31'),
          next_due_date: new Date('2023-12-31'),
          days_until_due: -30,
          is_overdue: true
        }
      ];

      jest.spyOn(service, 'scheduleReviewCycles').mockResolvedValue(mockSchedules);

      await service.sendReviewCycleNotifications(testOrganizationId);

      expect(mockNotificationService.createCustomEventNotification).toHaveBeenCalledWith(
        NotificationEntityType.ORGANIZATION_UPDATED,
        testOrganizationId,
        'system',
        [testUserId],
        'Overdue Performance Reviews',
        '1 performance reviews are overdue',
        expect.objectContaining({
          overdue_count: 1,
          overdue_reviews: expect.arrayContaining([
            expect.objectContaining({
              user_id: testRevieweeId,
              rsi_handle: 'overdue_user',
              days_overdue: 30
            })
          ])
        })
      );
    });

    it('should send notifications for upcoming reviews', async () => {
      const mockSchedules: ReviewCycleSchedule[] = [
        {
          user_id: testRevieweeId,
          rsi_handle: 'upcoming_user',
          discord_username: 'upcoming#1234',
          last_review_date: undefined,
          next_due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
          days_until_due: 5,
          is_overdue: false
        }
      ];

      jest.spyOn(service, 'scheduleReviewCycles').mockResolvedValue(mockSchedules);

      await service.sendReviewCycleNotifications(testOrganizationId);

      expect(mockNotificationService.createCustomEventNotification).toHaveBeenCalledWith(
        NotificationEntityType.ORGANIZATION_UPDATED,
        testOrganizationId,
        'system',
        [testUserId],
        'Upcoming Performance Reviews',
        '1 performance reviews are due within 7 days',
        expect.objectContaining({
          upcoming_count: 1,
          upcoming_reviews: expect.arrayContaining([
            expect.objectContaining({
              user_id: testRevieweeId,
              rsi_handle: 'upcoming_user',
              days_until_due: 5
            })
          ])
        })
      );
    });

    it('should send early warning notifications', async () => {
      const mockSchedules: ReviewCycleSchedule[] = [
        {
          user_id: testRevieweeId,
          rsi_handle: 'early_warning_user',
          discord_username: 'early#1234',
          last_review_date: undefined,
          next_due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Exactly 30 days from now
          days_until_due: 30,
          is_overdue: false
        }
      ];

      jest.spyOn(service, 'scheduleReviewCycles').mockResolvedValue(mockSchedules);

      await service.sendReviewCycleNotifications(testOrganizationId);

      expect(mockNotificationService.createCustomEventNotification).toHaveBeenCalledWith(
        NotificationEntityType.ORGANIZATION_UPDATED,
        testOrganizationId,
        'system',
        [testUserId],
        'Performance Reviews Due Soon',
        '1 performance reviews are due in 30 days',
        expect.objectContaining({
          early_warning_count: 1
        })
      );
    });

    it('should handle notification errors gracefully', async () => {
      const mockSchedules: ReviewCycleSchedule[] = [
        {
          user_id: testRevieweeId,
          rsi_handle: 'test_user',
          discord_username: 'test#1234',
          last_review_date: undefined,
          next_due_date: new Date(),
          days_until_due: -10,
          is_overdue: true
        }
      ];

      jest.spyOn(service, 'scheduleReviewCycles').mockResolvedValue(mockSchedules);
      mockNotificationService.createCustomEventNotification.mockRejectedValue(new Error('Notification failed'));

      // Should not throw error
      await expect(service.sendReviewCycleNotifications(testOrganizationId)).resolves.not.toThrow();
    });
  });

  describe('generatePerformanceAnalytics', () => {
    it('should generate comprehensive analytics', async () => {
      const mockBasicAnalytics = {
        total_reviews: 10,
        average_rating: 4.2,
        reviews_by_status: {
          draft: 2,
          submitted: 3,
          acknowledged: 5
        },
        goals_completion_rate: 75,
        improvement_plans_active: 3
      };

      const mockTrends = [
        { period: '2024-01-01', average_rating: 4.0, total_reviews: 5 },
        { period: '2024-02-01', average_rating: 4.2, total_reviews: 8 }
      ];

      const mockTopPerformers = [
        { user_id: testRevieweeId, rsi_handle: 'top_performer', average_rating: 4.8, total_reviews: 3 }
      ];

      mockPerformanceModel.getPerformanceAnalytics.mockResolvedValue(mockBasicAnalytics);
      mockPerformanceModel.getPerformanceTrends.mockResolvedValue(mockTrends);

      // Mock top performers query
      mockDb.returning.mockResolvedValue(mockTopPerformers);

      // Mock review cycle compliance
      jest.spyOn(service, 'scheduleReviewCycles').mockResolvedValue([
        {
          user_id: testRevieweeId,
          rsi_handle: 'test_user',
          discord_username: 'test#1234',
          last_review_date: undefined,
          next_due_date: new Date(),
          days_until_due: 15,
          is_overdue: false
        }
      ]);

      const analytics = await service.generatePerformanceAnalytics(testOrganizationId);

      expect(analytics.total_reviews).toBe(10);
      expect(analytics.average_rating).toBe(4.2);
      expect(analytics.performance_trends).toEqual(mockTrends);
      expect(analytics.top_performers).toEqual(mockTopPerformers);
      expect(analytics.review_cycle_compliance.upcoming).toBe(1);
      expect(analytics.review_cycle_compliance.overdue).toBe(0);
      expect(analytics.review_cycle_compliance.on_time).toBe(0);
    });

    it('should return empty analytics on error', async () => {
      mockPerformanceModel.getPerformanceAnalytics.mockRejectedValue(new Error('Database error'));

      const analytics = await service.generatePerformanceAnalytics(testOrganizationId);

      expect(analytics.total_reviews).toBe(0);
      expect(analytics.average_rating).toBe(0);
      expect(analytics.performance_trends).toEqual([]);
      expect(analytics.top_performers).toEqual([]);
    });
  });

  describe('createImprovementPlan', () => {
    it('should create improvement plan successfully', async () => {
      const areasForImprovement = ['Communication skills', 'Time management'];
      const actionItems = [
        { description: 'Take communication course', target_date: new Date('2024-06-30') },
        { description: 'Use time tracking tools', target_date: new Date('2024-07-31') }
      ];

      const mockCreatedPlan = {
        id: uuidv4(),
        review_id: testReviewId,
        user_id: testRevieweeId,
        areas_for_improvement: areasForImprovement,
        action_items: actionItems.map(item => ({ ...item, status: 'not_started' as const })),
        progress_percentage: 0,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockDb.returning.mockResolvedValue([mockCreatedPlan]);

      const result = await service.createImprovementPlan(
        testReviewId,
        testRevieweeId,
        areasForImprovement,
        actionItems
      );

      expect(result.review_id).toBe(testReviewId);
      expect(result.user_id).toBe(testRevieweeId);
      expect(result.areas_for_improvement).toEqual(areasForImprovement);
      expect(result.action_items).toHaveLength(2);
      expect(result.action_items[0].status).toBe('not_started');
      expect(result.progress_percentage).toBe(0);

      // Should send notification
      expect(mockNotificationService.createCustomEventNotification).toHaveBeenCalledWith(
        NotificationEntityType.ORGANIZATION_UPDATED,
        '',
        'system',
        [testRevieweeId],
        'Improvement Plan Created',
        'An improvement plan has been created based on your performance review',
        expect.objectContaining({
          plan_id: result.id,
          review_id: testReviewId,
          action_items_count: 2
        })
      );
    });

    it('should handle database errors', async () => {
      mockDb.returning.mockRejectedValue(new Error('Database insert failed'));

      await expect(service.createImprovementPlan(
        testReviewId,
        testRevieweeId,
        ['Test area'],
        [{ description: 'Test action', target_date: new Date() }]
      )).rejects.toThrow('Database insert failed');
    });
  });

  describe('updateImprovementPlanProgress', () => {
    it('should update action item progress successfully', async () => {
      const mockCurrentPlan = {
        id: uuidv4(),
        review_id: testReviewId,
        user_id: testRevieweeId,
        areas_for_improvement: JSON.stringify(['Communication']),
        action_items: JSON.stringify([
          { description: 'Action 1', status: 'not_started' },
          { description: 'Action 2', status: 'not_started' }
        ]),
        progress_percentage: 0,
        created_at: new Date(),
        updated_at: new Date()
      };

      const mockUpdatedPlan = {
        ...mockCurrentPlan,
        action_items: JSON.stringify([
          { description: 'Action 1', status: 'completed' },
          { description: 'Action 2', status: 'not_started' }
        ]),
        progress_percentage: 50,
        updated_at: new Date()
      };

      mockDb.first.mockResolvedValue(mockCurrentPlan);
      mockDb.returning.mockResolvedValue([mockUpdatedPlan]);

      const result = await service.updateImprovementPlanProgress(
        mockCurrentPlan.id,
        0,
        'completed'
      );

      expect(result).toBeDefined();
      expect(result!.progress_percentage).toBe(50);
      expect(result!.action_items[0].status).toBe('completed');
    });

    it('should send completion notification when plan is 100% complete', async () => {
      const mockCurrentPlan = {
        id: uuidv4(),
        review_id: testReviewId,
        user_id: testRevieweeId,
        areas_for_improvement: JSON.stringify(['Communication']),
        action_items: JSON.stringify([
          { description: 'Action 1', status: 'completed' }
        ]),
        progress_percentage: 0,
        created_at: new Date(),
        updated_at: new Date()
      };

      const mockUpdatedPlan = {
        ...mockCurrentPlan,
        progress_percentage: 100,
        updated_at: new Date()
      };

      mockDb.first.mockResolvedValue(mockCurrentPlan);
      mockDb.returning.mockResolvedValue([mockUpdatedPlan]);

      await service.updateImprovementPlanProgress(
        mockCurrentPlan.id,
        0,
        'completed'
      );

      expect(mockNotificationService.createCustomEventNotification).toHaveBeenCalledWith(
        NotificationEntityType.ORGANIZATION_UPDATED,
        '',
        testRevieweeId,
        [],
        'Improvement Plan Completed',
        'An improvement plan has been successfully completed',
        expect.objectContaining({
          plan_id: mockCurrentPlan.id,
          review_id: testReviewId,
          user_id: testRevieweeId
        })
      );
    });

    it('should return null for non-existent plan', async () => {
      mockDb.first.mockResolvedValue(null);

      const result = await service.updateImprovementPlanProgress(
        uuidv4(),
        0,
        'completed'
      );

      expect(result).toBeNull();
    });

    it('should handle invalid action item index', async () => {
      const mockCurrentPlan = {
        id: uuidv4(),
        action_items: JSON.stringify([{ description: 'Action 1', status: 'not_started' }])
      };

      mockDb.first.mockResolvedValue(mockCurrentPlan);

      const result = await service.updateImprovementPlanProgress(
        mockCurrentPlan.id,
        5, // Invalid index
        'completed'
      );

      expect(result).toBeNull();
    });
  });

  describe('generatePerformanceReport', () => {
    it('should generate JSON report successfully', async () => {
      const mockReviews = [mockReview];
      mockDb.returning.mockResolvedValue(mockReviews);
      mockPerformanceModel.getGoalsByReviewId.mockResolvedValue([]);

      const report = await service.generatePerformanceReport(testOrganizationId, {
        format: 'json',
        includeGoals: true
      });

      expect(report.organization_id).toBe(testOrganizationId);
      expect(report.total_reviews).toBe(1);
      expect(report.reviews).toEqual(mockReviews);
      expect(report.generated_at).toBeDefined();
    });

    it('should generate CSV report successfully', async () => {
      const mockReviews = [{
        ...mockReview,
        reviewee_rsi_handle: 'reviewee_handle',
        reviewer_rsi_handle: 'reviewer_handle'
      }];
      mockDb.returning.mockResolvedValue(mockReviews);

      const csvReport = await service.generatePerformanceReport(testOrganizationId, {
        format: 'csv'
      });

      expect(typeof csvReport).toBe('string');
      expect(csvReport).toContain('Review ID');
      expect(csvReport).toContain('Reviewee RSI Handle');
      expect(csvReport).toContain('reviewer_handle');
    });

    it('should filter by date period', async () => {
      const period = {
        start: new Date('2024-01-01'),
        end: new Date('2024-03-31')
      };

      mockDb.returning.mockResolvedValue([mockReview]);

      await service.generatePerformanceReport(testOrganizationId, {
        format: 'json',
        period
      });

      expect(mockDb.whereBetween).toHaveBeenCalledWith(
        'hr_performance_reviews.created_at',
        [period.start, period.end]
      );
    });

    it('should include improvement plans when requested', async () => {
      const mockReviews = [mockReview];
      const mockImprovementPlans = [{
        id: uuidv4(),
        review_id: testReviewId,
        areas_for_improvement: JSON.stringify(['Communication']),
        action_items: JSON.stringify([{ description: 'Test action', status: 'not_started' }])
      }];

      mockDb.returning.mockResolvedValueOnce(mockReviews);
      mockDb.select.mockResolvedValue(mockImprovementPlans);

      const report = await service.generatePerformanceReport(testOrganizationId, {
        format: 'json',
        includeImprovementPlans: true
      });

      expect(report.reviews[0].improvement_plans).toBeDefined();
      expect(report.reviews[0].improvement_plans).toHaveLength(1);
    });
  });

  describe('processReviewSubmission', () => {
    it('should process review submission successfully', async () => {
      const submittedReview = {
        ...mockReview,
        status: 'submitted' as const
      };

      mockPerformanceModel.findReviewById.mockResolvedValue(mockReview);
      mockPerformanceModel.updateReview.mockResolvedValue(submittedReview);

      const result = await service.processReviewSubmission(testReviewId, testReviewerId);

      expect(result).toEqual(submittedReview);
      expect(mockPerformanceModel.updateReview).toHaveBeenCalledWith(testReviewId, {
        status: 'submitted'
      });

      // Should send notification to reviewee
      expect(mockNotificationService.createCustomEventNotification).toHaveBeenCalledWith(
        NotificationEntityType.ORGANIZATION_UPDATED,
        testOrganizationId,
        testReviewerId,
        [testRevieweeId],
        'Performance Review Completed',
        'Your performance review has been completed and is ready for your acknowledgment',
        expect.objectContaining({
          review_id: testReviewId,
          overall_rating: 3.5
        })
      );
    });

    it('should create automatic improvement plan for low ratings', async () => {
      const lowRatingReview = {
        ...mockReview,
        overall_rating: 2.5,
        status: 'submitted' as const
      };

      mockPerformanceModel.findReviewById.mockResolvedValue(mockReview);
      mockPerformanceModel.updateReview.mockResolvedValue(lowRatingReview);

      // Mock improvement plan creation
      const mockCreatedPlan = {
        id: uuidv4(),
        review_id: testReviewId,
        user_id: testRevieweeId,
        areas_for_improvement: ['Communication skills', 'Time management'],
        action_items: [
          { description: 'Address: Communication skills', target_date: new Date(), status: 'not_started' as const },
          { description: 'Address: Time management', target_date: new Date(), status: 'not_started' as const }
        ],
        progress_percentage: 0,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockDb.returning.mockResolvedValue([mockCreatedPlan]);

      const result = await service.processReviewSubmission(testReviewId, testReviewerId);

      expect(result).toEqual(lowRatingReview);
      
      // Should create improvement plan for low rating
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should throw error for non-existent review', async () => {
      mockPerformanceModel.findReviewById.mockResolvedValue(null);

      await expect(service.processReviewSubmission(testReviewId, testReviewerId))
        .rejects.toThrow('Review not found');
    });

    it('should throw error when update fails', async () => {
      mockPerformanceModel.findReviewById.mockResolvedValue(mockReview);
      mockPerformanceModel.updateReview.mockResolvedValue(null);

      await expect(service.processReviewSubmission(testReviewId, testReviewerId))
        .rejects.toThrow('Failed to update review status');
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors in analytics', async () => {
      mockPerformanceModel.getPerformanceAnalytics.mockRejectedValue(new Error('Connection failed'));

      const analytics = await service.generatePerformanceAnalytics(testOrganizationId);

      expect(analytics.total_reviews).toBe(0);
      expect(analytics.average_rating).toBe(0);
    });

    it('should handle notification service errors gracefully', async () => {
      mockNotificationService.createCustomEventNotification.mockRejectedValue(new Error('Notification failed'));

      const mockSchedules: ReviewCycleSchedule[] = [{
        user_id: testRevieweeId,
        rsi_handle: 'test_user',
        discord_username: 'test#1234',
        last_review_date: undefined,
        next_due_date: new Date(),
        days_until_due: -10,
        is_overdue: true
      }];

      jest.spyOn(service, 'scheduleReviewCycles').mockResolvedValue(mockSchedules);

      // Should not throw error
      await expect(service.sendReviewCycleNotifications(testOrganizationId)).resolves.not.toThrow();
    });

    it('should handle improvement plan creation errors', async () => {
      mockDb.returning.mockRejectedValue(new Error('Database error'));

      await expect(service.createImprovementPlan(
        testReviewId,
        testRevieweeId,
        ['Test area'],
        [{ description: 'Test action', target_date: new Date() }]
      )).rejects.toThrow('Database error');
    });
  });
});