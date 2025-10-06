import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { HRPerformanceController } from '../controllers/hr_performance_controller';
import { HRPerformanceModel } from '../models/hr_performance_model';
import { v4 as uuidv4 } from 'uuid';

// Mock dependencies
jest.mock('../models/hr_performance_model');
jest.mock('../models/organization_model');
jest.mock('../config/logger');

const MockedHRPerformanceModel = HRPerformanceModel as jest.MockedClass<typeof HRPerformanceModel>;

describe('HRPerformanceController', () => {
  let app: express.Application;
  let controller: HRPerformanceController;
  let mockPerformanceModel: jest.Mocked<HRPerformanceModel>;
  
  const testOrganizationId = uuidv4();
  const testUserId = uuidv4();
  const testRevieweeId = uuidv4();
  const testReviewId = uuidv4();
  const testGoalId = uuidv4();

  const mockOrganization: any = {
    id: testOrganizationId,
    rsi_org_id: 'TEST_ORG',
    name: 'Test Organization',
    owner_id: testUserId,
    is_registered: true,
    languages: [],
    total_upvotes: 0,
    total_members: 1
  };

  const mockUser = {
    id: testUserId,
    rsi_handle: 'testuser'
  };

  const mockReview = {
    id: testReviewId,
    organization_id: testOrganizationId,
    reviewee_id: testRevieweeId,
    reviewer_id: testUserId,
    review_period_start: new Date('2024-01-01'),
    review_period_end: new Date('2024-03-31'),
    status: 'draft' as const,
    ratings: {
      communication: { score: 4, comments: 'Good communication' }
    },
    overall_rating: 4,
    strengths: 'Strong technical skills',
    areas_for_improvement: 'Could improve time management',
    goals: [],
    created_at: new Date(),
    updated_at: new Date()
  };

  const mockGoal = {
    id: testGoalId,
    review_id: testReviewId,
    user_id: testRevieweeId,
    title: 'Improve communication skills',
    description: 'Work on presentation skills',
    target_date: new Date('2024-06-30'),
    status: 'not_started' as const,
    progress_percentage: 0,
    created_at: new Date(),
    updated_at: new Date()
  };

  beforeAll(() => {
    app = express();
    app.use(express.json());
    
    // Mock middleware
    app.use((req, res, next) => {
      req.org = mockOrganization;
      req.user = mockUser;
      next();
    });

    controller = new HRPerformanceController();

    // Setup routes
    app.post('/api/organizations/:rsi_org_id/performance/reviews', controller.createReview.bind(controller));
    app.get('/api/organizations/:rsi_org_id/performance/reviews', controller.listReviews.bind(controller));
    app.get('/api/organizations/:rsi_org_id/performance/reviews/:reviewId', controller.getReview.bind(controller));
    app.put('/api/organizations/:rsi_org_id/performance/reviews/:reviewId', controller.updateReview.bind(controller));
    app.get('/api/organizations/:rsi_org_id/performance/analytics', controller.getAnalytics.bind(controller));
    app.get('/api/organizations/:rsi_org_id/performance/trends', controller.getTrends.bind(controller));
    app.get('/api/organizations/:rsi_org_id/performance/due-reviews', controller.getDueReviews.bind(controller));
    app.post('/api/organizations/:rsi_org_id/performance/goals', controller.createGoal.bind(controller));
    app.put('/api/organizations/:rsi_org_id/performance/goals/:goalId', controller.updateGoal.bind(controller));
    app.put('/api/organizations/:rsi_org_id/performance/goals/:goalId/progress', controller.updateGoalProgress.bind(controller));
    app.get('/api/organizations/:rsi_org_id/performance/goals/overdue', controller.getOverdueGoals.bind(controller));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockPerformanceModel = {
      createReview: jest.fn(),
      findReviewById: jest.fn(),
      updateReview: jest.fn(),
      listReviews: jest.fn(),
      getReviewsWithUserInfo: jest.fn(),
      getPerformanceAnalytics: jest.fn(),
      getPerformanceTrends: jest.fn(),
      getUpcomingReviews: jest.fn(),
      createGoal: jest.fn(),
      findGoalById: jest.fn(),
      updateGoal: jest.fn(),
      updateGoalProgress: jest.fn(),
      getOverdueGoals: jest.fn(),
    } as any;

    MockedHRPerformanceModel.mockImplementation(() => mockPerformanceModel);

    // Mock organization access check
    const mockOrgModel = {
      findById: jest.fn().mockResolvedValue(mockOrganization),
      isUserMember: jest.fn().mockResolvedValue(true)
    };
    
    jest.doMock('../models/organization_model', () => ({
      OrganizationModel: jest.fn().mockImplementation(() => mockOrgModel)
    }));
  });

  describe('POST /api/organizations/:rsi_org_id/performance/reviews', () => {
    it('should create review successfully', async () => {
      mockPerformanceModel.createReview.mockResolvedValue(mockReview as any);

      const response = await request(app)
        .post(`/api/organizations/${mockOrganization.rsi_org_id}/performance/reviews`)
        .send({
          reviewee_id: testRevieweeId,
          review_period_start: '2024-01-01',
          review_period_end: '2024-03-31',
          ratings: {
            communication: { score: 4, comments: 'Good communication' }
          },
          overall_rating: 4,
          strengths: 'Strong technical skills',
          areas_for_improvement: 'Could improve time management'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockReview);
      expect(mockPerformanceModel.createReview).toHaveBeenCalledWith({
        organization_id: testOrganizationId,
        reviewee_id: testRevieweeId,
        reviewer_id: testUserId,
        review_period_start: new Date('2024-01-01'),
        review_period_end: new Date('2024-03-31'),
        ratings: {
          communication: { score: 4, comments: 'Good communication' }
        },
        overall_rating: 4,
        strengths: 'Strong technical skills',
        areas_for_improvement: 'Could improve time management'
      });
    });

    it('should return 400 when required fields are missing', async () => {
      const response = await request(app)
        .post(`/api/organizations/${mockOrganization.rsi_org_id}/performance/reviews`)
        .send({
          review_period_start: '2024-01-01'
          // Missing reviewee_id and review_period_end
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Reviewee ID, review period start, and end dates are required');
    });

    it('should return 400 for validation errors', async () => {
      mockPerformanceModel.createReview.mockRejectedValue(
        new Error('Review period start date must be before end date')
      );

      const response = await request(app)
        .post(`/api/organizations/${mockOrganization.rsi_org_id}/performance/reviews`)
        .send({
          reviewee_id: testRevieweeId,
          review_period_start: '2024-03-31',
          review_period_end: '2024-01-01'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Review period start date must be before end date');
    });

    it('should return 403 for insufficient permissions', async () => {
      // Mock organization access check to return false
      const { OrganizationModel } = require('../models/organization_model');
      const mockOrgModel = {
        findById: jest.fn().mockResolvedValue(mockOrganization),
        isUserMember: jest.fn().mockResolvedValue(false)
      };
      (OrganizationModel as jest.MockedClass<any>).mockImplementation(() => mockOrgModel);

      const response = await request(app)
        .post(`/api/organizations/${mockOrganization.rsi_org_id}/performance/reviews`)
        .send({
          reviewee_id: testRevieweeId,
          review_period_start: '2024-01-01',
          review_period_end: '2024-03-31'
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Insufficient permissions to create performance reviews');
    });
  });

  describe('GET /api/organizations/:rsi_org_id/performance/reviews', () => {
    it('should list reviews successfully', async () => {
      const mockReviewsList = {
        data: [mockReview],
        total: 1
      };

      mockPerformanceModel.listReviews.mockResolvedValue(mockReviewsList as any);

      const response = await request(app)
        .get(`/api/organizations/${mockOrganization.rsi_org_id}/performance/reviews`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockReviewsList.data);
      expect(response.body.total).toBe(1);
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(20);
      expect(response.body.total_pages).toBe(1);
    });

    it('should apply filters and pagination', async () => {
      const mockReviewsList = {
        data: [mockReview],
        total: 1
      };

      mockPerformanceModel.listReviews.mockResolvedValue(mockReviewsList as any);

      const response = await request(app)
        .get(`/api/organizations/${mockOrganization.rsi_org_id}/performance/reviews`)
        .query({
          reviewee_id: testRevieweeId,
          status: 'draft',
          page: 2,
          limit: 10
        });

      expect(response.status).toBe(200);
      expect(mockPerformanceModel.listReviews).toHaveBeenCalledWith(testOrganizationId, {
        reviewee_id: testRevieweeId,
        reviewer_id: undefined,
        status: 'draft',
        limit: 10,
        offset: 10
      });
    });

    it('should include user info when requested', async () => {
      const mockReviewsWithUserInfo = {
        data: [{
          ...mockReview,
          reviewee_rsi_handle: 'reviewee_handle',
          reviewer_rsi_handle: 'reviewer_handle'
        }],
        total: 1
      };

      mockPerformanceModel.getReviewsWithUserInfo.mockResolvedValue(mockReviewsWithUserInfo as any);

      const response = await request(app)
        .get(`/api/organizations/${mockOrganization.rsi_org_id}/performance/reviews`)
        .query({ include_user_info: 'true' });

      expect(response.status).toBe(200);
      expect(mockPerformanceModel.getReviewsWithUserInfo).toHaveBeenCalledWith(testOrganizationId, {
        reviewee_id: undefined,
        reviewer_id: undefined,
        status: undefined,
        limit: 20,
        offset: 0
      });
    });

    it('should return 403 for insufficient permissions', async () => {
      // Mock organization access check to return false
      const { OrganizationModel } = require('../models/organization_model');
      const mockOrgModel = {
        findById: jest.fn().mockResolvedValue(mockOrganization),
        isUserMember: jest.fn().mockResolvedValue(false)
      };
      (OrganizationModel as jest.MockedClass<any>).mockImplementation(() => mockOrgModel);

      const response = await request(app)
        .get(`/api/organizations/${mockOrganization.rsi_org_id}/performance/reviews`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Insufficient permissions to view performance reviews');
    });
  });

  describe('GET /api/organizations/:rsi_org_id/performance/reviews/:reviewId', () => {
    it('should return review for authorized user', async () => {
      mockPerformanceModel.findReviewById.mockResolvedValue(mockReview as any);

      const response = await request(app)
        .get(`/api/organizations/${mockOrganization.rsi_org_id}/performance/reviews/${testReviewId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockReview);
    });

    it('should return 404 for non-existent review', async () => {
      mockPerformanceModel.findReviewById.mockResolvedValue(null);

      const response = await request(app)
        .get(`/api/organizations/${mockOrganization.rsi_org_id}/performance/reviews/${testReviewId}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Performance review not found');
    });

    it('should return 404 for review from different organization', async () => {
      const reviewFromDifferentOrg = {
        ...mockReview,
        organization_id: uuidv4()
      };
      mockPerformanceModel.findReviewById.mockResolvedValue(reviewFromDifferentOrg as any);

      const response = await request(app)
        .get(`/api/organizations/${mockOrganization.rsi_org_id}/performance/reviews/${testReviewId}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Performance review not found');
    });

    it('should allow reviewee to view their own review', async () => {
      // Mock user as reviewee
      app.use((req, res, next) => {
        req.user = { id: testRevieweeId, rsi_handle: 'reviewee' };
        next();
      });

      mockPerformanceModel.findReviewById.mockResolvedValue(mockReview as any);

      const response = await request(app)
        .get(`/api/organizations/${mockOrganization.rsi_org_id}/performance/reviews/${testReviewId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('PUT /api/organizations/:rsi_org_id/performance/reviews/:reviewId', () => {
    it('should update review successfully', async () => {
      const updatedReview = {
        ...mockReview,
        status: 'submitted' as const,
        overall_rating: 4.5
      };

      mockPerformanceModel.findReviewById.mockResolvedValue(mockReview as any);
      mockPerformanceModel.updateReview.mockResolvedValue(updatedReview as any);

      const response = await request(app)
        .put(`/api/organizations/${mockOrganization.rsi_org_id}/performance/reviews/${testReviewId}`)
        .send({
          status: 'submitted',
          ratings: {
            communication: { score: 4, comments: 'Good communication' },
            technical: { score: 5, comments: 'Excellent technical skills' }
          },
          strengths: 'Updated strengths',
          areas_for_improvement: 'Updated areas for improvement'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(updatedReview);
    });

    it('should return 404 for non-existent review', async () => {
      mockPerformanceModel.findReviewById.mockResolvedValue(null);

      const response = await request(app)
        .put(`/api/organizations/${mockOrganization.rsi_org_id}/performance/reviews/${testReviewId}`)
        .send({
          status: 'submitted'
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Performance review not found');
    });

    it('should return 403 for insufficient permissions', async () => {
      const reviewWithDifferentReviewer = {
        ...mockReview,
        reviewer_id: uuidv4()
      };
      mockPerformanceModel.findReviewById.mockResolvedValue(reviewWithDifferentReviewer as any);

      // Mock organization access check to return false
      const { OrganizationModel } = require('../models/organization_model');
      const mockOrgModel = {
        findById: jest.fn().mockResolvedValue(mockOrganization),
        isUserMember: jest.fn().mockResolvedValue(false)
      };
      (OrganizationModel as jest.MockedClass<any>).mockImplementation(() => mockOrgModel);

      const response = await request(app)
        .put(`/api/organizations/${mockOrganization.rsi_org_id}/performance/reviews/${testReviewId}`)
        .send({
          status: 'submitted'
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Insufficient permissions to update this performance review');
    });
  });

  describe('GET /api/organizations/:rsi_org_id/performance/analytics', () => {
    it('should return analytics successfully', async () => {
      const mockAnalytics = {
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

      mockPerformanceModel.getPerformanceAnalytics.mockResolvedValue(mockAnalytics);

      const response = await request(app)
        .get(`/api/organizations/${mockOrganization.rsi_org_id}/performance/analytics`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockAnalytics);
    });

    it('should return 403 for insufficient permissions', async () => {
      // Mock organization access check to return false
      const { OrganizationModel } = require('../models/organization_model');
      const mockOrgModel = {
        findById: jest.fn().mockResolvedValue(mockOrganization),
        isUserMember: jest.fn().mockResolvedValue(false)
      };
      (OrganizationModel as jest.MockedClass<any>).mockImplementation(() => mockOrgModel);

      const response = await request(app)
        .get(`/api/organizations/${mockOrganization.rsi_org_id}/performance/analytics`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Insufficient permissions to view performance analytics');
    });
  });

  describe('GET /api/organizations/:rsi_org_id/performance/trends', () => {
    it('should return trends successfully', async () => {
      const mockTrends = [
        { period: '2024-01-01', average_rating: 4.0, total_reviews: 5 },
        { period: '2024-02-01', average_rating: 4.2, total_reviews: 8 },
        { period: '2024-03-01', average_rating: 4.1, total_reviews: 6 }
      ];

      mockPerformanceModel.getPerformanceTrends.mockResolvedValue(mockTrends);

      const response = await request(app)
        .get(`/api/organizations/${mockOrganization.rsi_org_id}/performance/trends`)
        .query({ period_months: 6 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockTrends);
      expect(mockPerformanceModel.getPerformanceTrends).toHaveBeenCalledWith(testOrganizationId, 6);
    });

    it('should limit period_months to maximum 24', async () => {
      mockPerformanceModel.getPerformanceTrends.mockResolvedValue([]);

      const response = await request(app)
        .get(`/api/organizations/${mockOrganization.rsi_org_id}/performance/trends`)
        .query({ period_months: 36 });

      expect(response.status).toBe(200);
      expect(mockPerformanceModel.getPerformanceTrends).toHaveBeenCalledWith(testOrganizationId, 24);
    });
  });

  describe('GET /api/organizations/:rsi_org_id/performance/due-reviews', () => {
    it('should return due reviews successfully', async () => {
      const mockDueReviews = [
        {
          user_id: testRevieweeId,
          rsi_handle: 'testuser1',
          discord_username: 'testuser1#1234',
          due_date: new Date('2024-06-01'),
          days_until_due: 30
        }
      ];

      mockPerformanceModel.getUpcomingReviews.mockResolvedValue(mockDueReviews);

      const response = await request(app)
        .get(`/api/organizations/${mockOrganization.rsi_org_id}/performance/due-reviews`)
        .query({ days_ahead: 60 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockDueReviews);
      expect(mockPerformanceModel.getUpcomingReviews).toHaveBeenCalledWith(testOrganizationId, 60);
    });

    it('should limit days_ahead to maximum 90', async () => {
      mockPerformanceModel.getUpcomingReviews.mockResolvedValue([]);

      const response = await request(app)
        .get(`/api/organizations/${mockOrganization.rsi_org_id}/performance/due-reviews`)
        .query({ days_ahead: 120 });

      expect(response.status).toBe(200);
      expect(mockPerformanceModel.getUpcomingReviews).toHaveBeenCalledWith(testOrganizationId, 90);
    });
  });

  describe('Goal Management Endpoints', () => {
    describe('POST /api/organizations/:rsi_org_id/performance/goals', () => {
      it('should create goal successfully', async () => {
        mockPerformanceModel.findReviewById.mockResolvedValue(mockReview as any);
        mockPerformanceModel.createGoal.mockResolvedValue(mockGoal as any);

        const response = await request(app)
          .post(`/api/organizations/${mockOrganization.rsi_org_id}/performance/goals`)
          .send({
            review_id: testReviewId,
            user_id: testRevieweeId,
            title: 'Improve communication skills',
            description: 'Work on presentation skills',
            target_date: '2024-06-30'
          });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockGoal);
      });

      it('should return 400 when required fields are missing', async () => {
        const response = await request(app)
          .post(`/api/organizations/${mockOrganization.rsi_org_id}/performance/goals`)
          .send({
            review_id: testReviewId
            // Missing user_id and title
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Review ID, user ID, and title are required');
      });

      it('should return 404 for non-existent review', async () => {
        mockPerformanceModel.findReviewById.mockResolvedValue(null);

        const response = await request(app)
          .post(`/api/organizations/${mockOrganization.rsi_org_id}/performance/goals`)
          .send({
            review_id: testReviewId,
            user_id: testRevieweeId,
            title: 'Test goal'
          });

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Performance review not found');
      });
    });

    describe('PUT /api/organizations/:rsi_org_id/performance/goals/:goalId', () => {
      it('should update goal successfully', async () => {
        const updatedGoal = {
          ...mockGoal,
          title: 'Updated goal title',
          status: 'in_progress' as const,
          progress_percentage: 50
        };

        mockPerformanceModel.findGoalById.mockResolvedValue(mockGoal as any);
        mockPerformanceModel.findReviewById.mockResolvedValue(mockReview as any);
        mockPerformanceModel.updateGoal.mockResolvedValue(updatedGoal as any);

        const response = await request(app)
          .put(`/api/organizations/${mockOrganization.rsi_org_id}/performance/goals/${testGoalId}`)
          .send({
            title: 'Updated goal title',
            status: 'in_progress',
            progress_percentage: 50
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(updatedGoal);
      });

      it('should return 404 for non-existent goal', async () => {
        mockPerformanceModel.findGoalById.mockResolvedValue(null);

        const response = await request(app)
          .put(`/api/organizations/${mockOrganization.rsi_org_id}/performance/goals/${testGoalId}`)
          .send({
            title: 'Updated title'
          });

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Performance goal not found');
      });
    });

    describe('PUT /api/organizations/:rsi_org_id/performance/goals/:goalId/progress', () => {
      it('should update goal progress successfully', async () => {
        const updatedGoal = {
          ...mockGoal,
          progress_percentage: 75,
          status: 'in_progress' as const
        };

        mockPerformanceModel.findGoalById.mockResolvedValue(mockGoal as any);
        mockPerformanceModel.findReviewById.mockResolvedValue(mockReview as any);
        mockPerformanceModel.updateGoalProgress.mockResolvedValue(updatedGoal as any);

        const response = await request(app)
          .put(`/api/organizations/${mockOrganization.rsi_org_id}/performance/goals/${testGoalId}/progress`)
          .send({
            progress_percentage: 75,
            notes: 'Good progress made'
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(updatedGoal);
        expect(mockPerformanceModel.updateGoalProgress).toHaveBeenCalledWith(testGoalId, 75, 'Good progress made');
      });

      it('should return 400 when progress_percentage is missing', async () => {
        const response = await request(app)
          .put(`/api/organizations/${mockOrganization.rsi_org_id}/performance/goals/${testGoalId}/progress`)
          .send({
            notes: 'Some notes'
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Progress percentage is required and must be a number');
      });

      it('should return 400 for invalid progress percentage', async () => {
        mockPerformanceModel.findGoalById.mockResolvedValue(mockGoal as any);
        mockPerformanceModel.findReviewById.mockResolvedValue(mockReview as any);
        mockPerformanceModel.updateGoalProgress.mockRejectedValue(
          new Error('Progress percentage must be between 0 and 100')
        );

        const response = await request(app)
          .put(`/api/organizations/${mockOrganization.rsi_org_id}/performance/goals/${testGoalId}/progress`)
          .send({
            progress_percentage: 150
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Progress percentage must be between 0 and 100');
      });
    });

    describe('GET /api/organizations/:rsi_org_id/performance/goals/overdue', () => {
      it('should return overdue goals successfully', async () => {
        const mockOverdueGoals = [
          {
            ...mockGoal,
            target_date: new Date('2024-01-01'),
            reviewee_rsi_handle: 'testuser1',
            reviewee_discord_username: 'testuser1#1234'
          }
        ];

        mockPerformanceModel.getOverdueGoals.mockResolvedValue(mockOverdueGoals as any);

        const response = await request(app)
          .get(`/api/organizations/${mockOrganization.rsi_org_id}/performance/goals/overdue`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockOverdueGoals);
      });

      it('should return 403 for insufficient permissions', async () => {
        // Mock organization access check to return false
        const { OrganizationModel } = require('../models/organization_model');
        const mockOrgModel = {
          findById: jest.fn().mockResolvedValue(mockOrganization),
          isUserMember: jest.fn().mockResolvedValue(false)
        };
        (OrganizationModel as jest.MockedClass<any>).mockImplementation(() => mockOrgModel);

        const response = await request(app)
          .get(`/api/organizations/${mockOrganization.rsi_org_id}/performance/goals/overdue`);

        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Insufficient permissions to view overdue goals');
      });
    });
  });

  describe('Authentication and Authorization', () => {
    it('should return 401 when user is not authenticated', async () => {
      // Create app without user middleware
      const unauthenticatedApp = express();
      unauthenticatedApp.use(express.json());
      unauthenticatedApp.use((req, res, next) => {
        req.org = mockOrganization;
        // No req.user set
        next();
      });
      unauthenticatedApp.post('/reviews', controller.createReview.bind(controller));

      const response = await request(unauthenticatedApp)
        .post('/reviews')
        .send({
          reviewee_id: testRevieweeId,
          review_period_start: '2024-01-01',
          review_period_end: '2024-03-31'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication required');
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      mockPerformanceModel.listReviews.mockRejectedValue(new Error('Connection timeout'));

      const response = await request(app)
        .get(`/api/organizations/${mockOrganization.rsi_org_id}/performance/reviews`);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to list performance reviews');
    });

    it('should handle unexpected errors in review creation', async () => {
      mockPerformanceModel.createReview.mockRejectedValue(new Error('Unexpected database error'));

      const response = await request(app)
        .post(`/api/organizations/${mockOrganization.rsi_org_id}/performance/reviews`)
        .send({
          reviewee_id: testRevieweeId,
          review_period_start: '2024-01-01',
          review_period_end: '2024-03-31'
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to create performance review');
    });

    it('should handle analytics errors gracefully', async () => {
      mockPerformanceModel.getPerformanceAnalytics.mockRejectedValue(new Error('Analytics calculation failed'));

      const response = await request(app)
        .get(`/api/organizations/${mockOrganization.rsi_org_id}/performance/analytics`);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to get performance analytics');
    });
  });
});