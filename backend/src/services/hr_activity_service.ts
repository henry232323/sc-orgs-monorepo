import { HRActivityModel, HRActivity, CreateHRActivityData, HRActivityFilters, PaginatedHRActivities, HRActivityType } from '../models/hr_activity_model';
import logger from '../config/logger';

export interface HRActivityServiceFilters extends HRActivityFilters {
  page?: number;
  limit?: number;
}

export class HRActivityService {
  private hrActivityModel: HRActivityModel;

  constructor() {
    this.hrActivityModel = new HRActivityModel();
  }

  /**
   * Create a new HR activity
   */
  async createActivity(activityData: CreateHRActivityData): Promise<HRActivity> {
    try {
      logger.debug('HRActivityService: Creating activity', {
        organization_id: activityData.organization_id,
        activity_type: activityData.activity_type,
        user_id: activityData.user_id
      });

      // Validate required fields
      this.validateActivityData(activityData);

      const activity = await this.hrActivityModel.create(activityData);

      logger.info('HR activity created successfully', {
        id: activity.id,
        organization_id: activity.organization_id,
        activity_type: activity.activity_type
      });

      return activity;
    } catch (error) {
      logger.error('HRActivityService: Error creating activity', error);
      throw error;
    }
  }

  /**
   * Get paginated HR activities for an organization with filtering
   */
  async getOrganizationActivities(
    organizationId: string,
    filters: HRActivityServiceFilters = {}
  ): Promise<PaginatedHRActivities> {
    try {
      const {
        page = 1,
        limit = 20,
        activity_types,
        date_from,
        date_to,
        user_id
      } = filters;

      logger.debug('HRActivityService: Fetching organization activities', {
        organizationId,
        page,
        limit,
        filters: { activity_types, date_from, date_to, user_id }
      });

      // Validate pagination parameters
      const validatedPage = Math.max(1, page);
      const validatedLimit = Math.min(Math.max(1, limit), 100); // Max 100 items per page

      const result = await this.hrActivityModel.getOrganizationActivities(
        organizationId,
        validatedPage,
        validatedLimit,
        {
          activity_types,
          date_from,
          date_to,
          user_id
        }
      );

      logger.debug('HRActivityService: Organization activities fetched', {
        organizationId,
        total: result.total,
        returned: result.data.length
      });

      return result;
    } catch (error) {
      logger.error('HRActivityService: Error fetching organization activities', error);
      throw error;
    }
  }

  /**
   * Get recent HR activities for a user
   */
  async getUserActivities(userId: string, limit: number = 10): Promise<HRActivity[]> {
    try {
      logger.debug('HRActivityService: Fetching user activities', { userId, limit });

      const validatedLimit = Math.min(Math.max(1, limit), 50); // Max 50 items
      const activities = await this.hrActivityModel.getUserActivities(userId, validatedLimit);

      logger.debug('HRActivityService: User activities fetched', {
        userId,
        count: activities.length
      });

      return activities;
    } catch (error) {
      logger.error('HRActivityService: Error fetching user activities', error);
      throw error;
    }
  }

  /**
   * Get HR activity by ID
   */
  async getActivityById(id: string): Promise<HRActivity | null> {
    try {
      logger.debug('HRActivityService: Fetching activity by ID', { id });

      const activity = await this.hrActivityModel.getById(id);

      if (!activity) {
        logger.debug('HRActivityService: Activity not found', { id });
        return null;
      }

      return activity;
    } catch (error) {
      logger.error('HRActivityService: Error fetching activity by ID', error);
      throw error;
    }
  }

  /**
   * Delete HR activity by ID
   */
  async deleteActivity(id: string): Promise<boolean> {
    try {
      logger.debug('HRActivityService: Deleting activity', { id });

      const success = await this.hrActivityModel.deleteById(id);

      if (success) {
        logger.info('HR activity deleted successfully', { id });
      } else {
        logger.warn('HR activity not found for deletion', { id });
      }

      return success;
    } catch (error) {
      logger.error('HRActivityService: Error deleting activity', error);
      throw error;
    }
  }

  /**
   * Get activity statistics for an organization
   */
  async getOrganizationActivityStats(
    organizationId: string,
    dateFrom?: Date,
    dateTo?: Date
  ) {
    try {
      logger.debug('HRActivityService: Fetching activity stats', {
        organizationId,
        dateFrom,
        dateTo
      });

      const stats = await this.hrActivityModel.getOrganizationActivityStats(
        organizationId,
        dateFrom,
        dateTo
      );

      logger.debug('HRActivityService: Activity stats fetched', {
        organizationId,
        totalActivities: stats.total_activities
      });

      return stats;
    } catch (error) {
      logger.error('HRActivityService: Error fetching activity stats', error);
      throw error;
    }
  }

  /**
   * Create activity for application submission
   */
  async createApplicationSubmittedActivity(
    organizationId: string,
    userId: string,
    userHandle: string,
    userAvatarUrl: string | undefined,
    applicationId: string,
    organizationName: string
  ): Promise<HRActivity> {
    return this.createActivity({
      organization_id: organizationId,
      activity_type: 'application_submitted',
      user_id: userId,
      user_handle: userHandle,
      user_avatar_url: userAvatarUrl,
      title: `Application submitted to ${organizationName}`,
      description: `${userHandle} submitted an application to join the organization`,
      metadata: {
        application_id: applicationId,
        organization_name: organizationName
      }
    });
  }

  /**
   * Create activity for application status change
   */
  async createApplicationStatusChangedActivity(
    organizationId: string,
    userId: string,
    userHandle: string,
    userAvatarUrl: string | undefined,
    applicationId: string,
    organizationName: string,
    oldStatus: string,
    newStatus: string,
    reviewerId?: string
  ): Promise<HRActivity> {
    return this.createActivity({
      organization_id: organizationId,
      activity_type: 'application_status_changed',
      user_id: userId,
      user_handle: userHandle,
      user_avatar_url: userAvatarUrl,
      title: `Application status changed to ${newStatus}`,
      description: `${userHandle}'s application status was updated from ${oldStatus} to ${newStatus}`,
      metadata: {
        application_id: applicationId,
        organization_name: organizationName,
        old_status: oldStatus,
        new_status: newStatus,
        reviewer_id: reviewerId
      }
    });
  }

  /**
   * Create activity for onboarding completion
   */
  async createOnboardingCompletedActivity(
    organizationId: string,
    userId: string,
    userHandle: string,
    userAvatarUrl: string | undefined,
    onboardingId: string,
    organizationName: string,
    roleName: string
  ): Promise<HRActivity> {
    return this.createActivity({
      organization_id: organizationId,
      activity_type: 'onboarding_completed',
      user_id: userId,
      user_handle: userHandle,
      user_avatar_url: userAvatarUrl,
      title: `Onboarding completed for ${roleName}`,
      description: `${userHandle} completed their ${roleName} onboarding at ${organizationName}`,
      metadata: {
        onboarding_id: onboardingId,
        organization_name: organizationName,
        role_name: roleName
      }
    });
  }

  /**
   * Create activity for performance review submission
   */
  async createPerformanceReviewSubmittedActivity(
    organizationId: string,
    userId: string,
    userHandle: string,
    userAvatarUrl: string | undefined,
    reviewId: string,
    organizationName: string,
    reviewPeriod: string,
    overallRating?: number
  ): Promise<HRActivity> {
    return this.createActivity({
      organization_id: organizationId,
      activity_type: 'performance_review_submitted',
      user_id: userId,
      user_handle: userHandle,
      user_avatar_url: userAvatarUrl,
      title: `Performance review completed`,
      description: `${userHandle}'s performance review for ${reviewPeriod} was completed${overallRating ? ` with rating ${overallRating}/5` : ''}`,
      metadata: {
        review_id: reviewId,
        organization_name: organizationName,
        review_period: reviewPeriod,
        overall_rating: overallRating
      }
    });
  }

  /**
   * Create activity for skill verification
   */
  async createSkillVerifiedActivity(
    organizationId: string,
    userId: string,
    userHandle: string,
    userAvatarUrl: string | undefined,
    skillId: string,
    skillName: string,
    proficiencyLevel: string,
    verifierId?: string
  ): Promise<HRActivity> {
    return this.createActivity({
      organization_id: organizationId,
      activity_type: 'skill_verified',
      user_id: userId,
      user_handle: userHandle,
      user_avatar_url: userAvatarUrl,
      title: `${skillName} skill verified`,
      description: `${userHandle}'s ${skillName} skill was verified at ${proficiencyLevel} level`,
      metadata: {
        skill_id: skillId,
        skill_name: skillName,
        proficiency_level: proficiencyLevel,
        verifier_id: verifierId
      }
    });
  }

  /**
   * Create activity for document acknowledgment
   */
  async createDocumentAcknowledgedActivity(
    organizationId: string,
    userId: string,
    userHandle: string,
    userAvatarUrl: string | undefined,
    documentId: string,
    documentTitle: string,
    organizationName: string
  ): Promise<HRActivity> {
    return this.createActivity({
      organization_id: organizationId,
      activity_type: 'document_acknowledged',
      user_id: userId,
      user_handle: userHandle,
      user_avatar_url: userAvatarUrl,
      title: `Document acknowledged: ${documentTitle}`,
      description: `${userHandle} acknowledged the document "${documentTitle}"`,
      metadata: {
        document_id: documentId,
        document_title: documentTitle,
        organization_name: organizationName
      }
    });
  }

  /**
   * Validate activity data before creation
   */
  private validateActivityData(activityData: CreateHRActivityData): void {
    const requiredFields = ['organization_id', 'activity_type', 'user_id', 'user_handle', 'title', 'description'];
    
    for (const field of requiredFields) {
      if (!activityData[field as keyof CreateHRActivityData]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate activity type
    const validActivityTypes: HRActivityType[] = [
      'application_submitted',
      'application_status_changed',
      'onboarding_completed',
      'performance_review_submitted',
      'skill_verified',
      'document_acknowledged'
    ];

    if (!validActivityTypes.includes(activityData.activity_type)) {
      throw new Error(`Invalid activity type: ${activityData.activity_type}`);
    }

    // Validate title and description length
    if (activityData.title.length > 255) {
      throw new Error('Activity title must be 255 characters or less');
    }

    if (activityData.description.length > 1000) {
      throw new Error('Activity description must be 1000 characters or less');
    }
  }
}