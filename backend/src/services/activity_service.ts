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
      ] = await Promise.all([
        this.getOrganizationActivities(userId),
        this.getEventActivities(userId),
        this.getCommentActivities(userId),
        this.getCreationActivities(userId),
        this.getRatingActivities(userId),
      ]);

      // Combine all activities
      const allActivities = [
        ...orgActivities,
        ...eventActivities,
        ...commentActivities,
        ...creationActivities,
        ...ratingActivities,
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
}
