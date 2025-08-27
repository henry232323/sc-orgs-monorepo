import { NotificationModel } from '../models/notification_model';
import {
  NotificationEntityType,
  CreateNotificationObjectData,
} from '../types/notification';
import logger from '../config/logger';

export class NotificationService {
  private notificationModel: NotificationModel;

  constructor() {
    this.notificationModel = new NotificationModel();
  }

  // Create notification for organization events
  async createOrganizationNotification(
    entityType: NotificationEntityType,
    organizationId: string,
    actorId: string,
    notifierIds: string[]
  ): Promise<void> {
    try {
      const data: CreateNotificationObjectData = {
        entity_type: entityType,
        entity_id: organizationId,
        actor_id: actorId,
        notifier_ids: notifierIds,
      };

      await this.notificationModel.createCompleteNotification(data);
      logger.info(
        `Created organization notification: ${entityType} for org ${organizationId}`
      );
    } catch (error) {
      logger.error('Error creating organization notification:', error);
      throw error;
    }
  }

  // Create notification for event events
  async createEventNotification(
    entityType: NotificationEntityType,
    eventId: string,
    actorId: string,
    notifierIds: string[]
  ): Promise<void> {
    try {
      const data: CreateNotificationObjectData = {
        entity_type: entityType,
        entity_id: eventId,
        actor_id: actorId,
        notifier_ids: notifierIds,
      };

      await this.notificationModel.createCompleteNotification(data);
      logger.info(
        `Created event notification: ${entityType} for event ${eventId}`
      );
    } catch (error) {
      logger.error('Error creating event notification:', error);
      throw error;
    }
  }

  // Create custom event notification with title and message
  async createCustomEventNotification(
    entityType: NotificationEntityType,
    eventId: string,
    actorId: string,
    notifierIds: string[],
    title: string,
    message: string,
    additionalCustomData?: Record<string, any>
  ): Promise<void> {
    try {
      logger.debug('NotificationService: Creating custom notification', {
        entityType,
        eventId,
        actorId,
        title,
        message,
        notifierCount: notifierIds.length,
      });

      const data: CreateNotificationObjectData & {
        customData: { title: string; message: string; [key: string]: any };
      } = {
        entity_type: entityType,
        entity_id: eventId,
        actor_id: actorId,
        notifier_ids: notifierIds,
        customData: {
          title,
          message,
          ...additionalCustomData,
        },
      };

      logger.debug(
        'NotificationService: Calling createCompleteNotification with custom data',
        {
          entityType,
          eventId,
          customData: data.customData,
        }
      );

      await this.notificationModel.createCompleteNotification(data);

      logger.info(
        `Created custom event notification: ${entityType} for event ${eventId} with title "${title}"`
      );
    } catch (error) {
      logger.error('Error creating custom event notification:', error);
      throw error;
    }
  }

  // Create notification for comment events
  async createCommentNotification(
    entityType: NotificationEntityType,
    commentId: string,
    actorId: string,
    notifierIds: string[]
  ): Promise<void> {
    try {
      const data: CreateNotificationObjectData = {
        entity_type: entityType,
        entity_id: commentId,
        actor_id: actorId,
        notifier_ids: notifierIds,
      };

      await this.notificationModel.createCompleteNotification(data);
      logger.info(
        `Created comment notification: ${entityType} for comment ${commentId}`
      );
    } catch (error) {
      logger.error('Error creating comment notification:', error);
      throw error;
    }
  }

  // Create notification for user events
  async createUserNotification(
    entityType: NotificationEntityType,
    userId: string,
    actorId: string,
    notifierIds: string[]
  ): Promise<void> {
    try {
      const data: CreateNotificationObjectData = {
        entity_type: entityType,
        entity_id: userId,
        actor_id: actorId,
        notifier_ids: notifierIds,
      };

      await this.notificationModel.createCompleteNotification(data);
      logger.info(
        `Created user notification: ${entityType} for user ${userId}`
      );
    } catch (error) {
      logger.error('Error creating user notification:', error);
      throw error;
    }
  }

  // Create system notification
  async createSystemNotification(
    entityType: NotificationEntityType,
    entityId: string,
    notifierIds: string[]
  ): Promise<void> {
    try {
      const data: CreateNotificationObjectData = {
        entity_type: entityType,
        entity_id: entityId,
        actor_id: 'system', // System actor
        notifier_ids: notifierIds,
      };

      await this.notificationModel.createCompleteNotification(data);
      logger.info(
        `Created system notification: ${entityType} for entity ${entityId}`
      );
    } catch (error) {
      logger.error('Error creating system notification:', error);
      throw error;
    }
  }

  // Helper method to get notification message based on entity type and data
  static getNotificationMessage(
    entityType: NotificationEntityType,
    actorName: string,
    entityData: Record<string, any>
  ): { title: string; message: string } {
    switch (entityType) {
      case NotificationEntityType.ORGANIZATION_CREATED:
        return {
          title: 'New Organization Created',
          message: `${actorName} created a new organization: ${entityData.name || 'Unknown'}`,
        };

      case NotificationEntityType.ORGANIZATION_UPDATED:
        return {
          title: 'Organization Updated',
          message: `${actorName} updated the organization: ${entityData.name || 'Unknown'}`,
        };

      case NotificationEntityType.ORGANIZATION_JOINED:
        return {
          title: 'New Member Joined',
          message: `${actorName} joined the organization: ${entityData.name || 'Unknown'}`,
        };

      case NotificationEntityType.ORGANIZATION_LEFT:
        return {
          title: 'Member Left',
          message: `${actorName} left the organization: ${entityData.name || 'Unknown'}`,
        };

      case NotificationEntityType.ORGANIZATION_INVITED:
        return {
          title: 'Organization Invitation',
          message: `You have been invited to join: ${entityData.name || 'Unknown'}`,
        };

      case NotificationEntityType.ORGANIZATION_ROLE_CHANGED:
        return {
          title: 'Role Changed',
          message: `Your role in ${entityData.name || 'Unknown'} has been changed to ${entityData.role || 'Unknown'}`,
        };

      case NotificationEntityType.EVENT_CREATED:
        return {
          title: 'New Event Created',
          message: `${actorName} created a new event: ${entityData.title || 'Unknown'}`,
        };

      case NotificationEntityType.EVENT_UPDATED:
        return {
          title: 'Event Updated',
          message: `${actorName} updated the event: ${entityData.title || 'Unknown'}`,
        };

      case NotificationEntityType.EVENT_REGISTERED:
        return {
          title: 'Event Registration',
          message: `${actorName} registered for the event: ${entityData.title || 'Unknown'}`,
        };

      case NotificationEntityType.EVENT_STARTING_SOON:
        return {
          title: 'Event Starting Soon',
          message: `The event "${entityData.title || 'Unknown'}" is starting soon!`,
        };

      case NotificationEntityType.EVENT_REMINDER:
        return {
          title: 'Event Reminder',
          message: `Reminder: The event "${entityData.title || 'Unknown'}" is tomorrow!`,
        };

      case NotificationEntityType.COMMENT_CREATED:
        return {
          title: 'New Comment',
          message: `${actorName} commented on ${entityData.organization_name || 'an organization'}`,
        };

      case NotificationEntityType.COMMENT_REPLIED:
        return {
          title: 'Comment Reply',
          message: `${actorName} replied to your comment on ${entityData.organization_name || 'an organization'}`,
        };

      case NotificationEntityType.COMMENT_VOTED:
        return {
          title: 'Comment Voted',
          message: `${actorName} voted on a comment in ${entityData.organization_name || 'an organization'}`,
        };

      case NotificationEntityType.USER_VERIFIED:
        return {
          title: 'Account Verified',
          message: `Your Star Citizen account has been verified!`,
        };

      case NotificationEntityType.SYSTEM_ANNOUNCEMENT:
        return {
          title: 'System Announcement',
          message:
            entityData.message || 'A new system announcement is available.',
        };

      case NotificationEntityType.SYSTEM_MAINTENANCE:
        return {
          title: 'System Maintenance',
          message:
            entityData.message ||
            'Scheduled system maintenance will begin soon.',
        };

      case NotificationEntityType.SECURITY_LOGIN:
        return {
          title: 'Security Alert',
          message: `New login detected from ${entityData.location || 'unknown location'}`,
        };

      default:
        return {
          title: 'Notification',
          message: `You have a new notification from ${actorName}`,
        };
    }
  }

  // Helper method to get action URL based on entity type and data
  static getActionUrl(
    entityType: NotificationEntityType,
    entityData: Record<string, any>
  ): string | undefined {
    switch (entityType) {
      case NotificationEntityType.ORGANIZATION_CREATED:
      case NotificationEntityType.ORGANIZATION_UPDATED:
      case NotificationEntityType.ORGANIZATION_JOINED:
      case NotificationEntityType.ORGANIZATION_LEFT:
      case NotificationEntityType.ORGANIZATION_ROLE_CHANGED:
        return `/organizations/${entityData.organization_id || entityData.id}`;

      case NotificationEntityType.ORGANIZATION_INVITED:
        return `/organizations/${entityData.organization_id || entityData.id}/join`;

      case NotificationEntityType.EVENT_CREATED:
      case NotificationEntityType.EVENT_UPDATED:
      case NotificationEntityType.EVENT_REGISTERED:
      case NotificationEntityType.EVENT_STARTING_SOON:
      case NotificationEntityType.EVENT_REMINDER:
        return `/events/${entityData.event_id || entityData.id}`;

      case NotificationEntityType.COMMENT_CREATED:
      case NotificationEntityType.COMMENT_REPLIED:
      case NotificationEntityType.COMMENT_VOTED:
        return `/organizations/${entityData.organization_id}/comments`;

      case NotificationEntityType.USER_VERIFIED:
        return `/profile`;

      case NotificationEntityType.SYSTEM_ANNOUNCEMENT:
      case NotificationEntityType.SYSTEM_MAINTENANCE:
        return `/notifications`;

      case NotificationEntityType.SECURITY_LOGIN:
        return `/profile/security`;

      default:
        return undefined;
    }
  }
}
