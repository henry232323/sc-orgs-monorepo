import { Request, Response } from 'express';
import { HRPerformanceModel } from '../models/hr_performance_model';
import { getUserFromRequest } from '../utils/user-casting';
import logger from '../config/logger';

const performanceModel = new HRPerformanceModel();

export class HRPerformanceController {
  /**
   * POST /api/organizations/:rsi_org_id/performance/reviews
   * Create a new performance review
   */
  async createReview(req: Request, res: Response): Promise<void> {
    try {
      const organization = req.org!; // Resolved by middleware
      const user = getUserFromRequest(req);

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const {
        reviewee_id,
        review_period_start,
        review_period_end,
        ratings,
        overall_rating,
        strengths,
        areas_for_improvement,
      } = req.body;

      if (!reviewee_id || !review_period_start || !review_period_end) {
        res.status(400).json({
          success: false,
          error: 'Reviewee ID, review period start, and end dates are required',
        });
        return;
      }

      // Check if user has permission to create reviews
      const hasAccess = await this.hasOrganizationAccess(organization.id, user.id);
      if (!hasAccess) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions to create performance reviews',
        });
        return;
      }

      // Create review
      const review = await performanceModel.createReview({
        organization_id: organization.id,
        reviewee_id,
        reviewer_id: user.id,
        review_period_start: new Date(review_period_start),
        review_period_end: new Date(review_period_end),
        ratings,
        overall_rating,
        strengths,
        areas_for_improvement,
      });

      logger.info('Performance review created successfully', {
        reviewId: review.id,
        organizationId: organization.id,
        revieweeId: reviewee_id,
        reviewerId: user.id,
      });

      res.status(201).json({
        success: true,
        data: review,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('Failed to create performance review', {
        error: errorMessage,
        organizationId: req.org?.id,
        userId: getUserFromRequest(req)?.id,
      });

      // Handle validation errors
      if (errorMessage.includes('Review period') || 
          errorMessage.includes('Rating score') ||
          errorMessage.includes('overlaps')) {
        res.status(400).json({
          success: false,
          error: errorMessage,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to create performance review',
      });
    }
  }

  /**
   * GET /api/organizations/:rsi_org_id/performance/reviews
   * List performance reviews for an organization with filtering and pagination
   */
  async listReviews(req: Request, res: Response): Promise<void> {
    try {
      const organization = req.org!; // Resolved by middleware
      const user = getUserFromRequest(req);

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const {
        reviewee_id,
        reviewer_id,
        status,
        page = 1,
        limit = 20,
        include_user_info = 'false',
      } = req.query;

      const parsedLimit = Math.min(parseInt(limit as string) || 20, 100); // Max 100
      const parsedPage = parseInt(page as string) || 1;
      const offset = (parsedPage - 1) * parsedLimit;

      // Check if user has permission to view reviews
      const hasAccess = await this.hasOrganizationAccess(organization.id, user.id);
      if (!hasAccess) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions to view performance reviews',
        });
        return;
      }

      const filters = {
        reviewee_id: reviewee_id as string,
        reviewer_id: reviewer_id as string,
        status: status as any,
        limit: parsedLimit,
        offset,
      };

      let result;
      if (include_user_info === 'true') {
        result = await performanceModel.getReviewsWithUserInfo(organization.id, filters);
      } else {
        result = await performanceModel.listReviews(organization.id, filters);
      }

      res.json({
        success: true,
        data: result.data,
        total: result.total,
        page: parsedPage,
        limit: parsedLimit,
        total_pages: Math.ceil(result.total / parsedLimit),
      });
    } catch (error) {
      logger.error('Failed to list performance reviews', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId: req.org?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to list performance reviews',
      });
    }
  }

  /**
   * GET /api/organizations/:rsi_org_id/performance/reviews/:reviewId
   * Get a specific performance review by ID
   */
  async getReview(req: Request, res: Response): Promise<void> {
    try {
      const organization = req.org!;
      const { reviewId } = req.params;
      const user = getUserFromRequest(req);

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const review = await performanceModel.findReviewById(reviewId);

      if (!review) {
        res.status(404).json({
          success: false,
          error: 'Performance review not found',
        });
        return;
      }

      // Verify review belongs to this organization
      if (review.organization_id !== organization.id) {
        res.status(404).json({
          success: false,
          error: 'Performance review not found',
        });
        return;
      }

      // Check permissions - user can view their own review or org members can view all
      const canView = user && (
        review.reviewee_id === user.id || 
        review.reviewer_id === user.id ||
        await this.hasOrganizationAccess(organization.id, user.id)
      );

      if (!canView) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions to view this performance review',
        });
        return;
      }

      res.json({
        success: true,
        data: review,
      });
    } catch (error) {
      logger.error('Failed to get performance review', {
        error: error instanceof Error ? error.message : 'Unknown error',
        reviewId: req.params.reviewId,
        organizationId: req.org?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get performance review',
      });
    }
  }

  /**
   * PUT /api/organizations/:rsi_org_id/performance/reviews/:reviewId
   * Update a performance review
   */
  async updateReview(req: Request, res: Response): Promise<void> {
    try {
      const organization = req.org!;
      const { reviewId } = req.params;
      const {
        status,
        ratings,
        overall_rating,
        strengths,
        areas_for_improvement,
        goals,
      } = req.body;
      const user = getUserFromRequest(req);

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const review = await performanceModel.findReviewById(reviewId);
      if (!review) {
        res.status(404).json({
          success: false,
          error: 'Performance review not found',
        });
        return;
      }

      // Verify review belongs to this organization
      if (review.organization_id !== organization.id) {
        res.status(404).json({
          success: false,
          error: 'Performance review not found',
        });
        return;
      }

      // Check permissions - only reviewer or org admin can update
      const canUpdate = user && (
        review.reviewer_id === user.id ||
        await this.hasOrganizationAccess(organization.id, user.id)
      );

      if (!canUpdate) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions to update this performance review',
        });
        return;
      }

      // Update review
      const updatedReview = await performanceModel.updateReview(reviewId, {
        status,
        ratings,
        overall_rating,
        strengths,
        areas_for_improvement,
        goals,
      });

      if (!updatedReview) {
        res.status(500).json({
          success: false,
          error: 'Failed to update performance review',
        });
        return;
      }

      logger.info('Performance review updated', {
        reviewId,
        organizationId: organization.id,
        updatedBy: user.id,
      });

      res.json({
        success: true,
        data: updatedReview,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('Failed to update performance review', {
        error: errorMessage,
        reviewId: req.params.reviewId,
        organizationId: req.org?.id,
        userId: getUserFromRequest(req)?.id,
      });

      // Handle validation errors
      if (errorMessage.includes('Rating score') || 
          errorMessage.includes('required')) {
        res.status(400).json({
          success: false,
          error: errorMessage,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to update performance review',
      });
    }
  }

  /**
   * GET /api/organizations/:rsi_org_id/performance/analytics
   * Get performance analytics for an organization
   */
  async getAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const organization = req.org!;
      const user = getUserFromRequest(req);

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      // Check if user has permission to view analytics
      const hasAccess = await this.hasOrganizationAccess(organization.id, user.id);
      if (!hasAccess) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions to view performance analytics',
        });
        return;
      }

      const analytics = await performanceModel.getPerformanceAnalytics(organization.id);

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      logger.error('Failed to get performance analytics', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId: req.org?.id,
        userId: getUserFromRequest(req)?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get performance analytics',
      });
    }
  }

  /**
   * GET /api/organizations/:rsi_org_id/performance/trends
   * Get performance trends over time
   */
  async getTrends(req: Request, res: Response): Promise<void> {
    try {
      const organization = req.org!;
      const user = getUserFromRequest(req);
      const { period_months = 12 } = req.query;

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      // Check if user has permission to view trends
      const hasAccess = await this.hasOrganizationAccess(organization.id, user.id);
      if (!hasAccess) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions to view performance trends',
        });
        return;
      }

      const periodMonths = Math.min(parseInt(period_months as string) || 12, 24); // Max 24 months
      const trends = await performanceModel.getPerformanceTrends(organization.id, periodMonths);

      res.json({
        success: true,
        data: trends,
      });
    } catch (error) {
      logger.error('Failed to get performance trends', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId: req.org?.id,
        userId: getUserFromRequest(req)?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get performance trends',
      });
    }
  }

  /**
   * GET /api/organizations/:rsi_org_id/performance/due-reviews
   * Get upcoming performance reviews that are due
   */
  async getDueReviews(req: Request, res: Response): Promise<void> {
    try {
      const organization = req.org!;
      const user = getUserFromRequest(req);
      const { days_ahead = 30 } = req.query;

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      // Check if user has permission to view due reviews
      const hasAccess = await this.hasOrganizationAccess(organization.id, user.id);
      if (!hasAccess) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions to view due reviews',
        });
        return;
      }

      const daysAhead = Math.min(parseInt(days_ahead as string) || 30, 90); // Max 90 days
      const upcomingReviews = await performanceModel.getUpcomingReviews(organization.id, daysAhead);

      res.json({
        success: true,
        data: upcomingReviews,
      });
    } catch (error) {
      logger.error('Failed to get due reviews', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId: req.org?.id,
        userId: getUserFromRequest(req)?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get due reviews',
      });
    }
  }

  // Goal management endpoints

  /**
   * POST /api/organizations/:rsi_org_id/performance/goals
   * Create a new performance goal
   */
  async createGoal(req: Request, res: Response): Promise<void> {
    try {
      const organization = req.org!;
      const user = getUserFromRequest(req);
      const { review_id, user_id, title, description, target_date } = req.body;

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      if (!review_id || !user_id || !title) {
        res.status(400).json({
          success: false,
          error: 'Review ID, user ID, and title are required',
        });
        return;
      }

      // Verify the review exists and belongs to this organization
      const review = await performanceModel.findReviewById(review_id);
      if (!review || review.organization_id !== organization.id) {
        res.status(404).json({
          success: false,
          error: 'Performance review not found',
        });
        return;
      }

      // Check permissions - only reviewer or org admin can create goals
      const canCreate = user && (
        review.reviewer_id === user.id ||
        await this.hasOrganizationAccess(organization.id, user.id)
      );

      if (!canCreate) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions to create performance goals',
        });
        return;
      }

      const goal = await performanceModel.createGoal({
        organization_id: organization.id,
        review_id,
        user_id,
        title,
        description,
        target_date: target_date ? new Date(target_date) : undefined,
      });

      logger.info('Performance goal created', {
        goalId: goal.id,
        reviewId: review_id,
        organizationId: organization.id,
        createdBy: user.id,
      });

      res.status(201).json({
        success: true,
        data: goal,
      });
    } catch (error) {
      logger.error('Failed to create performance goal', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId: req.org?.id,
        userId: getUserFromRequest(req)?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to create performance goal',
      });
    }
  }

  /**
   * PUT /api/organizations/:rsi_org_id/performance/goals/:goalId
   * Update a performance goal
   */
  async updateGoal(req: Request, res: Response): Promise<void> {
    try {
      const organization = req.org!;
      const { goalId } = req.params;
      const { title, description, target_date, status, progress_percentage } = req.body;
      const user = getUserFromRequest(req);

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const goal = await performanceModel.findGoalById(goalId);
      if (!goal) {
        res.status(404).json({
          success: false,
          error: 'Performance goal not found',
        });
        return;
      }

      // Verify the goal's review belongs to this organization
      const review = await performanceModel.findReviewById(goal.review_id);
      if (!review || review.organization_id !== organization.id) {
        res.status(404).json({
          success: false,
          error: 'Performance goal not found',
        });
        return;
      }

      // Check permissions - goal owner, reviewer, or org admin can update
      const canUpdate = user && (
        goal.user_id === user.id ||
        review.reviewer_id === user.id ||
        await this.hasOrganizationAccess(organization.id, user.id)
      );

      if (!canUpdate) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions to update this performance goal',
        });
        return;
      }

      const updatedGoal = await performanceModel.updateGoal(goalId, {
        title,
        description,
        target_date: target_date ? new Date(target_date) : undefined,
        status,
        progress_percentage,
      });

      if (!updatedGoal) {
        res.status(500).json({
          success: false,
          error: 'Failed to update performance goal',
        });
        return;
      }

      logger.info('Performance goal updated', {
        goalId,
        organizationId: organization.id,
        updatedBy: user.id,
      });

      res.json({
        success: true,
        data: updatedGoal,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('Failed to update performance goal', {
        error: errorMessage,
        goalId: req.params.goalId,
        organizationId: req.org?.id,
        userId: getUserFromRequest(req)?.id,
      });

      // Handle validation errors
      if (errorMessage.includes('Progress percentage')) {
        res.status(400).json({
          success: false,
          error: errorMessage,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to update performance goal',
      });
    }
  }

  /**
   * PUT /api/organizations/:rsi_org_id/performance/goals/:goalId/progress
   * Update goal progress
   */
  async updateGoalProgress(req: Request, res: Response): Promise<void> {
    try {
      const organization = req.org!;
      const { goalId } = req.params;
      const { progress_percentage, notes } = req.body;
      const user = getUserFromRequest(req);

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      if (typeof progress_percentage !== 'number') {
        res.status(400).json({
          success: false,
          error: 'Progress percentage is required and must be a number',
        });
        return;
      }

      const goal = await performanceModel.findGoalById(goalId);
      if (!goal) {
        res.status(404).json({
          success: false,
          error: 'Performance goal not found',
        });
        return;
      }

      // Verify the goal's review belongs to this organization
      const review = await performanceModel.findReviewById(goal.review_id);
      if (!review || review.organization_id !== organization.id) {
        res.status(404).json({
          success: false,
          error: 'Performance goal not found',
        });
        return;
      }

      // Check permissions - goal owner, reviewer, or org admin can update progress
      const canUpdate = user && (
        goal.user_id === user.id ||
        review.reviewer_id === user.id ||
        await this.hasOrganizationAccess(organization.id, user.id)
      );

      if (!canUpdate) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions to update goal progress',
        });
        return;
      }

      const updatedGoal = await performanceModel.updateGoalProgress(goalId, progress_percentage, notes);

      if (!updatedGoal) {
        res.status(500).json({
          success: false,
          error: 'Failed to update goal progress',
        });
        return;
      }

      logger.info('Goal progress updated', {
        goalId,
        progress: progress_percentage,
        organizationId: organization.id,
        updatedBy: user.id,
      });

      res.json({
        success: true,
        data: updatedGoal,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('Failed to update goal progress', {
        error: errorMessage,
        goalId: req.params.goalId,
        organizationId: req.org?.id,
        userId: getUserFromRequest(req)?.id,
      });

      // Handle validation errors
      if (errorMessage.includes('Progress percentage')) {
        res.status(400).json({
          success: false,
          error: errorMessage,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to update goal progress',
      });
    }
  }

  /**
   * GET /api/organizations/:rsi_org_id/performance/goals/overdue
   * Get overdue performance goals
   */
  async getOverdueGoals(req: Request, res: Response): Promise<void> {
    try {
      const organization = req.org!;
      const user = getUserFromRequest(req);

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      // Check if user has permission to view overdue goals
      const hasAccess = await this.hasOrganizationAccess(organization.id, user.id);
      if (!hasAccess) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions to view overdue goals',
        });
        return;
      }

      const overdueGoals = await performanceModel.getOverdueGoals(organization.id);

      res.json({
        success: true,
        data: overdueGoals,
      });
    } catch (error) {
      logger.error('Failed to get overdue goals', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId: req.org?.id,
        userId: getUserFromRequest(req)?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get overdue goals',
      });
    }
  }

  /**
   * Helper method to check if user has access to organization performance data
   * This would typically check if user is a member with appropriate permissions
   */
  private async hasOrganizationAccess(organizationId: string, userId: string): Promise<boolean> {
    try {
      // Import here to avoid circular dependencies
      const { OrganizationModel } = await import('../models/organization_model');
      const organizationModel = new OrganizationModel();

      // Check if user is organization owner
      const organization = await organizationModel.findById(organizationId);
      if (organization?.owner_id === userId) {
        return true;
      }

      // Check if user is a member (you might want to add role-based permissions here)
      const isMember = await organizationModel.isUserMember(organizationId, userId);
      return isMember;
    } catch (error) {
      logger.error('Error checking organization access', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId,
        userId,
      });
      return false;
    }
  }
}