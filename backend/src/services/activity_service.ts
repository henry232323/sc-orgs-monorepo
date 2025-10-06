import db from '../config/database';
import { NotificationEntityType } from '../types/notification';
import logger from '../config/logger';

export interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description: string;
  entity_type: NotificationEntityType;
  entity_id: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export class ActivityService {
  /**
   * Get user's recent activity from all sources
   */
  async getUserRecentActivity(
    userId: string,
    limit: number = 10
  ): Promise<ActivityItem[]> {
    try {
      logger.debug(`Fetching recent activity for user ${userId}`);

      // Fetch activities from all sources in parallel
      const [
        orgActivities,
        eventActivities,
        commentActivities,
        creationActivities,
        ratingActivities,
        hrActivities,
      ] = await Promise.all([
        this.getOrganizationActivities(userId),
        this.getEventActivities(userId),
        this.getCommentActivities(userId),
        this.getCreationActivities(userId),
        this.getRatingActivities(userId),
        this.getHRActivities(userId),
      ]);

      // Combine all activities
      const allActivities = [
        ...orgActivities,
        ...eventActivities,
        ...commentActivities,
        ...creationActivities,
        ...ratingActivities,
        ...hrActivities,
      ];

      // Sort by timestamp (most recent first) and limit
      const sortedActivities = allActivities
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit);

      logger.debug(
        `Found ${sortedActivities.length} activities for user ${userId}`
      );

      return sortedActivities;
    } catch (error) {
      logger.error('Error fetching user activity:', error);
      throw error;
    }
  }

  /**
   * Get organization-related activities (joins, leaves)
   */
  private async getOrganizationActivities(
    userId: string
  ): Promise<ActivityItem[]> {
    try {
      const orgJoins = await db('organization_members')
        .join('organizations', 'organization_members.organization_id', 'organizations.id')
        .select(
          'organization_members.id',
          'organization_members.joined_at as timestamp',
          'organizations.name as org_name',
          'organizations.rsi_org_id',
          'organizations.id as org_id'
        )
        .where('organization_members.user_id', userId)
        .where('organization_members.is_active', true)
        .orderBy('organization_members.joined_at', 'desc')
        .limit(20); // Get more than needed, will be sorted later

      return orgJoins.map(join => ({
        id: `org_join_${join.id}`,
        type: 'organization_joined',
        title: `Joined ${join.org_name}`,
        description: `You became a member of this organization`,
        entity_type: NotificationEntityType.ORGANIZATION_JOINED,
        entity_id: join.org_id,
        timestamp: new Date(join.timestamp),
        metadata: {
          organization_name: join.org_name,
          rsi_org_id: join.rsi_org_id,
        },
      }));
    } catch (error) {
      logger.error('Error fetching organization activities:', error);
      return [];
    }
  }

  /**
   * Get event-related activities (registrations)
   */
  private async getEventActivities(userId: string): Promise<ActivityItem[]> {
    try {
      const eventRegistrations = await db('event_registrations')
        .join('events', 'event_registrations.event_id', 'events.id')
        .select(
          'event_registrations.id',
          'event_registrations.registered_at as timestamp',
          'events.title as event_title',
          'events.id as event_id'
        )
        .where('event_registrations.user_id', userId)
        .orderBy('event_registrations.registered_at', 'desc')
        .limit(20);

      return eventRegistrations.map(registration => ({
        id: `event_reg_${registration.id}`,
        type: 'event_registered',
        title: `Registered for ${registration.event_title}`,
        description: `You signed up for this upcoming event`,
        entity_type: NotificationEntityType.EVENT_REGISTERED,
        entity_id: registration.event_id,
        timestamp: new Date(registration.timestamp),
        metadata: {
          event_title: registration.event_title,
        },
      }));
    } catch (error) {
      logger.error('Error fetching event activities:', error);
      return [];
    }
  }

  /**
   * Get comment-related activities
   */
  private async getCommentActivities(userId: string): Promise<ActivityItem[]> {
    try {
      const comments = await db('comments')
        .join('events', 'comments.entity_id', 'events.id')
        .select(
          'comments.id',
          'comments.created_at as timestamp',
          'events.title as event_title',
          'events.id as event_id'
        )
        .where('comments.user_id', userId)
        .where('comments.is_active', true)
        .orderBy('comments.created_at', 'desc')
        .limit(20);

      return comments.map(comment => ({
        id: `comment_${comment.id}`,
        type: 'comment_created',
        title: `Commented on ${comment.event_title}`,
        description: `You shared your thoughts on this event`,
        entity_type: NotificationEntityType.COMMENT_CREATED,
        entity_id: comment.event_id,
        timestamp: new Date(comment.timestamp),
        metadata: {
          event_title: comment.event_title,
        },
      }));
    } catch (error) {
      logger.error('Error fetching comment activities:', error);
      return [];
    }
  }

  /**
   * Get creation activities (organizations and events created by user)
   */
  private async getCreationActivities(userId: string): Promise<ActivityItem[]> {
    try {
      // Get organizations created by user
      const orgsCreated = await db('organizations')
        .select(
          'id',
          'created_at as timestamp',
          'name as org_name',
          'rsi_org_id'
        )
        .where('owner_id', userId)
        .orderBy('created_at', 'desc')
        .limit(10);

      const orgActivities = orgsCreated.map(org => ({
        id: `org_created_${org.id}`,
        type: 'organization_created',
        title: `Created ${org.org_name}`,
        description: `You founded this organization`,
        entity_type: NotificationEntityType.ORGANIZATION_CREATED,
        entity_id: org.id,
        timestamp: new Date(org.timestamp),
        metadata: {
          organization_name: org.org_name,
          rsi_org_id: org.rsi_org_id,
        },
      }));

      // Get events created by user
      const eventsCreated = await db('events')
        .select(
          'id',
          'created_at as timestamp',
          'title as event_title'
        )
        .where('created_by', userId)
        .orderBy('created_at', 'desc')
        .limit(10);

      const eventActivities = eventsCreated.map(event => ({
        id: `event_created_${event.id}`,
        type: 'event_created',
        title: `Created ${event.event_title}`,
        description: `You organized this event`,
        entity_type: NotificationEntityType.EVENT_CREATED,
        entity_id: event.id,
        timestamp: new Date(event.timestamp),
        metadata: {
          event_title: event.event_title,
        },
      }));

      return [...orgActivities, ...eventActivities];
    } catch (error) {
      logger.error('Error fetching creation activities:', error);
      return [];
    }
  }

  /**
   * Get rating activities
   */
  private async getRatingActivities(userId: string): Promise<ActivityItem[]> {
    try {
      const ratings = await db('organization_ratings')
        .join('organizations', 'organization_ratings.organization_id', 'organizations.id')
        .select(
          'organization_ratings.id',
          'organization_ratings.created_at as timestamp',
          'organization_ratings.rating',
          'organizations.name as org_name',
          'organizations.rsi_org_id',
          'organizations.id as org_id'
        )
        .where('organization_ratings.user_id', userId)
        .where('organization_ratings.is_active', true)
        .orderBy('organization_ratings.created_at', 'desc')
        .limit(15);

      return ratings.map(rating => ({
        id: `rating_${rating.id}`,
        type: 'organization_rated',
        title: `Rated ${rating.org_name}`,
        description: `You gave this organization ${rating.rating} star${rating.rating !== 1 ? 's' : ''}`,
        entity_type: NotificationEntityType.ORGANIZATION_UPDATED, // Using closest available type
        entity_id: rating.org_id,
        timestamp: new Date(rating.timestamp),
        metadata: {
          organization_name: rating.org_name,
          rsi_org_id: rating.rsi_org_id,
          rating: rating.rating,
        },
      }));
    } catch (error) {
      logger.error('Error fetching rating activities:', error);
      return [];
    }
  }

  /**
   * Get HR-related activities (applications, onboarding, performance, skills)
   */
  private async getHRActivities(userId: string): Promise<ActivityItem[]> {
    try {
      const [
        applicationActivities,
        onboardingActivities,
        performanceActivities,
        skillActivities,
      ] = await Promise.all([
        this.getApplicationActivities(userId),
        this.getOnboardingActivities(userId),
        this.getPerformanceActivities(userId),
        this.getSkillActivities(userId),
      ]);

      return [
        ...applicationActivities,
        ...onboardingActivities,
        ...performanceActivities,
        ...skillActivities,
      ];
    } catch (error) {
      logger.error('Error fetching HR activities:', error);
      return [];
    }
  }

  /**
   * Get application-related activities
   */
  private async getApplicationActivities(userId: string): Promise<ActivityItem[]> {
    try {
      const applications = await db('hr_applications')
        .join('organizations', 'hr_applications.organization_id', 'organizations.id')
        .select(
          'hr_applications.id',
          'hr_applications.status',
          'hr_applications.created_at as timestamp',
          'hr_applications.updated_at',
          'organizations.name as org_name',
          'organizations.id as org_id'
        )
        .where('hr_applications.user_id', userId)
        .orderBy('hr_applications.updated_at', 'desc')
        .limit(10);

      return applications.map(app => ({
        id: `hr_application_${app.id}`,
        type: 'hr_application_submitted',
        title: `Applied to ${app.org_name}`,
        description: `You submitted an application to join this organization (Status: ${app.status})`,
        entity_type: NotificationEntityType.HR_APPLICATION_SUBMITTED,
        entity_id: app.org_id,
        timestamp: new Date(app.timestamp),
        metadata: {
          organization_name: app.org_name,
          application_status: app.status,
          application_id: app.id,
        },
      }));
    } catch (error) {
      logger.error('Error fetching application activities:', error);
      return [];
    }
  }

  /**
   * Get onboarding-related activities
   */
  private async getOnboardingActivities(userId: string): Promise<ActivityItem[]> {
    try {
      const onboardingProgress = await db('hr_onboarding_progress')
        .join('organizations', 'hr_onboarding_progress.organization_id', 'organizations.id')
        .join('hr_onboarding_templates', 'hr_onboarding_progress.template_id', 'hr_onboarding_templates.id')
        .select(
          'hr_onboarding_progress.id',
          'hr_onboarding_progress.status',
          'hr_onboarding_progress.completion_percentage',
          'hr_onboarding_progress.started_at as timestamp',
          'hr_onboarding_progress.completed_at',
          'organizations.name as org_name',
          'organizations.id as org_id',
          'hr_onboarding_templates.role_name'
        )
        .where('hr_onboarding_progress.user_id', userId)
        .orderBy('hr_onboarding_progress.started_at', 'desc')
        .limit(10);

      return onboardingProgress.map(progress => {
        const isCompleted = progress.status === 'completed';
        const title = isCompleted 
          ? `Completed onboarding at ${progress.org_name}`
          : `Started onboarding at ${progress.org_name}`;
        const description = isCompleted
          ? `You completed your ${progress.role_name} onboarding (${progress.completion_percentage}%)`
          : `You began your ${progress.role_name} onboarding (${progress.completion_percentage}% complete)`;

        return {
          id: `hr_onboarding_${progress.id}`,
          type: isCompleted ? 'hr_onboarding_completed' : 'hr_onboarding_started',
          title,
          description,
          entity_type: isCompleted 
            ? NotificationEntityType.HR_ONBOARDING_COMPLETED 
            : NotificationEntityType.HR_ONBOARDING_STARTED,
          entity_id: progress.org_id,
          timestamp: new Date(progress.timestamp),
          metadata: {
            organization_name: progress.org_name,
            role_name: progress.role_name,
            completion_percentage: progress.completion_percentage,
            onboarding_status: progress.status,
          },
        };
      });
    } catch (error) {
      logger.error('Error fetching onboarding activities:', error);
      return [];
    }
  }

  /**
   * Get performance review activities
   */
  private async getPerformanceActivities(userId: string): Promise<ActivityItem[]> {
    try {
      const reviews = await db('hr_performance_reviews')
        .join('organizations', 'hr_performance_reviews.organization_id', 'organizations.id')
        .select(
          'hr_performance_reviews.id',
          'hr_performance_reviews.status',
          'hr_performance_reviews.overall_rating',
          'hr_performance_reviews.created_at as timestamp',
          'hr_performance_reviews.review_period_start',
          'hr_performance_reviews.review_period_end',
          'organizations.name as org_name',
          'organizations.id as org_id'
        )
        .where('hr_performance_reviews.reviewee_id', userId)
        .orderBy('hr_performance_reviews.created_at', 'desc')
        .limit(10);

      return reviews.map(review => {
        const periodStart = new Date(review.review_period_start).toLocaleDateString();
        const periodEnd = new Date(review.review_period_end).toLocaleDateString();
        
        return {
          id: `hr_performance_${review.id}`,
          type: 'hr_performance_review_completed',
          title: `Performance review at ${review.org_name}`,
          description: `Your performance review for ${periodStart} - ${periodEnd} was completed${review.overall_rating ? ` (Rating: ${review.overall_rating}/5)` : ''}`,
          entity_type: NotificationEntityType.HR_PERFORMANCE_REVIEW_SUBMITTED,
          entity_id: review.org_id,
          timestamp: new Date(review.timestamp),
          metadata: {
            organization_name: review.org_name,
            review_status: review.status,
            overall_rating: review.overall_rating,
            review_period: `${periodStart} - ${periodEnd}`,
          },
        };
      });
    } catch (error) {
      logger.error('Error fetching performance activities:', error);
      return [];
    }
  }

  /**
   * Get skill-related activities
   */
  private async getSkillActivities(userId: string): Promise<ActivityItem[]> {
    try {
      const [userSkills, certifications] = await Promise.all([
        // Get verified skills
        db('hr_user_skills')
          .join('hr_skills', 'hr_user_skills.skill_id', 'hr_skills.id')
          .select(
            'hr_user_skills.id',
            'hr_user_skills.verified_at as timestamp',
            'hr_user_skills.proficiency_level',
            'hr_skills.name as skill_name',
            'hr_skills.category'
          )
          .where('hr_user_skills.user_id', userId)
          .where('hr_user_skills.verified', true)
          .whereNotNull('hr_user_skills.verified_at')
          .orderBy('hr_user_skills.verified_at', 'desc')
          .limit(5),

        // Get certifications
        db('hr_certifications')
          .join('organizations', 'hr_certifications.organization_id', 'organizations.id')
          .select(
            'hr_certifications.id',
            'hr_certifications.name as cert_name',
            'hr_certifications.issued_date as timestamp',
            'organizations.name as org_name',
            'organizations.id as org_id'
          )
          .where('hr_certifications.user_id', userId)
          .orderBy('hr_certifications.issued_date', 'desc')
          .limit(5),
      ]);

      const skillActivities = userSkills.map(skill => ({
        id: `hr_skill_${skill.id}`,
        type: 'hr_skill_verified',
        title: `${skill.skill_name} skill verified`,
        description: `Your ${skill.skill_name} (${skill.category}) skill was verified at ${skill.proficiency_level} level`,
        entity_type: NotificationEntityType.HR_SKILL_VERIFIED,
        entity_id: skill.id,
        timestamp: new Date(skill.timestamp),
        metadata: {
          skill_name: skill.skill_name,
          skill_category: skill.category,
          proficiency_level: skill.proficiency_level,
        },
      }));

      const certificationActivities = certifications.map(cert => ({
        id: `hr_certification_${cert.id}`,
        type: 'hr_certification_earned',
        title: `Earned ${cert.cert_name} certification`,
        description: `You received the ${cert.cert_name} certification from ${cert.org_name}`,
        entity_type: NotificationEntityType.HR_SKILL_VERIFIED, // Using closest available type
        entity_id: cert.org_id,
        timestamp: new Date(cert.timestamp),
        metadata: {
          certification_name: cert.cert_name,
          organization_name: cert.org_name,
        },
      }));

      return [...skillActivities, ...certificationActivities];
    } catch (error) {
      logger.error('Error fetching skill activities:', error);
      return [];
    }
  }
}
