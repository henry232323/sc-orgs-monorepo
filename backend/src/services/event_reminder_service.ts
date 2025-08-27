import { EventModel } from '../models/event_model';
import { NotificationService } from './notification_service';
import { NotificationEntityType } from '../types/notification';
import logger from '../config/logger';
import db from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export class EventReminderService {
  private eventModel: EventModel;
  private notificationService: NotificationService;

  constructor() {
    this.eventModel = new EventModel();
    this.notificationService = new NotificationService();
  }

  /**
   * Get events starting between two dates
   */
  async getEventsStartingBetween(
    startDate: Date,
    endDate: Date
  ): Promise<any[]> {
    try {
      return await this.eventModel.getEventsStartingBetween(startDate, endDate);
    } catch (error) {
      logger.error('Error getting events starting between dates:', error);
      throw error;
    }
  }

  /**
   * Get event registrations for a specific event
   */
  async getEventRegistrations(eventId: string): Promise<any[]> {
    try {
      return await this.eventModel.getEventRegistrations(eventId);
    } catch (error) {
      logger.error('Error getting event registrations:', error);
      throw error;
    }
  }

  /**
   * Send a specific type of reminder for an event
   */
  async sendEventReminder(
    event: any,
    reminderType: '24h' | '2h' | '1h' | 'starting'
  ): Promise<void> {
    try {
      // Ensure we have the full event data with title
      if (!event.title) {
        logger.error(`Event ${event.id} missing title, fetching full event data`);
        const fullEvent = await this.eventModel.findById(event.id);
        if (!fullEvent) {
          logger.error(`Event ${event.id} not found, skipping reminder`);
          return;
        }
        event = fullEvent;
      }

      const registrations = await this.getEventRegistrations(event.id);
      const notifierIds = registrations.map(reg => reg.user_id);

      if (notifierIds.length === 0) {
        logger.info(
          `No registrations found for event ${event.id}, skipping ${reminderType} reminder`
        );
        return;
      }

      let entityType: any;
      let message: string;

      switch (reminderType) {
        case '24h':
          entityType = NotificationEntityType.EVENT_REMINDER;
          message = `Reminder: The event "${event.title}" is starting in 24 hours!`;
          break;
        case '2h':
          entityType = NotificationEntityType.EVENT_REMINDER;
          message = `Reminder: The event "${event.title}" is starting in 2 hours!`;
          break;
        case '1h':
          entityType = NotificationEntityType.EVENT_REMINDER;
          message = `Reminder: The event "${event.title}" is starting in 1 hour!`;
          break;
        case 'starting':
          entityType = NotificationEntityType.EVENT_STARTING_SOON;
          message = `The event "${event.title}" is starting soon!`;
          break;
        default:
          logger.error(`Unknown reminder type: ${reminderType}`);
          return;
      }

      // Clean up older reminder notifications before sending new one
      await this.cleanupOlderReminders(event.id, reminderType);

      await this.notificationService.createCustomEventNotification(
        entityType,
        event.id,
        'system',
        notifierIds,
        `Event Reminder: ${event.title}`,
        message,
        { reminderType } // Add reminderType to custom data for cleanup
      );

      logger.info(
        `Sent ${reminderType} reminder for event "${event.title}" to ${notifierIds.length} participants`
      );
    } catch (error) {
      logger.error(
        `Error sending ${reminderType} reminder for event ${event.id}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Create scheduled tasks for an event (only future tasks)
   */
  async createEventScheduledTasks(
    eventId: string,
    eventStartTime: Date
  ): Promise<void> {
    try {
      const now = new Date();
      const tasks = [];

      // 24-hour reminder (only if event is more than 24 hours away)
      const twentyFourHourTime = new Date(
        eventStartTime.getTime() - 24 * 60 * 60 * 1000
      );
      if (twentyFourHourTime > now) {
        tasks.push({
          id: uuidv4(),
          event_id: eventId,
          reminder_type: '24h',
          scheduled_time: twentyFourHourTime,
          status: 'pending',
          created_at: new Date(),
          updated_at: new Date(),
        });
      }

      // 2-hour reminder (only if event is more than 2 hours away)
      const twoHourTime = new Date(
        eventStartTime.getTime() - 2 * 60 * 60 * 1000
      );
      if (twoHourTime > now) {
        tasks.push({
          id: uuidv4(),
          event_id: eventId,
          reminder_type: '2h',
          scheduled_time: twoHourTime,
          status: 'pending',
          created_at: new Date(),
          updated_at: new Date(),
        });
      }

      // 1-hour reminder (only if event is more than 1 hour away)
      const oneHourTime = new Date(eventStartTime.getTime() - 60 * 60 * 1000);
      if (oneHourTime > now) {
        tasks.push({
          id: uuidv4(),
          event_id: eventId,
          reminder_type: '1h',
          scheduled_time: oneHourTime,
          status: 'pending',
          created_at: new Date(),
          updated_at: new Date(),
        });
      }

      // Starting soon notification (only if event is in the future)
      if (eventStartTime > now) {
        tasks.push({
          id: uuidv4(),
          event_id: eventId,
          reminder_type: 'starting',
          scheduled_time: eventStartTime,
          status: 'pending',
          created_at: new Date(),
          updated_at: new Date(),
        });
      }

      if (tasks.length > 0) {
        // Handle conflicts for scheduled tasks
        for (const task of tasks) {
          await db('scheduled_tasks')
            .insert(task)
            .onConflict(['event_id', 'reminder_type'])
            .merge({
              scheduled_time: task.scheduled_time,
              status: 'pending',
              updated_at: new Date(),
            });
        }

        logger.info(
          `Created ${tasks.length} scheduled tasks for event ${eventId} (skipped ${4 - tasks.length} past-due tasks)`
        );
      } else {
        logger.info(
          `Event ${eventId} is in the past or too close, no tasks created`
        );
      }
    } catch (error) {
      logger.error('Error creating scheduled tasks for event:', error);
      throw error;
    }
  }

  /**
   * Get tasks due between two dates
   */
  async getTasksDueBetween(startDate: Date, endDate: Date): Promise<any[]> {
    try {
      return await db('scheduled_tasks')
        .where('status', 'pending')
        .whereBetween('scheduled_time', [startDate, endDate])
        .orderBy('scheduled_time', 'asc');
    } catch (error) {
      logger.error('Error getting tasks due between dates:', error);
      throw error;
    }
  }

  /**
   * Get scheduled tasks for a specific event and reminder type
   */
  async getScheduledTasksForEvent(
    eventId: string,
    reminderType: string
  ): Promise<any[]> {
    try {
      return await db('scheduled_tasks').where({
        event_id: eventId,
        reminder_type: reminderType,
        status: 'pending',
      });
    } catch (error) {
      logger.error('Error getting scheduled tasks:', error);
      throw error;
    }
  }

  /**
   * Mark a specific task as completed
   */
  async markTaskCompleted(taskId: string): Promise<void> {
    try {
      await db('scheduled_tasks').where('id', taskId).update({
        status: 'completed',
        updated_at: new Date(),
      });

      logger.info(`Marked task ${taskId} as completed`);
    } catch (error) {
      logger.error('Error marking task as completed:', error);
      throw error;
    }
  }

  /**
   * Mark a specific task as failed
   */
  async markTaskFailed(taskId: string): Promise<void> {
    try {
      await db('scheduled_tasks').where('id', taskId).update({
        status: 'failed',
        updated_at: new Date(),
      });

      logger.info(`Marked task ${taskId} as failed`);
    } catch (error) {
      logger.error('Error marking task as failed:', error);
      throw error;
    }
  }

  /**
   * Mark scheduled tasks as completed (legacy method for compatibility)
   */
  async markScheduledTasksCompleted(
    eventId: string,
    reminderType: string
  ): Promise<void> {
    try {
      await db('scheduled_tasks')
        .where({
          event_id: eventId,
          reminder_type: reminderType,
          status: 'pending',
        })
        .update({
          status: 'completed',
          updated_at: new Date(),
        });

      logger.info(
        `Marked ${reminderType} scheduled tasks as completed for event ${eventId}`
      );
    } catch (error) {
      logger.error('Error marking scheduled tasks as completed:', error);
      throw error;
    }
  }

  /**
   * Mark scheduled tasks as failed (legacy method for compatibility)
   */
  async markScheduledTasksFailed(
    eventId: string,
    reminderType: string
  ): Promise<void> {
    try {
      await db('scheduled_tasks')
        .where({
          event_id: eventId,
          reminder_type: reminderType,
          status: 'pending',
        })
        .update({
          status: 'failed',
          updated_at: new Date(),
        });

      logger.info(
        `Marked ${reminderType} scheduled tasks as failed for event ${eventId}`
      );
    } catch (error) {
      logger.error('Error marking scheduled tasks as failed:', error);
      throw error;
    }
  }

  /**
   * Clean up old completed/failed scheduled tasks
   */
  async cleanupOldNotifications(): Promise<void> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const deletedTasks = await db('scheduled_tasks')
        .where('created_at', '<', thirtyDaysAgo)
        .whereIn('status', ['completed', 'failed'])
        .del();

      logger.info(`Cleaned up ${deletedTasks} old scheduled task records`);
    } catch (error) {
      logger.error('Error cleaning up old notifications:', error);
      throw error;
    }
  }

  /**
   * Clean up older reminder notifications when issuing a new reminder
   */
  private async cleanupOlderReminders(
    eventId: string,
    currentReminderType: '24h' | '2h' | '1h' | 'starting'
  ): Promise<void> {
    try {
      const { NotificationModel } = await import(
        '../models/notification_model'
      );
      const notificationModel = new NotificationModel();

      const deletedCount = await notificationModel.deleteOlderEventReminders(
        eventId,
        currentReminderType
      );

      if (deletedCount > 0) {
        logger.info(
          `Cleaned up ${deletedCount} older reminder notifications for event ${eventId} when issuing ${currentReminderType} reminder`
        );
      }
    } catch (error) {
      logger.error(
        `Error cleaning up older reminders for event ${eventId}:`,
        error
      );
      // Don't throw - we don't want cleanup failures to prevent new notifications
    }
  }

  /**
   * Cancel all scheduled tasks and notifications for an event (used when event time changes)
   */
  async cancelEventScheduledTasks(eventId: string): Promise<void> {
    try {
      // Cancel all pending scheduled tasks for this event
      const cancelledTasks = await db('scheduled_tasks')
        .where({
          event_id: eventId,
          status: 'pending',
        })
        .update({
          status: 'cancelled',
          updated_at: new Date(),
        });

      logger.info(
        `Cancelled ${cancelledTasks} scheduled tasks for event ${eventId}`
      );

      // Remove all pending event reminder notifications for this event
      const { NotificationModel } = await import(
        '../models/notification_model'
      );
      const notificationModel = new NotificationModel();

      // Delete both EVENT_REMINDER and EVENT_STARTING_SOON notifications that haven't been read
      // Delete notifications in two steps for better performance
      const reminderNotificationIds = await db('notification')
        .join(
          'notification_object',
          'notification.notification_object_id',
          'notification_object.id'
        )
        .where({
          'notification_object.entity_type':
            NotificationEntityType.EVENT_REMINDER,
          'notification_object.entity_id': eventId,
          'notification.is_read': false,
        })
        .select('notification.id');

      const startingSoonNotificationIds = await db('notification')
        .join(
          'notification_object',
          'notification.notification_object_id',
          'notification_object.id'
        )
        .where({
          'notification_object.entity_type':
            NotificationEntityType.EVENT_STARTING_SOON,
          'notification_object.entity_id': eventId,
          'notification.is_read': false,
        })
        .select('notification.id');

      let reminderCount = 0;
      let startingSoonCount = 0;

      if (reminderNotificationIds.length > 0) {
        reminderCount = await db('notification')
          .whereIn(
            'id',
            reminderNotificationIds.map(n => n.id)
          )
          .del();
      }

      if (startingSoonNotificationIds.length > 0) {
        startingSoonCount = await db('notification')
          .whereIn(
            'id',
            startingSoonNotificationIds.map(n => n.id)
          )
          .del();
      }

      const totalDeleted = reminderCount + startingSoonCount;
      if (totalDeleted > 0) {
        logger.info(
          `Deleted ${totalDeleted} pending reminder notifications for event ${eventId}`
        );
      }

      // Clear any scheduled timeouts from the TaskScheduler
      const taskScheduler = (global as any).taskScheduler;
      if (taskScheduler && taskScheduler.clearEventTimeouts) {
        taskScheduler.clearEventTimeouts(eventId);
      }
    } catch (error) {
      logger.error(
        `Error cancelling scheduled tasks for event ${eventId}:`,
        error
      );
      throw error;
    }
  }
}
