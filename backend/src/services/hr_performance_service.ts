import { HRPerformanceModel, HRPerformanceReview, HRPerformanceReviewWithUserInfo } from '../models/hr_performance_model';
import { NotificationService } from './notification_service';
import { NotificationEntityType } from '../types/notification';
import logger from '../config/logger';

export interface PerformanceAnalytics {
  total_reviews: number;
  average_rating: number;
  reviews_by_status: Record<string, number>;
  goals_completion_rate: number;
  improvement_plans_active: number;
  performance_trends: Array<{
    period: string;
    average_rating: number;
    total_reviews: number;
  }>;
  top_performers: Array<{
    user_id: string;
    rsi_handle: string;
    average_rating: number;
    total_reviews: number;
  }>;
  review_cycle_compliance: {
    on_time: number;
    overdue: number;
    upcoming: number;
  };
}

export interface ReviewCycleSchedule {
  user_id: string;
  rsi_handle: string;
  discord_username: string;
  last_review_date?: Date;
  next_due_date: Date;
  days_until_due: number;
  is_overdue: boolean;
}

export interface ImprovementPlan {
  id: string;
  review_id: string;
  user_id: string;
  areas_for_improvement: string[];
  action_items: Array<{
    description: string;
    target_date: Date;
    status: 'not_started' | 'in_progress' | 'completed';
  }>;
  progress_percentage: number;
  created_at: Date;
  updated_at: Date;
}

export class HRPerformanceService {
  private performanceModel: HRPerformanceModel;
  private notificationService: NotificationService;

  constructor() {
    this.performanceModel = new HRPerformanceModel();
    this.notificationService = new NotificationService();
  }

  /**
   * Implements review cycle scheduling and automatic notifications
   */
  async scheduleReviewCycles(organizationId: string): Promise<ReviewCycleSchedule[]> {
    try {
      // Get all active organization members
      const db = (await import('../config/database')).default;
      
      const members = await db('organization_members')
        .join('users', 'organization_members.user_id', 'users.id')
        .leftJoin(
          db('hr_performance_reviews')
            .select('reviewee_id')
            .max('review_period_end as last_review_date')
            .groupBy('reviewee_id')
            .as('last_reviews'),
          'users.id',
          'last_reviews.reviewee_id'
        )
        .where({ 'organization_members.organization_id': organizationId })
        .where({ 'organization_members.is_active': true })
        .select(
          'users.id as user_id',
          'users.rsi_handle',
          'users.discord_username',
          'organization_members.joined_at',
          'last_reviews.last_review_date'
        );

      const schedules: ReviewCycleSchedule[] = [];
      const now = new Date();

      for (const member of members) {
        let nextDueDate: Date;
        
        if (member.last_review_date) {
          // Annual review cycle - 365 days from last review
          nextDueDate = new Date(member.last_review_date);
          nextDueDate.setDate(nextDueDate.getDate() + 365);
        } else {
          // New employee - 90 days from join date
          nextDueDate = new Date(member.joined_at);
          nextDueDate.setDate(nextDueDate.getDate() + 90);
        }

        const daysUntilDue = Math.ceil((nextDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const isOverdue = daysUntilDue < 0;

        schedules.push({
          user_id: member.user_id,
          rsi_handle: member.rsi_handle,
          discord_username: member.discord_username,
          last_review_date: member.last_review_date,
          next_due_date: nextDueDate,
          days_until_due: daysUntilDue,
          is_overdue: isOverdue,
        });
      }

      // Sort by due date (overdue first, then by proximity)
      schedules.sort((a, b) => {
        if (a.is_overdue && !b.is_overdue) return -1;
        if (!a.is_overdue && b.is_overdue) return 1;
        return a.next_due_date.getTime() - b.next_due_date.getTime();
      });

      logger.info('Review cycles scheduled', {
        organizationId,
        totalMembers: schedules.length,
        overdue: schedules.filter(s => s.is_overdue).length,
        upcoming: schedules.filter(s => !s.is_overdue && s.days_until_due <= 30).length,
      });

      return schedules;
    } catch (error) {
      logger.error('Error scheduling review cycles', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId,
      });
      return [];
    }
  }

  /**
   * Sends automatic notifications for upcoming and overdue reviews
   */
  async sendReviewCycleNotifications(organizationId: string): Promise<void> {
    try {
      const schedules = await this.scheduleReviewCycles(organizationId);
      
      // Notify about overdue reviews
      const overdueReviews = schedules.filter(s => s.is_overdue);
      if (overdueReviews.length > 0) {
        await this.notifyOverdueReviews(organizationId, overdueReviews);
      }

      // Notify about upcoming reviews (within 7 days)
      const upcomingReviews = schedules.filter(s => !s.is_overdue && s.days_until_due <= 7);
      if (upcomingReviews.length > 0) {
        await this.notifyUpcomingReviews(organizationId, upcomingReviews);
      }

      // Notify about reviews due in 30 days (early warning)
      const earlyWarningReviews = schedules.filter(s => s.days_until_due === 30);
      if (earlyWarningReviews.length > 0) {
        await this.notifyEarlyWarningReviews(organizationId, earlyWarningReviews);
      }

      logger.info('Review cycle notifications sent', {
        organizationId,
        overdue: overdueReviews.length,
        upcoming: upcomingReviews.length,
        earlyWarning: earlyWarningReviews.length,
      });
    } catch (error) {
      logger.error('Error sending review cycle notifications', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId,
      });
    }
  }

  /**
   * Creates performance analytics and trend calculation
   */
  async generatePerformanceAnalytics(organizationId: string): Promise<PerformanceAnalytics> {
    try {
      // Get basic analytics from model
      const basicAnalytics = await this.performanceModel.getPerformanceAnalytics(organizationId);
      
      // Get performance trends (12 months)
      const trends = await this.performanceModel.getPerformanceTrends(organizationId, 12);
      
      // Get top performers
      const topPerformers = await this.getTopPerformers(organizationId, 5);
      
      // Get review cycle compliance
      const cycleCompliance = await this.getReviewCycleCompliance(organizationId);

      return {
        ...basicAnalytics,
        performance_trends: trends,
        top_performers: topPerformers,
        review_cycle_compliance: cycleCompliance,
      };
    } catch (error) {
      logger.error('Error generating performance analytics', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId,
      });

      // Return empty analytics on error
      return {
        total_reviews: 0,
        average_rating: 0,
        reviews_by_status: {},
        goals_completion_rate: 0,
        improvement_plans_active: 0,
        performance_trends: [],
        top_performers: [],
        review_cycle_compliance: {
          on_time: 0,
          overdue: 0,
          upcoming: 0,
        },
      };
    }
  }

  /**
   * Creates and tracks improvement plans
   */
  async createImprovementPlan(
    reviewId: string,
    userId: string,
    areasForImprovement: string[],
    actionItems: Array<{
      description: string;
      target_date: Date;
    }>
  ): Promise<ImprovementPlan> {
    try {
      const db = (await import('../config/database')).default;

      const improvementPlan: ImprovementPlan = {
        id: '', // Will be set by database
        review_id: reviewId,
        user_id: userId,
        areas_for_improvement: areasForImprovement,
        action_items: actionItems.map(item => ({
          ...item,
          status: 'not_started' as const,
        })),
        progress_percentage: 0,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const [createdPlan] = await db('hr_improvement_plans')
        .insert({
          review_id: improvementPlan.review_id,
          user_id: improvementPlan.user_id,
          areas_for_improvement: JSON.stringify(improvementPlan.areas_for_improvement),
          action_items: JSON.stringify(improvementPlan.action_items),
          progress_percentage: improvementPlan.progress_percentage,
          created_at: improvementPlan.created_at,
          updated_at: improvementPlan.updated_at,
        })
        .returning('*');

      const result = {
        ...improvementPlan,
        id: createdPlan.id,
      };

      // Notify user about improvement plan
      await this.notifyImprovementPlanCreated(result);

      logger.info('Improvement plan created', {
        planId: result.id,
        reviewId,
        userId,
        actionItemsCount: actionItems.length,
      });

      return result;
    } catch (error) {
      logger.error('Error creating improvement plan', {
        error: error instanceof Error ? error.message : 'Unknown error',
        reviewId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Tracks improvement plan progress
   */
  async updateImprovementPlanProgress(
    planId: string,
    actionItemIndex: number,
    status: 'not_started' | 'in_progress' | 'completed'
  ): Promise<ImprovementPlan | null> {
    try {
      const db = (await import('../config/database')).default;

      // Get current plan
      const currentPlan = await db('hr_improvement_plans').where({ id: planId }).first();
      if (!currentPlan) {
        throw new Error('Improvement plan not found');
      }

      const actionItems = JSON.parse(currentPlan.action_items);
      if (actionItemIndex >= actionItems.length) {
        throw new Error('Invalid action item index');
      }

      // Update action item status
      actionItems[actionItemIndex].status = status;

      // Calculate progress percentage
      const completedItems = actionItems.filter((item: { status: string }) => item.status === 'completed').length;
      const progressPercentage = Math.round((completedItems / actionItems.length) * 100);

      // Update plan
      const [updatedPlan] = await db('hr_improvement_plans')
        .where({ id: planId })
        .update({
          action_items: JSON.stringify(actionItems),
          progress_percentage: progressPercentage,
          updated_at: new Date(),
        })
        .returning('*');

      const result: ImprovementPlan = {
        id: updatedPlan.id,
        review_id: updatedPlan.review_id,
        user_id: updatedPlan.user_id,
        areas_for_improvement: JSON.parse(updatedPlan.areas_for_improvement),
        action_items: JSON.parse(updatedPlan.action_items),
        progress_percentage: updatedPlan.progress_percentage,
        created_at: updatedPlan.created_at,
        updated_at: updatedPlan.updated_at,
      };

      // Notify if plan is completed
      if (progressPercentage === 100) {
        await this.notifyImprovementPlanCompleted(result);
      }

      logger.info('Improvement plan progress updated', {
        planId,
        actionItemIndex,
        newStatus: status,
        progressPercentage,
      });

      return result;
    } catch (error) {
      logger.error('Error updating improvement plan progress', {
        error: error instanceof Error ? error.message : 'Unknown error',
        planId,
        actionItemIndex,
        status,
      });
      return null;
    }
  }

  /**
   * Builds performance reporting and export functionality
   */
  async generatePerformanceReport(
    organizationId: string,
    options: {
      format: 'json' | 'csv';
      period?: {
        start: Date;
        end: Date;
      };
      includeGoals?: boolean;
      includeImprovementPlans?: boolean;
    }
  ): Promise<any> {
    try {
      const { format, period, includeGoals = false, includeImprovementPlans = false } = options;

      // Get reviews within period
      let reviews;
      if (period) {
        const db = (await import('../config/database')).default;
        reviews = await db('hr_performance_reviews')
          .join('users as reviewees', 'hr_performance_reviews.reviewee_id', 'reviewees.id')
          .join('users as reviewers', 'hr_performance_reviews.reviewer_id', 'reviewers.id')
          .where({ 'hr_performance_reviews.organization_id': organizationId })
          .whereBetween('hr_performance_reviews.created_at', [period.start, period.end])
          .select(
            'hr_performance_reviews.*',
            'reviewees.rsi_handle as reviewee_rsi_handle',
            'reviewers.rsi_handle as reviewer_rsi_handle'
          );
      } else {
        const result = await this.performanceModel.getReviewsWithUserInfo(organizationId);
        reviews = result.data;
      }

      // Add goals if requested
      if (includeGoals) {
        for (const review of reviews) {
          review.goals = await this.performanceModel.getGoalsByReviewId(review.id);
        }
      }

      // Add improvement plans if requested
      if (includeImprovementPlans) {
        const db = (await import('../config/database')).default;
        for (const review of reviews) {
          const plans = await db('hr_improvement_plans')
            .where({ review_id: review.id })
            .select('*');
          
          review.improvement_plans = plans.map((plan: { 
            id: string; 
            review_id: string; 
            user_id: string; 
            areas_for_improvement: string; 
            action_items: string; 
            progress_percentage: number; 
            created_at: Date; 
            updated_at: Date; 
          }) => ({
            ...plan,
            areas_for_improvement: JSON.parse(plan.areas_for_improvement),
            action_items: JSON.parse(plan.action_items),
          }));
        }
      }

      if (format === 'csv') {
        return this.convertToCSV(reviews);
      }

      return {
        organization_id: organizationId,
        generated_at: new Date(),
        period: period || { start: null, end: null },
        total_reviews: reviews.length,
        reviews,
      };
    } catch (error) {
      logger.error('Error generating performance report', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId,
        options,
      });
      throw error;
    }
  }

  /**
   * Processes review submission with notifications
   */
  async processReviewSubmission(
    reviewId: string,
    submitterId: string
  ): Promise<HRPerformanceReview | null> {
    try {
      const review = await this.performanceModel.findReviewById(reviewId);
      if (!review) {
        throw new Error('Review not found');
      }

      // Update status to submitted
      const updatedReview = await this.performanceModel.updateReview(reviewId, {
        status: 'submitted',
      });

      if (!updatedReview) {
        throw new Error('Failed to update review status');
      }

      // Notify reviewee about completed review
      await this.notifyReviewCompleted(updatedReview);

      // Notify organization leadership
      await this.notifyOrganizationReviewCompleted(updatedReview, submitterId);

      // Create improvement plan if needed
      if (updatedReview.areas_for_improvement && updatedReview.overall_rating && updatedReview.overall_rating < 3) {
        await this.createAutomaticImprovementPlan(updatedReview);
      }

      logger.info('Review submission processed', {
        reviewId,
        submitterId,
        revieweeId: updatedReview.reviewee_id,
        organizationId: updatedReview.organization_id,
      });

      return updatedReview;
    } catch (error) {
      logger.error('Error processing review submission', {
        error: error instanceof Error ? error.message : 'Unknown error',
        reviewId,
        submitterId,
      });
      throw error;
    }
  }

  // Private helper methods

  private async getTopPerformers(
    organizationId: string,
    limit: number
  ): Promise<Array<{
    user_id: string;
    rsi_handle: string;
    average_rating: number;
    total_reviews: number;
  }>> {
    try {
      const db = (await import('../config/database')).default;

      const result = await db('hr_performance_reviews')
        .join('users', 'hr_performance_reviews.reviewee_id', 'users.id')
        .where({ 'hr_performance_reviews.organization_id': organizationId })
        .where({ 'hr_performance_reviews.status': 'acknowledged' })
        .whereNotNull('hr_performance_reviews.overall_rating')
        .groupBy('users.id', 'users.rsi_handle')
        .select(
          'users.id as user_id',
          'users.rsi_handle',
          db.raw('AVG(hr_performance_reviews.overall_rating) as average_rating'),
          db.raw('COUNT(*) as total_reviews')
        )
        .orderBy('average_rating', 'desc')
        .limit(limit);

      return result.map((row: { 
        user_id: string; 
        rsi_handle: string; 
        average_rating: string; 
        total_reviews: string; 
      }) => ({
        user_id: row.user_id,
        rsi_handle: row.rsi_handle,
        average_rating: parseFloat(row.average_rating),
        total_reviews: parseInt(row.total_reviews),
      }));
    } catch (error) {
      logger.error('Error getting top performers', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId,
      });
      return [];
    }
  }

  private async getReviewCycleCompliance(organizationId: string): Promise<{
    on_time: number;
    overdue: number;
    upcoming: number;
  }> {
    try {
      const schedules = await this.scheduleReviewCycles(organizationId);
      
      const overdue = schedules.filter(s => s.is_overdue).length;
      const upcoming = schedules.filter(s => !s.is_overdue && s.days_until_due <= 30).length;
      const onTime = schedules.length - overdue - upcoming;

      return {
        on_time: onTime,
        overdue,
        upcoming,
      };
    } catch (error) {
      logger.error('Error getting review cycle compliance', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId,
      });
      return { on_time: 0, overdue: 0, upcoming: 0 };
    }
  }

  private async notifyOverdueReviews(
    organizationId: string,
    overdueReviews: ReviewCycleSchedule[]
  ): Promise<void> {
    try {
      // Import here to avoid circular dependencies
      const { OrganizationModel } = await import('../models/organization_model');
      const organizationModel = new OrganizationModel();

      const organization = await organizationModel.findById(organizationId);
      if (!organization) return;

      // Notify organization leadership about overdue reviews
      await this.notificationService.createCustomEventNotification(
        NotificationEntityType.ORGANIZATION_UPDATED,
        organizationId,
        'system',
        [organization.owner_id],
        'Overdue Performance Reviews',
        `${overdueReviews.length} performance reviews are overdue`,
        {
          overdue_count: overdueReviews.length,
          overdue_reviews: overdueReviews.map(r => ({
            user_id: r.user_id,
            rsi_handle: r.rsi_handle,
            days_overdue: Math.abs(r.days_until_due),
          })),
        }
      );
    } catch (error) {
      logger.error('Error notifying overdue reviews', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId,
        overdueCount: overdueReviews.length,
      });
    }
  }

  private async notifyUpcomingReviews(
    organizationId: string,
    upcomingReviews: ReviewCycleSchedule[]
  ): Promise<void> {
    try {
      // Import here to avoid circular dependencies
      const { OrganizationModel } = await import('../models/organization_model');
      const organizationModel = new OrganizationModel();

      const organization = await organizationModel.findById(organizationId);
      if (!organization) return;

      // Notify organization leadership about upcoming reviews
      await this.notificationService.createCustomEventNotification(
        NotificationEntityType.ORGANIZATION_UPDATED,
        organizationId,
        'system',
        [organization.owner_id],
        'Upcoming Performance Reviews',
        `${upcomingReviews.length} performance reviews are due within 7 days`,
        {
          upcoming_count: upcomingReviews.length,
          upcoming_reviews: upcomingReviews.map(r => ({
            user_id: r.user_id,
            rsi_handle: r.rsi_handle,
            days_until_due: r.days_until_due,
          })),
        }
      );
    } catch (error) {
      logger.error('Error notifying upcoming reviews', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId,
        upcomingCount: upcomingReviews.length,
      });
    }
  }

  private async notifyEarlyWarningReviews(
    organizationId: string,
    earlyWarningReviews: ReviewCycleSchedule[]
  ): Promise<void> {
    try {
      // Import here to avoid circular dependencies
      const { OrganizationModel } = await import('../models/organization_model');
      const organizationModel = new OrganizationModel();

      const organization = await organizationModel.findById(organizationId);
      if (!organization) return;

      // Notify organization leadership about reviews due in 30 days
      await this.notificationService.createCustomEventNotification(
        NotificationEntityType.ORGANIZATION_UPDATED,
        organizationId,
        'system',
        [organization.owner_id],
        'Performance Reviews Due Soon',
        `${earlyWarningReviews.length} performance reviews are due in 30 days`,
        {
          early_warning_count: earlyWarningReviews.length,
          early_warning_reviews: earlyWarningReviews.map(r => ({
            user_id: r.user_id,
            rsi_handle: r.rsi_handle,
            due_date: r.next_due_date,
          })),
        }
      );
    } catch (error) {
      logger.error('Error notifying early warning reviews', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId,
        earlyWarningCount: earlyWarningReviews.length,
      });
    }
  }

  private async notifyReviewCompleted(review: HRPerformanceReview): Promise<void> {
    try {
      await this.notificationService.createCustomEventNotification(
        NotificationEntityType.ORGANIZATION_UPDATED,
        review.organization_id,
        review.reviewer_id,
        [review.reviewee_id],
        'Performance Review Completed',
        'Your performance review has been completed and is ready for your acknowledgment',
        {
          review_id: review.id,
          overall_rating: review.overall_rating,
          review_period_start: review.review_period_start,
          review_period_end: review.review_period_end,
        }
      );
    } catch (error) {
      logger.error('Error notifying review completed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        reviewId: review.id,
      });
    }
  }

  private async notifyOrganizationReviewCompleted(
    review: HRPerformanceReview,
    submitterId: string
  ): Promise<void> {
    try {
      // Import here to avoid circular dependencies
      const { OrganizationModel } = await import('../models/organization_model');
      const organizationModel = new OrganizationModel();

      const organization = await organizationModel.findById(review.organization_id);
      if (!organization) return;

      // Notify organization owner (if not the submitter)
      const notifierIds = organization.owner_id !== submitterId 
        ? [organization.owner_id] 
        : [];

      if (notifierIds.length > 0) {
        await this.notificationService.createCustomEventNotification(
          NotificationEntityType.ORGANIZATION_UPDATED,
          review.organization_id,
          submitterId,
          notifierIds,
          'Performance Review Submitted',
          'A performance review has been submitted for your organization',
          {
            review_id: review.id,
            reviewee_id: review.reviewee_id,
            reviewer_id: review.reviewer_id,
            overall_rating: review.overall_rating,
          }
        );
      }
    } catch (error) {
      logger.error('Error notifying organization review completed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        reviewId: review.id,
        submitterId,
      });
    }
  }

  private async notifyImprovementPlanCreated(plan: ImprovementPlan): Promise<void> {
    try {
      await this.notificationService.createCustomEventNotification(
        NotificationEntityType.ORGANIZATION_UPDATED,
        '', // Will be filled by the notification service
        'system',
        [plan.user_id],
        'Improvement Plan Created',
        'An improvement plan has been created based on your performance review',
        {
          plan_id: plan.id,
          review_id: plan.review_id,
          action_items_count: plan.action_items.length,
        }
      );
    } catch (error) {
      logger.error('Error notifying improvement plan created', {
        error: error instanceof Error ? error.message : 'Unknown error',
        planId: plan.id,
      });
    }
  }

  private async notifyImprovementPlanCompleted(plan: ImprovementPlan): Promise<void> {
    try {
      await this.notificationService.createCustomEventNotification(
        NotificationEntityType.ORGANIZATION_UPDATED,
        '', // Will be filled by the notification service
        plan.user_id,
        [], // Will notify organization leadership
        'Improvement Plan Completed',
        'An improvement plan has been successfully completed',
        {
          plan_id: plan.id,
          review_id: plan.review_id,
          user_id: plan.user_id,
        }
      );
    } catch (error) {
      logger.error('Error notifying improvement plan completed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        planId: plan.id,
      });
    }
  }

  private async createAutomaticImprovementPlan(review: HRPerformanceReview): Promise<void> {
    try {
      if (!review.areas_for_improvement) return;

      const areas = review.areas_for_improvement.split('\n').filter(area => area.trim());
      const actionItems = areas.map(area => ({
        description: `Address: ${area.trim()}`,
        target_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
      }));

      await this.createImprovementPlan(
        review.id,
        review.reviewee_id,
        areas,
        actionItems
      );

      logger.info('Automatic improvement plan created', {
        reviewId: review.id,
        revieweeId: review.reviewee_id,
        areasCount: areas.length,
      });
    } catch (error) {
      logger.error('Error creating automatic improvement plan', {
        error: error instanceof Error ? error.message : 'Unknown error',
        reviewId: review.id,
      });
    }
  }

  private convertToCSV(reviews: HRPerformanceReviewWithUserInfo[]): string {
    if (reviews.length === 0) return '';

    const headers = [
      'Review ID',
      'Reviewee RSI Handle',
      'Reviewer RSI Handle',
      'Review Period Start',
      'Review Period End',
      'Status',
      'Overall Rating',
      'Strengths',
      'Areas for Improvement',
      'Created At',
      'Updated At',
    ];

    const rows = reviews.map(review => [
      review.id,
      review.reviewee_rsi_handle || '',
      review.reviewer_rsi_handle || '',
      review.review_period_start,
      review.review_period_end,
      review.status,
      review.overall_rating || '',
      review.strengths || '',
      review.areas_for_improvement || '',
      review.created_at,
      review.updated_at,
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    return csvContent;
  }
}