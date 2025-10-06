import db from '../config/database';

export interface PerformanceGoal {
  id: string;
  title: string;
  description: string;
  target_date: Date;
  status: 'not_started' | 'in_progress' | 'completed' | 'cancelled';
  progress_percentage: number;
}

export interface HRPerformanceReview {
  id: string;
  organization_id: string;
  reviewee_id: string;
  reviewer_id: string;
  review_period_start: Date;
  review_period_end: Date;
  status: 'draft' | 'submitted' | 'acknowledged';
  ratings: {
    [category: string]: {
      score: number;
      comments?: string;
    };
  };
  overall_rating?: number;
  strengths?: string;
  areas_for_improvement?: string;
  goals: PerformanceGoal[];
  created_at: Date;
  updated_at: Date;
}

export interface CreateHRPerformanceReviewData {
  organization_id: string;
  reviewee_id: string;
  reviewer_id: string;
  review_period_start: Date;
  review_period_end: Date;
  ratings?: HRPerformanceReview['ratings'];
  overall_rating?: number;
  strengths?: string;
  areas_for_improvement?: string;
}

export interface UpdateHRPerformanceReviewData {
  status?: HRPerformanceReview['status'];
  ratings?: HRPerformanceReview['ratings'];
  overall_rating?: number;
  strengths?: string;
  areas_for_improvement?: string;
  goals?: PerformanceGoal[];
}

export interface HRPerformanceGoal {
  id: string;
  review_id: string;
  user_id: string;
  title: string;
  description?: string;
  target_date?: Date;
  status: 'not_started' | 'in_progress' | 'completed' | 'cancelled';
  progress_percentage: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateHRPerformanceGoalData {
  review_id: string;
  user_id: string;
  title: string;
  description?: string;
  target_date?: Date;
}

export interface UpdateHRPerformanceGoalData {
  title?: string;
  description?: string;
  target_date?: Date;
  status?: HRPerformanceGoal['status'];
  progress_percentage?: number;
}

export interface HRPerformanceReviewWithUserInfo extends HRPerformanceReview {
  reviewee_rsi_handle: string;
  reviewee_discord_username: string;
  reviewer_rsi_handle: string;
  reviewer_discord_username: string;
}

export class HRPerformanceModel {
  // Validation methods
  validateReviewPeriod(startDate: Date, endDate: Date): { valid: boolean; error?: string } {
    if (startDate >= endDate) {
      return { valid: false, error: 'Review period start date must be before end date' };
    }

    const maxPeriodDays = 365; // Maximum 1 year review period
    const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (periodDays > maxPeriodDays) {
      return { valid: false, error: 'Review period cannot exceed 365 days' };
    }

    return { valid: true };
  }

  validateRatings(ratings: HRPerformanceReview['ratings']): { valid: boolean; error?: string } {
    for (const [category, rating] of Object.entries(ratings)) {
      if (typeof rating.score !== 'number' || rating.score < 1 || rating.score > 5) {
        return { valid: false, error: `Rating score for ${category} must be between 1 and 5` };
      }
    }
    return { valid: true };
  }

  async validateReviewConflicts(
    organizationId: string,
    revieweeId: string,
    startDate: Date,
    endDate: Date,
    excludeReviewId?: string
  ): Promise<{ valid: boolean; error?: string }> {
    let query = db('hr_performance_reviews')
      .where({ organization_id: organizationId, reviewee_id: revieweeId })
      .where(function() {
        this.whereBetween('review_period_start', [startDate, endDate])
          .orWhereBetween('review_period_end', [startDate, endDate])
          .orWhere(function() {
            this.where('review_period_start', '<=', startDate)
              .andWhere('review_period_end', '>=', endDate);
          });
      });

    if (excludeReviewId) {
      query = query.whereNot({ id: excludeReviewId });
    }

    const conflictingReview = await query.first();
    
    if (conflictingReview) {
      return { valid: false, error: 'Review period overlaps with existing review' };
    }

    return { valid: true };
  }

  // Review cycle management
  async getNextReviewDueDate(userId: string, organizationId: string): Promise<Date | null> {
    const lastReview = await db('hr_performance_reviews')
      .where({ reviewee_id: userId, organization_id: organizationId })
      .orderBy('review_period_end', 'desc')
      .first();

    if (!lastReview) {
      // If no previous review, suggest 90 days from now for new employees
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 90);
      return dueDate;
    }

    // Standard annual review cycle - 365 days from last review end
    const nextDueDate = new Date(lastReview.review_period_end);
    nextDueDate.setDate(nextDueDate.getDate() + 365);
    
    return nextDueDate;
  }

  async getUpcomingReviews(
    organizationId: string,
    daysAhead: number = 30
  ): Promise<Array<{
    user_id: string;
    rsi_handle: string;
    discord_username: string;
    due_date: Date;
    days_until_due: number;
  }>> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    // Get all active members and their last review dates
    const members = await db('organization_members')
      .join('users', 'organization_members.user_id', 'users.id')
      .leftJoin(
        db('hr_performance_reviews')
          .select('reviewee_id')
          .max('review_period_end as last_review_end')
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
        'last_reviews.last_review_end'
      );

    const upcomingReviews = [];
    const now = new Date();

    for (const member of members) {
      let dueDate: Date;
      
      if (member.last_review_end) {
        // Annual review cycle
        dueDate = new Date(member.last_review_end);
        dueDate.setDate(dueDate.getDate() + 365);
      } else {
        // New employee - 90 days from join date
        dueDate = new Date(member.joined_at);
        dueDate.setDate(dueDate.getDate() + 90);
      }

      if (dueDate <= futureDate && dueDate >= now) {
        const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        upcomingReviews.push({
          user_id: member.user_id,
          rsi_handle: member.rsi_handle,
          discord_username: member.discord_username,
          due_date: dueDate,
          days_until_due: daysUntilDue,
        });
      }
    }

    return upcomingReviews.sort((a, b) => a.due_date.getTime() - b.due_date.getTime());
  }

  // Review methods
  async createReview(reviewData: CreateHRPerformanceReviewData): Promise<HRPerformanceReview> {
    // Validate review period
    const periodValidation = this.validateReviewPeriod(
      reviewData.review_period_start,
      reviewData.review_period_end
    );
    if (!periodValidation.valid) {
      throw new Error(periodValidation.error);
    }

    // Validate ratings if provided
    if (reviewData.ratings) {
      const ratingsValidation = this.validateRatings(reviewData.ratings);
      if (!ratingsValidation.valid) {
        throw new Error(ratingsValidation.error);
      }
    }

    // Check for conflicts
    const conflictValidation = await this.validateReviewConflicts(
      reviewData.organization_id,
      reviewData.reviewee_id,
      reviewData.review_period_start,
      reviewData.review_period_end
    );
    if (!conflictValidation.valid) {
      throw new Error(conflictValidation.error);
    }

    const insertData = {
      ...reviewData,
      status: 'draft' as const,
      ratings: reviewData.ratings || {},
      goals: [],
      created_at: new Date(),
      updated_at: new Date(),
    };

    const [review] = await db('hr_performance_reviews')
      .insert(insertData)
      .returning('*');

    return review;
  }

  async findReviewById(id: string): Promise<HRPerformanceReview | null> {
    const review = await db('hr_performance_reviews').where({ id }).first();
    if (!review) return null;

    // Get associated goals
    const goals = await this.getGoalsByReviewId(id);
    review.goals = goals;

    return review;
  }

  async updateReview(
    id: string,
    updateData: UpdateHRPerformanceReviewData
  ): Promise<HRPerformanceReview | null> {
    // Validate ratings if provided
    if (updateData.ratings) {
      const ratingsValidation = this.validateRatings(updateData.ratings);
      if (!ratingsValidation.valid) {
        throw new Error(ratingsValidation.error);
      }
    }

    // Calculate overall rating if ratings are provided
    if (updateData.ratings && Object.keys(updateData.ratings).length > 0) {
      const scores = Object.values(updateData.ratings).map(r => r.score);
      updateData.overall_rating = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    }

    const [review] = await db('hr_performance_reviews')
      .where({ id })
      .update({
        ...updateData,
        updated_at: new Date(),
      })
      .returning('*');

    if (!review) return null;

    // Get associated goals
    const goals = await this.getGoalsByReviewId(id);
    review.goals = goals;

    return review;
  }

  async deleteReview(id: string): Promise<boolean> {
    const deleted = await db('hr_performance_reviews').where({ id }).del();
    return deleted > 0;
  }

  async listReviews(
    organizationId: string,
    filters: {
      reviewee_id?: string;
      reviewer_id?: string;
      status?: HRPerformanceReview['status'];
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ data: HRPerformanceReview[]; total: number }> {
    let query = db('hr_performance_reviews').where({ organization_id: organizationId });

    if (filters.reviewee_id) {
      query = query.where({ reviewee_id: filters.reviewee_id });
    }

    if (filters.reviewer_id) {
      query = query.where({ reviewer_id: filters.reviewer_id });
    }

    if (filters.status) {
      query = query.where({ status: filters.status });
    }

    // Get total count
    const countQuery = query.clone().count('* as count');
    const totalResult = await countQuery.first();
    const total = parseInt(totalResult?.count as string) || 0;

    // Apply pagination
    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.offset(filters.offset);
    }

    const reviews = await query.orderBy('created_at', 'desc');

    // Get goals for each review
    const reviewsWithGoals = await Promise.all(
      reviews.map(async (review) => {
        const goals = await this.getGoalsByReviewId(review.id);
        return { ...review, goals };
      })
    );

    return { data: reviewsWithGoals, total };
  }

  async getReviewsWithUserInfo(
    organizationId: string,
    filters: {
      reviewee_id?: string;
      reviewer_id?: string;
      status?: HRPerformanceReview['status'];
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ data: HRPerformanceReviewWithUserInfo[]; total: number }> {
    let query = db('hr_performance_reviews')
      .join('users as reviewees', 'hr_performance_reviews.reviewee_id', 'reviewees.id')
      .join('users as reviewers', 'hr_performance_reviews.reviewer_id', 'reviewers.id')
      .where({ 'hr_performance_reviews.organization_id': organizationId })
      .select(
        'hr_performance_reviews.*',
        'reviewees.rsi_handle as reviewee_rsi_handle',
        'reviewees.discord_username as reviewee_discord_username',
        'reviewers.rsi_handle as reviewer_rsi_handle',
        'reviewers.discord_username as reviewer_discord_username'
      );

    if (filters.reviewee_id) {
      query = query.where({ 'hr_performance_reviews.reviewee_id': filters.reviewee_id });
    }

    if (filters.reviewer_id) {
      query = query.where({ 'hr_performance_reviews.reviewer_id': filters.reviewer_id });
    }

    if (filters.status) {
      query = query.where({ 'hr_performance_reviews.status': filters.status });
    }

    // Get total count
    const countQuery = query.clone().clearSelect().count('hr_performance_reviews.id as count');
    const totalResult = await countQuery.first();
    const total = parseInt(totalResult?.count as string) || 0;

    // Apply pagination
    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.offset(filters.offset);
    }

    const reviews = await query.orderBy('hr_performance_reviews.created_at', 'desc');

    // Get goals for each review
    const reviewsWithGoals = await Promise.all(
      reviews.map(async (review) => {
        const goals = await this.getGoalsByReviewId(review.id);
        return { ...review, goals };
      })
    );

    return { data: reviewsWithGoals, total };
  }

  // Goal methods
  async createGoal(goalData: CreateHRPerformanceGoalData): Promise<HRPerformanceGoal> {
    const insertData = {
      ...goalData,
      status: 'not_started' as const,
      progress_percentage: 0,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const [goal] = await db('hr_performance_goals')
      .insert(insertData)
      .returning('*');

    return goal;
  }

  async findGoalById(id: string): Promise<HRPerformanceGoal | null> {
    const goal = await db('hr_performance_goals').where({ id }).first();
    return goal || null;
  }

  async updateGoal(
    id: string,
    updateData: UpdateHRPerformanceGoalData
  ): Promise<HRPerformanceGoal | null> {
    const [goal] = await db('hr_performance_goals')
      .where({ id })
      .update({
        ...updateData,
        updated_at: new Date(),
      })
      .returning('*');

    return goal || null;
  }

  async deleteGoal(id: string): Promise<boolean> {
    const deleted = await db('hr_performance_goals').where({ id }).del();
    return deleted > 0;
  }

  async getGoalsByReviewId(reviewId: string): Promise<HRPerformanceGoal[]> {
    return db('hr_performance_goals')
      .where({ review_id: reviewId })
      .orderBy('created_at', 'asc');
  }

  async getGoalsByUserId(
    userId: string,
    filters: {
      status?: HRPerformanceGoal['status'];
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ data: HRPerformanceGoal[]; total: number }> {
    let query = db('hr_performance_goals').where({ user_id: userId });

    if (filters.status) {
      query = query.where({ status: filters.status });
    }

    // Get total count
    const countQuery = query.clone().count('* as count');
    const totalResult = await countQuery.first();
    const total = parseInt(totalResult?.count as string) || 0;

    // Apply pagination
    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.offset(filters.offset);
    }

    const goals = await query.orderBy('target_date', 'asc');

    return { data: goals, total };
  }

  async updateGoalProgress(
    goalId: string,
    progressPercentage: number,
    notes?: string
  ): Promise<HRPerformanceGoal | null> {
    // Validate progress percentage
    if (progressPercentage < 0 || progressPercentage > 100) {
      throw new Error('Progress percentage must be between 0 and 100');
    }

    // Automatically update status based on progress
    let status: HRPerformanceGoal['status'] = 'not_started';
    if (progressPercentage > 0 && progressPercentage < 100) {
      status = 'in_progress';
    } else if (progressPercentage === 100) {
      status = 'completed';
    }

    const updateData: UpdateHRPerformanceGoalData = {
      progress_percentage: progressPercentage,
      status,
    };

    if (notes) {
      updateData.description = notes;
    }

    return this.updateGoal(goalId, updateData);
  }

  async getOverdueGoals(organizationId: string): Promise<Array<HRPerformanceGoal & {
    reviewee_rsi_handle: string;
    reviewee_discord_username: string;
  }>> {
    const now = new Date();
    
    return db('hr_performance_goals')
      .join('hr_performance_reviews', 'hr_performance_goals.review_id', 'hr_performance_reviews.id')
      .join('users', 'hr_performance_goals.user_id', 'users.id')
      .where({ 'hr_performance_reviews.organization_id': organizationId })
      .where('hr_performance_goals.target_date', '<', now)
      .whereIn('hr_performance_goals.status', ['not_started', 'in_progress'])
      .select(
        'hr_performance_goals.*',
        'users.rsi_handle as reviewee_rsi_handle',
        'users.discord_username as reviewee_discord_username'
      )
      .orderBy('hr_performance_goals.target_date', 'asc');
  }

  // Analytics methods
  async getPerformanceAnalytics(organizationId: string): Promise<{
    total_reviews: number;
    average_rating: number;
    reviews_by_status: Record<string, number>;
    goals_completion_rate: number;
    improvement_plans_active: number;
  }> {
    const [reviewStats, goalStats] = await Promise.all([
      // Review statistics
      db('hr_performance_reviews')
        .where({ organization_id: organizationId })
        .select(
          db.raw('COUNT(*) as total_reviews'),
          db.raw('AVG(overall_rating) as average_rating'),
          db.raw('COUNT(CASE WHEN status = \'draft\' THEN 1 END) as draft_count'),
          db.raw('COUNT(CASE WHEN status = \'submitted\' THEN 1 END) as submitted_count'),
          db.raw('COUNT(CASE WHEN status = \'acknowledged\' THEN 1 END) as acknowledged_count')
        )
        .first(),

      // Goal statistics
      db('hr_performance_goals')
        .join('hr_performance_reviews', 'hr_performance_goals.review_id', 'hr_performance_reviews.id')
        .where({ 'hr_performance_reviews.organization_id': organizationId })
        .select(
          db.raw('COUNT(*) as total_goals'),
          db.raw('COUNT(CASE WHEN hr_performance_goals.status = \'completed\' THEN 1 END) as completed_goals'),
          db.raw('COUNT(CASE WHEN hr_performance_goals.status = \'in_progress\' THEN 1 END) as active_goals')
        )
        .first(),
    ]);

    const totalGoals = parseInt(goalStats?.total_goals as string) || 0;
    const completedGoals = parseInt(goalStats?.completed_goals as string) || 0;
    const goalsCompletionRate = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;

    return {
      total_reviews: parseInt(reviewStats?.total_reviews as string) || 0,
      average_rating: parseFloat(reviewStats?.average_rating as string) || 0,
      reviews_by_status: {
        draft: parseInt(reviewStats?.draft_count as string) || 0,
        submitted: parseInt(reviewStats?.submitted_count as string) || 0,
        acknowledged: parseInt(reviewStats?.acknowledged_count as string) || 0,
      },
      goals_completion_rate: goalsCompletionRate,
      improvement_plans_active: parseInt(goalStats?.active_goals as string) || 0,
    };
  }

  async getPerformanceTrends(
    organizationId: string,
    periodMonths: number = 12
  ): Promise<{
    period: string;
    average_rating: number;
    total_reviews: number;
  }[]> {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - periodMonths);

    return db('hr_performance_reviews')
      .where({ organization_id: organizationId })
      .where('created_at', '>=', startDate)
      .select(
        db.raw('DATE_TRUNC(\'month\', created_at) as period'),
        db.raw('AVG(overall_rating) as average_rating'),
        db.raw('COUNT(*) as total_reviews')
      )
      .groupBy(db.raw('DATE_TRUNC(\'month\', created_at)'))
      .orderBy('period', 'asc');
  }

  async getDueReviews(organizationId: string): Promise<any[]> {
    // This would typically be based on review cycles/schedules
    // For now, return reviews that haven't been updated in 90+ days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    return db('organization_members')
      .join('users', 'organization_members.user_id', 'users.id')
      .leftJoin('hr_performance_reviews', function() {
        this.on('hr_performance_reviews.reviewee_id', '=', 'organization_members.user_id')
          .andOn('hr_performance_reviews.organization_id', '=', 'organization_members.organization_id')
          .andOn('hr_performance_reviews.created_at', '>', db.raw('?', [ninetyDaysAgo]));
      })
      .where({ 'organization_members.organization_id': organizationId })
      .where({ 'organization_members.is_active': true })
      .whereNull('hr_performance_reviews.id')
      .select(
        'users.id as user_id',
        'users.rsi_handle',
        'users.discord_username',
        'organization_members.joined_at'
      );
  }
}