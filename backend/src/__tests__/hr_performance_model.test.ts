import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { v4 as uuidv4 } from 'uuid';

// Mock Knex before importing anything that uses it
jest.mock('../config/database', () => {
  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    whereBetween: jest.fn().mockReturnThis(),
    whereNot: jest.fn().mockReturnThis(),
    whereNotNull: jest.fn().mockReturnThis(),
    whereIn: jest.fn().mockReturnThis(),
    join: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    del: jest.fn().mockReturnThis(),
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

jest.mock('../config/logger');

// Import after mocking
import { HRPerformanceModel, HRPerformanceReview, HRPerformanceGoal, CreateHRPerformanceReviewData, UpdateHRPerformanceReviewData, CreateHRPerformanceGoalData, UpdateHRPerformanceGoalData } from '../models/hr_performance_model';

describe('HRPerformanceModel', () => {
  let performanceModel: HRPerformanceModel;
  let testOrganizationId: string;
  let testRevieweeId: string;
  let testReviewerId: string;
  let mockDb: any;

  beforeAll(() => {
    // Get the mocked database
    mockDb = require('../config/database').default;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    performanceModel = new HRPerformanceModel();
    testOrganizationId = uuidv4();
    testRevieweeId = uuidv4();
    testReviewerId = uuidv4();
  });

  describe('validateReviewPeriod', () => {
    it('should return valid for proper date range', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-03-31');

      const result = performanceModel.validateReviewPeriod(startDate, endDate);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return error when start date is after end date', () => {
      const startDate = new Date('2024-03-31');
      const endDate = new Date('2024-01-01');

      const result = performanceModel.validateReviewPeriod(startDate, endDate);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Review period start date must be before end date');
    });

    it('should return error when period exceeds 365 days', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2025-01-02'); // 366 days

      const result = performanceModel.validateReviewPeriod(startDate, endDate);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Review period cannot exceed 365 days');
    });

    it('should allow exactly 365 days', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31'); // Exactly 365 days

      const result = performanceModel.validateReviewPeriod(startDate, endDate);

      expect(result.valid).toBe(true);
    });
  });

  describe('validateRatings', () => {
    it('should return valid for proper ratings', () => {
      const ratings = {
        communication: { score: 4, comments: 'Good communication skills' },
        technical: { score: 5, comments: 'Excellent technical abilities' },
        teamwork: { score: 3, comments: 'Average teamwork' }
      };

      const result = performanceModel.validateRatings(ratings);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return error for score below 1', () => {
      const ratings = {
        communication: { score: 0, comments: 'Poor communication' }
      };

      const result = performanceModel.validateRatings(ratings);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Rating score for communication must be between 1 and 5');
    });

    it('should return error for score above 5', () => {
      const ratings = {
        technical: { score: 6, comments: 'Exceptional' }
      };

      const result = performanceModel.validateRatings(ratings);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Rating score for technical must be between 1 and 5');
    });

    it('should return error for non-numeric score', () => {
      const ratings = {
        teamwork: { score: 'excellent' as any, comments: 'Great teamwork' }
      };

      const result = performanceModel.validateRatings(ratings);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Rating score for teamwork must be between 1 and 5');
    });
  });

  describe('validateReviewConflicts', () => {
    it('should return valid when no conflicts exist', async () => {
      mockDb.first.mockResolvedValue(null);

      const result = await performanceModel.validateReviewConflicts(
        testOrganizationId,
        testRevieweeId,
        new Date('2024-04-01'),
        new Date('2024-06-30')
      );

      expect(result.valid).toBe(true);
    });

    it('should return error for overlapping review periods', async () => {
      mockDb.first.mockResolvedValue({ id: uuidv4() });

      const result = await performanceModel.validateReviewConflicts(
        testOrganizationId,
        testRevieweeId,
        new Date('2024-02-01'),
        new Date('2024-05-31')
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Review period overlaps with existing review');
    });

    it('should allow same period for different reviewee', async () => {
      const differentRevieweeId = uuidv4();
      mockDb.first.mockResolvedValue(null);

      const result = await performanceModel.validateReviewConflicts(
        testOrganizationId,
        differentRevieweeId,
        new Date('2024-01-01'),
        new Date('2024-03-31')
      );

      expect(result.valid).toBe(true);
    });

    it('should exclude specified review from conflict check', async () => {
      const existingReviewId = uuidv4();
      mockDb.first.mockResolvedValue(null);

      const result = await performanceModel.validateReviewConflicts(
        testOrganizationId,
        testRevieweeId,
        new Date('2024-01-01'),
        new Date('2024-03-31'),
        existingReviewId
      );

      expect(result.valid).toBe(true);
    });
  });

  describe('createReview', () => {
    it('should create review with valid data', async () => {
      const reviewData: CreateHRPerformanceReviewData = {
        organization_id: testOrganizationId,
        reviewee_id: testRevieweeId,
        reviewer_id: testReviewerId,
        review_period_start: new Date('2024-01-01'),
        review_period_end: new Date('2024-03-31'),
        ratings: {
          communication: { score: 4, comments: 'Good communication' }
        },
        overall_rating: 4,
        strengths: 'Strong technical skills',
        areas_for_improvement: 'Could improve time management'
      };

      const mockReview = {
        id: uuidv4(),
        ...reviewData,
        status: 'draft',
        goals: [],
        created_at: new Date(),
        updated_at: new Date()
      };

      // Mock the database calls
      mockDb.first.mockResolvedValue(null); // No conflicts
      mockDb.returning.mockResolvedValue([mockReview]);

      const review = await performanceModel.createReview(reviewData);

      expect(review).toBeDefined();
      expect(review.organization_id).toBe(testOrganizationId);
      expect(review.reviewee_id).toBe(testRevieweeId);
      expect(review.reviewer_id).toBe(testReviewerId);
      expect(review.status).toBe('draft');
      expect(review.ratings.communication.score).toBe(4);
      expect(review.overall_rating).toBe(4);
      expect(review.strengths).toBe('Strong technical skills');
      expect(review.areas_for_improvement).toBe('Could improve time management');
      expect(review.goals).toEqual([]);
    });

    it('should throw error for invalid review period', async () => {
      const reviewData: CreateHRPerformanceReviewData = {
        organization_id: testOrganizationId,
        reviewee_id: testRevieweeId,
        reviewer_id: testReviewerId,
        review_period_start: new Date('2024-03-31'),
        review_period_end: new Date('2024-01-01') // Invalid: end before start
      };

      await expect(performanceModel.createReview(reviewData)).rejects.toThrow(
        'Review period start date must be before end date'
      );
    });

    it('should throw error for invalid ratings', async () => {
      const reviewData: CreateHRPerformanceReviewData = {
        organization_id: testOrganizationId,
        reviewee_id: testRevieweeId,
        reviewer_id: testReviewerId,
        review_period_start: new Date('2024-01-01'),
        review_period_end: new Date('2024-03-31'),
        ratings: {
          communication: { score: 6, comments: 'Too high' } // Invalid score
        }
      };

      await expect(performanceModel.createReview(reviewData)).rejects.toThrow(
        'Rating score for communication must be between 1 and 5'
      );
    });

    it('should throw error for conflicting review periods', async () => {
      // Create first review
      const reviewData1: CreateHRPerformanceReviewData = {
        organization_id: testOrganizationId,
        reviewee_id: testRevieweeId,
        reviewer_id: testReviewerId,
        review_period_start: new Date('2024-01-01'),
        review_period_end: new Date('2024-03-31')
      };
      await performanceModel.createReview(reviewData1);

      // Try to create overlapping review
      const reviewData2: CreateHRPerformanceReviewData = {
        organization_id: testOrganizationId,
        reviewee_id: testRevieweeId,
        reviewer_id: testReviewerId,
        review_period_start: new Date('2024-02-01'),
        review_period_end: new Date('2024-05-31')
      };

      await expect(performanceModel.createReview(reviewData2)).rejects.toThrow(
        'Review period overlaps with existing review'
      );
    });
  });

  describe('findReviewById', () => {
    let testReview: HRPerformanceReview;

    beforeEach(async () => {
      const reviewData: CreateHRPerformanceReviewData = {
        organization_id: testOrganizationId,
        reviewee_id: testRevieweeId,
        reviewer_id: testReviewerId,
        review_period_start: new Date('2024-01-01'),
        review_period_end: new Date('2024-03-31')
      };
      testReview = await performanceModel.createReview(reviewData);
    });

    it('should return review when it exists', async () => {
      const foundReview = await performanceModel.findReviewById(testReview.id);

      expect(foundReview).toBeDefined();
      expect(foundReview!.id).toBe(testReview.id);
      expect(foundReview!.organization_id).toBe(testOrganizationId);
      expect(foundReview!.goals).toEqual([]);
    });

    it('should return null when review does not exist', async () => {
      const nonExistentId = uuidv4();
      const review = await performanceModel.findReviewById(nonExistentId);

      expect(review).toBeNull();
    });

    it('should include associated goals', async () => {
      // Create a goal for the review
      const goalData: CreateHRPerformanceGoalData = {
        review_id: testReview.id,
        user_id: testRevieweeId,
        title: 'Improve communication skills',
        description: 'Work on presentation skills'
      };
      await performanceModel.createGoal(goalData);

      const foundReview = await performanceModel.findReviewById(testReview.id);

      expect(foundReview!.goals).toHaveLength(1);
      expect(foundReview!.goals[0].title).toBe('Improve communication skills');
    });
  });

  describe('updateReview', () => {
    let testReview: HRPerformanceReview;

    beforeEach(async () => {
      const reviewData: CreateHRPerformanceReviewData = {
        organization_id: testOrganizationId,
        reviewee_id: testRevieweeId,
        reviewer_id: testReviewerId,
        review_period_start: new Date('2024-01-01'),
        review_period_end: new Date('2024-03-31')
      };
      testReview = await performanceModel.createReview(reviewData);
    });

    it('should update review with valid data', async () => {
      const updateData: UpdateHRPerformanceReviewData = {
        status: 'submitted',
        ratings: {
          communication: { score: 4, comments: 'Good communication' },
          technical: { score: 5, comments: 'Excellent technical skills' }
        },
        strengths: 'Strong problem-solving abilities',
        areas_for_improvement: 'Could improve documentation'
      };

      const updatedReview = await performanceModel.updateReview(testReview.id, updateData);

      expect(updatedReview).toBeDefined();
      expect(updatedReview!.status).toBe('submitted');
      expect(updatedReview!.ratings.communication.score).toBe(4);
      expect(updatedReview!.ratings.technical.score).toBe(5);
      expect(updatedReview!.overall_rating).toBe(4.5); // Average of 4 and 5
      expect(updatedReview!.strengths).toBe('Strong problem-solving abilities');
      expect(updatedReview!.areas_for_improvement).toBe('Could improve documentation');
    });

    it('should calculate overall rating from ratings', async () => {
      const updateData: UpdateHRPerformanceReviewData = {
        ratings: {
          communication: { score: 3 },
          technical: { score: 4 },
          teamwork: { score: 5 }
        }
      };

      const updatedReview = await performanceModel.updateReview(testReview.id, updateData);

      expect(updatedReview!.overall_rating).toBe(4); // Average of 3, 4, 5
    });

    it('should throw error for invalid ratings', async () => {
      const updateData: UpdateHRPerformanceReviewData = {
        ratings: {
          communication: { score: 0 } // Invalid score
        }
      };

      await expect(performanceModel.updateReview(testReview.id, updateData)).rejects.toThrow(
        'Rating score for communication must be between 1 and 5'
      );
    });

    it('should return null for non-existent review', async () => {
      const nonExistentId = uuidv4();
      const updateData: UpdateHRPerformanceReviewData = {
        status: 'submitted'
      };

      const result = await performanceModel.updateReview(nonExistentId, updateData);

      expect(result).toBeNull();
    });
  });

  describe('listReviews', () => {
    beforeEach(async () => {
      // Create test reviews with different statuses and reviewers
      const reviews = [
        { reviewee_id: `${testRevieweeId}_1`, reviewer_id: testReviewerId, status: 'draft' },
        { reviewee_id: `${testRevieweeId}_2`, reviewer_id: testReviewerId, status: 'submitted' },
        { reviewee_id: `${testRevieweeId}_3`, reviewer_id: `${testReviewerId}_2`, status: 'acknowledged' },
        { reviewee_id: `${testRevieweeId}_4`, reviewer_id: testReviewerId, status: 'draft' },
      ];

      for (const [index, reviewData] of reviews.entries()) {
        const review = await performanceModel.createReview({
          organization_id: testOrganizationId,
          reviewee_id: reviewData.reviewee_id,
          reviewer_id: reviewData.reviewer_id,
          review_period_start: new Date('2024-01-01'),
          review_period_end: new Date('2024-03-31')
        });

        if (reviewData.status !== 'draft') {
          await performanceModel.updateReview(review.id, {
            status: reviewData.status as any
          });
        }
      }
    });

    it('should list all reviews for organization', async () => {
      const result = await performanceModel.listReviews(testOrganizationId);

      expect(result.data).toHaveLength(4);
      expect(result.total).toBe(4);
      result.data.forEach(review => {
        expect(review.organization_id).toBe(testOrganizationId);
      });
    });

    it('should filter reviews by reviewee', async () => {
      const result = await performanceModel.listReviews(testOrganizationId, {
        reviewee_id: `${testRevieweeId}_1`
      });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.data[0].reviewee_id).toBe(`${testRevieweeId}_1`);
    });

    it('should filter reviews by reviewer', async () => {
      const result = await performanceModel.listReviews(testOrganizationId, {
        reviewer_id: testReviewerId
      });

      expect(result.data).toHaveLength(3);
      expect(result.total).toBe(3);
      result.data.forEach(review => {
        expect(review.reviewer_id).toBe(testReviewerId);
      });
    });

    it('should filter reviews by status', async () => {
      const result = await performanceModel.listReviews(testOrganizationId, {
        status: 'draft'
      });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      result.data.forEach(review => {
        expect(review.status).toBe('draft');
      });
    });

    it('should apply pagination', async () => {
      const result = await performanceModel.listReviews(testOrganizationId, {
        limit: 2,
        offset: 1
      });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(4);
    });

    it('should return empty result for non-existent organization', async () => {
      const nonExistentOrgId = uuidv4();
      const result = await performanceModel.listReviews(nonExistentOrgId);

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('Goal Management', () => {
    let testReview: HRPerformanceReview;

    beforeEach(async () => {
      const reviewData: CreateHRPerformanceReviewData = {
        organization_id: testOrganizationId,
        reviewee_id: testRevieweeId,
        reviewer_id: testReviewerId,
        review_period_start: new Date('2024-01-01'),
        review_period_end: new Date('2024-03-31')
      };
      testReview = await performanceModel.createReview(reviewData);
    });

    describe('createGoal', () => {
      it('should create goal with valid data', async () => {
        const goalData: CreateHRPerformanceGoalData = {
          review_id: testReview.id,
          user_id: testRevieweeId,
          title: 'Improve communication skills',
          description: 'Work on presentation and documentation skills',
          target_date: new Date('2024-06-30')
        };

        const goal = await performanceModel.createGoal(goalData);

        expect(goal).toBeDefined();
        expect(goal.id).toBeDefined();
        expect(goal.review_id).toBe(testReview.id);
        expect(goal.user_id).toBe(testRevieweeId);
        expect(goal.title).toBe('Improve communication skills');
        expect(goal.description).toBe('Work on presentation and documentation skills');
        expect(goal.target_date).toEqual(new Date('2024-06-30'));
        expect(goal.status).toBe('not_started');
        expect(goal.progress_percentage).toBe(0);
        expect(goal.created_at).toBeDefined();
        expect(goal.updated_at).toBeDefined();
      });

      it('should create goal without optional fields', async () => {
        const goalData: CreateHRPerformanceGoalData = {
          review_id: testReview.id,
          user_id: testRevieweeId,
          title: 'Basic goal'
        };

        const goal = await performanceModel.createGoal(goalData);

        expect(goal.title).toBe('Basic goal');
        expect(goal.description).toBeUndefined();
        expect(goal.target_date).toBeUndefined();
        expect(goal.status).toBe('not_started');
        expect(goal.progress_percentage).toBe(0);
      });
    });

    describe('updateGoal', () => {
      let testGoal: HRPerformanceGoal;

      beforeEach(async () => {
        const goalData: CreateHRPerformanceGoalData = {
          review_id: testReview.id,
          user_id: testRevieweeId,
          title: 'Test goal',
          description: 'Test description'
        };
        testGoal = await performanceModel.createGoal(goalData);
      });

      it('should update goal with valid data', async () => {
        const updateData: UpdateHRPerformanceGoalData = {
          title: 'Updated goal title',
          description: 'Updated description',
          status: 'in_progress',
          progress_percentage: 50,
          target_date: new Date('2024-12-31')
        };

        const updatedGoal = await performanceModel.updateGoal(testGoal.id, updateData);

        expect(updatedGoal).toBeDefined();
        expect(updatedGoal!.title).toBe('Updated goal title');
        expect(updatedGoal!.description).toBe('Updated description');
        expect(updatedGoal!.status).toBe('in_progress');
        expect(updatedGoal!.progress_percentage).toBe(50);
        expect(updatedGoal!.target_date).toEqual(new Date('2024-12-31'));
      });

      it('should return null for non-existent goal', async () => {
        const nonExistentId = uuidv4();
        const updateData: UpdateHRPerformanceGoalData = {
          title: 'Updated title'
        };

        const result = await performanceModel.updateGoal(nonExistentId, updateData);

        expect(result).toBeNull();
      });
    });

    describe('updateGoalProgress', () => {
      let testGoal: HRPerformanceGoal;

      beforeEach(async () => {
        const goalData: CreateHRPerformanceGoalData = {
          review_id: testReview.id,
          user_id: testRevieweeId,
          title: 'Test goal'
        };
        testGoal = await performanceModel.createGoal(goalData);
      });

      it('should update progress and status correctly', async () => {
        const updatedGoal = await performanceModel.updateGoalProgress(testGoal.id, 75, 'Good progress');

        expect(updatedGoal).toBeDefined();
        expect(updatedGoal!.progress_percentage).toBe(75);
        expect(updatedGoal!.status).toBe('in_progress');
        expect(updatedGoal!.description).toBe('Good progress');
      });

      it('should set status to completed when progress is 100%', async () => {
        const updatedGoal = await performanceModel.updateGoalProgress(testGoal.id, 100);

        expect(updatedGoal!.progress_percentage).toBe(100);
        expect(updatedGoal!.status).toBe('completed');
      });

      it('should set status to not_started when progress is 0%', async () => {
        // First set to in_progress
        await performanceModel.updateGoalProgress(testGoal.id, 50);
        
        // Then back to 0
        const updatedGoal = await performanceModel.updateGoalProgress(testGoal.id, 0);

        expect(updatedGoal!.progress_percentage).toBe(0);
        expect(updatedGoal!.status).toBe('not_started');
      });

      it('should throw error for invalid progress percentage', async () => {
        await expect(performanceModel.updateGoalProgress(testGoal.id, -10)).rejects.toThrow(
          'Progress percentage must be between 0 and 100'
        );

        await expect(performanceModel.updateGoalProgress(testGoal.id, 150)).rejects.toThrow(
          'Progress percentage must be between 0 and 100'
        );
      });
    });

    describe('getGoalsByReviewId', () => {
      beforeEach(async () => {
        // Create multiple goals for the review
        const goals = [
          { title: 'Goal 1', description: 'First goal' },
          { title: 'Goal 2', description: 'Second goal' },
          { title: 'Goal 3', description: 'Third goal' }
        ];

        for (const goalData of goals) {
          await performanceModel.createGoal({
            review_id: testReview.id,
            user_id: testRevieweeId,
            title: goalData.title,
            description: goalData.description
          });
        }
      });

      it('should return all goals for a review', async () => {
        const goals = await performanceModel.getGoalsByReviewId(testReview.id);

        expect(goals).toHaveLength(3);
        expect(goals[0].title).toBe('Goal 1');
        expect(goals[1].title).toBe('Goal 2');
        expect(goals[2].title).toBe('Goal 3');
      });

      it('should return empty array for review with no goals', async () => {
        const emptyReview = await performanceModel.createReview({
          organization_id: testOrganizationId,
          reviewee_id: `${testRevieweeId}_empty`,
          reviewer_id: testReviewerId,
          review_period_start: new Date('2024-01-01'),
          review_period_end: new Date('2024-03-31')
        });

        const goals = await performanceModel.getGoalsByReviewId(emptyReview.id);

        expect(goals).toHaveLength(0);
      });
    });
  });

  describe('Analytics Methods', () => {
    beforeEach(async () => {
      // Create test data for analytics
      const reviews = [
        { status: 'draft', overall_rating: null },
        { status: 'submitted', overall_rating: 4.0 },
        { status: 'acknowledged', overall_rating: 3.5 },
        { status: 'acknowledged', overall_rating: 4.5 }
      ];

      for (const [index, reviewData] of reviews.entries()) {
        const review = await performanceModel.createReview({
          organization_id: testOrganizationId,
          reviewee_id: `${testRevieweeId}_${index}`,
          reviewer_id: testReviewerId,
          review_period_start: new Date('2024-01-01'),
          review_period_end: new Date('2024-03-31')
        });

        if (reviewData.status !== 'draft') {
          await performanceModel.updateReview(review.id, {
            status: reviewData.status as any,
            overall_rating: reviewData.overall_rating || undefined
          });
        }

        // Create goals for each review
        const goal1 = await performanceModel.createGoal({
          review_id: review.id,
          user_id: `${testRevieweeId}_${index}`,
          title: `Goal 1 for review ${index}`
        });

        const goal2 = await performanceModel.createGoal({
          review_id: review.id,
          user_id: `${testRevieweeId}_${index}`,
          title: `Goal 2 for review ${index}`
        });

        // Set different goal statuses
        if (index % 2 === 0) {
          await performanceModel.updateGoal(goal1.id, { status: 'completed' });
        } else {
          await performanceModel.updateGoal(goal1.id, { status: 'in_progress' });
        }
      }
    });

    describe('getPerformanceAnalytics', () => {
      it('should return correct analytics', async () => {
        const analytics = await performanceModel.getPerformanceAnalytics(testOrganizationId);

        expect(analytics.total_reviews).toBe(4);
        expect(analytics.average_rating).toBe(4.0); // Average of 4.0, 3.5, 4.5
        expect(analytics.reviews_by_status.draft).toBe(1);
        expect(analytics.reviews_by_status.submitted).toBe(1);
        expect(analytics.reviews_by_status.acknowledged).toBe(2);
        expect(analytics.goals_completion_rate).toBe(25); // 2 completed out of 8 total goals
        expect(analytics.improvement_plans_active).toBe(2); // 2 in_progress goals
      });

      it('should return zero analytics for non-existent organization', async () => {
        const nonExistentOrgId = uuidv4();
        const analytics = await performanceModel.getPerformanceAnalytics(nonExistentOrgId);

        expect(analytics.total_reviews).toBe(0);
        expect(analytics.average_rating).toBe(0);
        expect(analytics.reviews_by_status.draft).toBe(0);
        expect(analytics.reviews_by_status.submitted).toBe(0);
        expect(analytics.reviews_by_status.acknowledged).toBe(0);
        expect(analytics.goals_completion_rate).toBe(0);
        expect(analytics.improvement_plans_active).toBe(0);
      });
    });
  });

  describe('Review Cycle Management', () => {
    describe('getNextReviewDueDate', () => {
      it('should return 90 days from now for new employee with no reviews', async () => {
        mockDb.first.mockResolvedValue(null);

        const dueDate = await performanceModel.getNextReviewDueDate(testRevieweeId, testOrganizationId);

        expect(dueDate).toBeDefined();
        const expectedDate = new Date();
        expectedDate.setDate(expectedDate.getDate() + 90);
        
        // Allow for small time differences in test execution
        const timeDiff = Math.abs(dueDate!.getTime() - expectedDate.getTime());
        expect(timeDiff).toBeLessThan(1000); // Less than 1 second difference
      });

      it('should return 365 days from last review end for existing employee', async () => {
        const lastReviewEnd = new Date('2023-12-31');
        mockDb.first.mockResolvedValue({
          review_period_end: lastReviewEnd
        });

        const dueDate = await performanceModel.getNextReviewDueDate(testRevieweeId, testOrganizationId);

        expect(dueDate).toBeDefined();
        const expectedDate = new Date(lastReviewEnd);
        expectedDate.setDate(expectedDate.getDate() + 365);
        
        expect(dueDate!.getTime()).toBe(expectedDate.getTime());
      });
    });

    describe('getUpcomingReviews', () => {
      it('should return upcoming reviews within specified days', async () => {
        const mockMembers = [
          {
            user_id: testRevieweeId,
            rsi_handle: 'testuser1',
            discord_username: 'testuser1#1234',
            joined_at: new Date('2023-01-01'),
            last_review_end: null
          }
        ];
        mockDb.returning.mockResolvedValue(mockMembers);

        const upcomingReviews = await performanceModel.getUpcomingReviews(testOrganizationId, 120);

        expect(upcomingReviews).toHaveLength(1);
        expect(upcomingReviews[0].user_id).toBe(testRevieweeId);
        expect(upcomingReviews[0].rsi_handle).toBe('testuser1');
      });

      it('should return empty array when no reviews are due', async () => {
        mockDb.returning.mockResolvedValue([]);

        const upcomingReviews = await performanceModel.getUpcomingReviews(testOrganizationId, 1);

        expect(upcomingReviews).toHaveLength(0);
      });
    });
  });
});