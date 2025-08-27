import { NotificationEntityType } from '../types/notification';
import { EventModel } from '../models/event_model';
import { OrganizationModel } from '../models/organization_model';
import { UserModel } from '../models/user_model';
import logger from '../config/logger';

export interface NotificationContent {
  title: string;
  message: string;
}

export class NotificationSerializer {
  private static eventModel = new EventModel();
  private static organizationModel = new OrganizationModel();
  private static userModel = new UserModel();

  /**
   * Generate title and message for a notification based on entity type and data
   */
  static async generateNotificationContent(
    entityType: NotificationEntityType,
    entityId: string,
    actorId?: string,
    customData?: { title?: string; message?: string }
  ): Promise<NotificationContent> {
    try {
      // If custom title and message are provided, use them (for custom notifications)
      if (customData?.title && customData?.message) {
        // Check if this is an event-related custom notification to add organizer context
        if (
          entityType >= NotificationEntityType.EVENT_CREATED &&
          entityType <= NotificationEntityType.EVENT_REMINDER
        ) {
          return {
            title: `📢 ${customData.title}`,
            message: `Notification from event organizer: ${customData.message}`,
          };
        }
        return {
          title: customData.title,
          message: customData.message,
        };
      }

      // Generate content based on entity type
      switch (entityType) {
        case NotificationEntityType.EVENT_CREATED:
          return await this.generateEventCreatedContent(entityId, actorId);

        case NotificationEntityType.EVENT_UPDATED:
          return await this.generateEventUpdatedContent(entityId, actorId);

        case NotificationEntityType.EVENT_DELETED:
          return await this.generateEventDeletedContent(entityId, actorId);

        case NotificationEntityType.EVENT_REGISTERED:
          return await this.generateEventRegisteredContent(entityId, actorId);

        case NotificationEntityType.EVENT_UNREGISTERED:
          return await this.generateEventUnregisteredContent(entityId, actorId);

        case NotificationEntityType.EVENT_STARTING_SOON:
          return await this.generateEventStartingSoonContent(entityId);

        case NotificationEntityType.EVENT_REMINDER:
          return await this.generateEventReminderContent(entityId, customData);

        case NotificationEntityType.ORGANIZATION_CREATED:
          return await this.generateOrganizationCreatedContent(
            entityId,
            actorId
          );

        case NotificationEntityType.ORGANIZATION_UPDATED:
          return await this.generateOrganizationUpdatedContent(
            entityId,
            actorId
          );

        // Add more cases as needed...

        default:
          return {
            title: 'Notification',
            message: 'You have a new notification',
          };
      }
    } catch (error) {
      logger.error('Error generating notification content:', error);
      return {
        title: 'Notification',
        message: 'You have a new notification',
      };
    }
  }

  // Event notification content generators
  private static async generateEventCreatedContent(
    eventId: string,
    actorId?: string
  ): Promise<NotificationContent> {
    const event = await this.eventModel.findById(eventId);
    if (!event) {
      return {
        title: 'Event Created',
        message: 'A new event has been created',
      };
    }

    return {
      title: 'New Event Created',
      message: `"${event.title}" has been created and is available for registration`,
    };
  }

  private static async generateEventUpdatedContent(
    eventId: string,
    actorId?: string
  ): Promise<NotificationContent> {
    const event = await this.eventModel.findById(eventId);
    if (!event) {
      return { title: 'Event Updated', message: 'An event has been updated' };
    }

    return {
      title: 'Event Updated',
      message: `"${event.title}" has been updated. Check out the latest details!`,
    };
  }

  private static async generateEventDeletedContent(
    eventId: string,
    actorId?: string
  ): Promise<NotificationContent> {
    return {
      title: 'Event Cancelled',
      message: 'An event you were registered for has been cancelled',
    };
  }

  private static async generateEventRegisteredContent(
    eventId: string,
    actorId?: string
  ): Promise<NotificationContent> {
    const event = await this.eventModel.findById(eventId);
    if (!event) {
      return {
        title: 'Event Registration',
        message: 'Someone registered for an event',
      };
    }

    return {
      title: 'New Registration',
      message: `Someone registered for "${event.title}"`,
    };
  }

  private static async generateEventUnregisteredContent(
    eventId: string,
    actorId?: string
  ): Promise<NotificationContent> {
    const event = await this.eventModel.findById(eventId);
    if (!event) {
      return {
        title: 'Event Unregistration',
        message: 'Someone unregistered from an event',
      };
    }

    return {
      title: 'Registration Cancelled',
      message: `Someone cancelled their registration for "${event.title}"`,
    };
  }

  private static async generateEventStartingSoonContent(
    eventId: string
  ): Promise<NotificationContent> {
    const event = await this.eventModel.findById(eventId);
    if (!event) {
      return {
        title: 'Event Starting Soon',
        message: 'An event is starting soon',
      };
    }

    const startTime = new Date(event.start_time);
    const timeString = startTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });

    return {
      title: 'Event Starting Soon!',
      message: `"${event.title}" is starting at ${timeString}`,
    };
  }

  private static async generateEventReminderContent(
    entityId: string,
    customData?: any
  ): Promise<NotificationContent> {
    // For custom notifications, use the provided title and message
    if (customData?.title && customData?.message) {
      return {
        title: customData.title,
        message: customData.message,
      };
    }

    // For automatic reminders, generate based on event data
    const event = await this.eventModel.findById(entityId);
    if (!event) {
      return { title: 'Event Reminder', message: 'You have an upcoming event' };
    }

    const startTime = new Date(event.start_time);
    const now = new Date();
    const hoursUntil = Math.round(
      (startTime.getTime() - now.getTime()) / (1000 * 60 * 60)
    );

    let timeText = '';
    if (hoursUntil <= 1) {
      timeText = 'starting soon';
    } else if (hoursUntil <= 2) {
      timeText = 'in 2 hours';
    } else if (hoursUntil <= 24) {
      timeText = `in ${hoursUntil} hours`;
    } else {
      timeText = 'tomorrow';
    }

    return {
      title: `Event Reminder: ${event.title}`,
      message: `Don't forget! "${event.title}" is ${timeText}`,
    };
  }

  // Organization notification content generators
  private static async generateOrganizationCreatedContent(
    orgId: string,
    actorId?: string
  ): Promise<NotificationContent> {
    const organization = await this.organizationModel.findById(orgId);
    if (!organization) {
      return {
        title: 'Organization Created',
        message: 'A new organization has been created',
      };
    }

    return {
      title: 'New Organization',
      message: `"${organization.name}" has joined the platform`,
    };
  }

  private static async generateOrganizationUpdatedContent(
    orgId: string,
    actorId?: string
  ): Promise<NotificationContent> {
    const organization = await this.organizationModel.findById(orgId);
    if (!organization) {
      return {
        title: 'Organization Updated',
        message: 'An organization has been updated',
      };
    }

    return {
      title: 'Organization Updated',
      message: `"${organization.name}" has updated their information`,
    };
  }
}
