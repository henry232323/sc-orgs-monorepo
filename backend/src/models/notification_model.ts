import db from '../config/database';
import {
  NotificationObject,
  Notification,
  NotificationChange,
  NotificationWithDetails,
  CreateNotificationObjectData,
  CreateNotificationData,
  UpdateNotificationData,
  NotificationListQuery,
  NotificationListResponse,
  NotificationEntityType,
  NotificationStats,
} from '../types/notification';
import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger';
import { NotificationSerializer } from '../utils/notification_serializer';

export class NotificationModel {
  // Create a notification object (the core notification entity)
  async createNotificationObject(
    data: CreateNotificationObjectData
  ): Promise<NotificationObject> {
    // Let PostgreSQL generate the UUID
    const [notificationObject] = await db('notification_object')
      .insert({
        entity_type: data.entity_type,
        entity_id: data.entity_id,
        created_on: new Date(),
        status: 1,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');

    return notificationObject;
  }

  // Create notification change record (who triggered the notification)
  async createNotificationChange(
    notificationObjectId: string,
    actorId: string
  ): Promise<NotificationChange> {
    // Let PostgreSQL generate the UUID
    const [notificationChange] = await db('notification_change')
      .insert({
        notification_object_id: notificationObjectId,
        actor_id: actorId,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');

    return notificationChange;
  }

  // Create individual notifications for each notifier
  async createNotifications(
    notificationObjectId: string,
    notifierIds: string[]
  ): Promise<Notification[]> {
    // Let PostgreSQL generate the UUIDs for each notification
    const notifications = notifierIds.map(notifierId => ({
      notification_object_id: notificationObjectId,
      notifier_id: notifierId,
      is_read: false,
      created_at: new Date(),
      updated_at: new Date(),
    }));

    const insertedNotifications = await db('notification')
      .insert(notifications)
      .returning('*');

    return insertedNotifications;
  }

  // Create a complete notification (object + change + notifications)
  async createCompleteNotification(
    data: CreateNotificationObjectData & {
      customData?: { title?: string; message?: string };
    }
  ): Promise<{
    notificationObject: NotificationObject;
    notificationChange: NotificationChange;
    notifications: Notification[];
  }> {
    return await db.transaction(async trx => {
      // Create notification object (without title/message - will be generated dynamically)
      // Let PostgreSQL generate the UUID
      const notificationObjectData = {
        entity_type: data.entity_type,
        entity_id: data.entity_id,
        created_on: new Date(),
        status: 1,
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Store custom data as JSON if provided (for custom notifications)
      if (data.customData) {
        (notificationObjectData as any).custom_data = JSON.stringify(
          data.customData
        );
      }

      logger.debug('NotificationModel: Creating notification_object', {
        entityType: data.entity_type,
        entityId: data.entity_id,
        hasCustomData: !!data.customData,
      });

      const [notificationObject] = await trx('notification_object')
        .insert(notificationObjectData)
        .returning('*');

      // Create notification change - let PostgreSQL generate UUID
      const [notificationChange] = await trx('notification_change')
        .insert({
          notification_object_id: notificationObject.id,
          actor_id: data.actor_id,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning('*');

      // Create notifications for each notifier - let PostgreSQL generate UUIDs
      const notifications = data.notifier_ids.map(notifierId => ({
        notification_object_id: notificationObject.id,
        notifier_id: notifierId,
        is_read: false,
        created_at: new Date(),
        updated_at: new Date(),
      }));

      const insertedNotifications = await trx('notification')
        .insert(notifications)
        .returning('*');

      return {
        notificationObject,
        notificationChange,
        notifications: insertedNotifications,
      };
    });
  }

  // Get notifications for a user with pagination and filtering
  async getNotificationsForUser(
    query: NotificationListQuery
  ): Promise<NotificationListResponse> {
    const {
      user_id,
      page = 1,
      limit = 20,
      is_read,
      entity_type,
      sort_by = 'created_at',
      sort_order = 'desc',
    } = query;

    const offset = (page - 1) * limit;

    // Build the base query
    let baseQuery = db('notification as n')
      .select(
        'n.*',
        'no.entity_type',
        'no.entity_id',
        'no.created_on',
        'no.status as object_status',
        'no.custom_data',
        'nc.actor_id',
        'u.rsi_handle as actor_username',
        'u.avatar_url as actor_avatar'
      )
      .leftJoin(
        'notification_object as no',
        'n.notification_object_id',
        'no.id'
      )
      .leftJoin(
        'notification_change as nc',
        'no.id',
        'nc.notification_object_id'
      )
      .leftJoin('users as u', 'nc.actor_id', 'u.id')
      .where('n.notifier_id', user_id)
      .where('no.status', 1); // Only active notifications

    // Apply filters
    if (is_read !== undefined) {
      baseQuery = baseQuery.where('n.is_read', is_read);
    }

    if (entity_type !== undefined) {
      baseQuery = baseQuery.where('no.entity_type', entity_type);
    }

    // Get total count - PostgreSQL compatible
    const totalQuery = baseQuery.clone().clearSelect().count('n.id as count').first();
    const totalResult = await totalQuery;
    const total = parseInt(totalResult?.count as string) || 0;

    // Get unread count - PostgreSQL compatible
    const unreadQuery = baseQuery
      .clone()
      .clearSelect()
      .where('n.is_read', false)
      .count('n.id as count')
      .first();
    const unreadResult = await unreadQuery;
    const unreadCount = parseInt(unreadResult?.count as string) || 0;

    // Apply sorting and pagination
    const notifications = await baseQuery
      .orderBy(`n.${sort_by}`, sort_order)
      .limit(limit)
      .offset(offset);

    // Transform to NotificationWithDetails format with dynamic content
    const notificationsWithDetails: NotificationWithDetails[] =
      await Promise.all(
        notifications.map(async notification => {
          // Parse custom data if it exists
          let customData;
          try {
            customData = notification.custom_data
              ? JSON.parse(notification.custom_data)
              : undefined;
          } catch (error) {
            logger.warn('Failed to parse notification custom_data:', error);
            customData = undefined;
          }

          // Generate dynamic title and message
          const content =
            await NotificationSerializer.generateNotificationContent(
              notification.entity_type,
              notification.entity_id,
              notification.actor_id,
              customData
            );

          return {
            id: notification.id,
            notification_object_id: notification.notification_object_id,
            notifier_id: notification.notifier_id,
            is_read: notification.is_read,
            read_at: notification.read_at,
            created_at: notification.created_at,
            updated_at: notification.updated_at,
            title: content.title,
            message: content.message,
            notification_object: {
              id: notification.notification_object_id,
              entity_type: notification.entity_type,
              entity_id: notification.entity_id,
              created_on: notification.created_on,
              status: notification.object_status,
              title: content.title,
              message: content.message,
              created_at: notification.created_at,
              updated_at: notification.updated_at,
            },
            actor: notification.actor_id
              ? {
                  id: notification.actor_id,
                  rsi_handle: notification.actor_username,
                  avatar_url: notification.actor_avatar,
                }
              : undefined,
          };
        })
      );

    return {
      notifications: notificationsWithDetails,
      total,
      page,
      limit,
      has_more: offset + notifications.length < total,
      unread_count: unreadCount,
    };
  }

  // Update notification (mark as read/unread)
  async updateNotification(
    notificationId: string,
    data: UpdateNotificationData
  ): Promise<Notification> {
    const updateData: any = {
      ...data,
      updated_at: new Date(),
    };

    if (data.is_read && !data.read_at) {
      updateData.read_at = new Date();
    }

    const [notification] = await db('notification')
      .where('id', notificationId)
      .update(updateData)
      .returning('*');

    return notification;
  }

  // Mark multiple notifications as read
  async markNotificationsAsRead(notificationIds: string[]): Promise<number> {
    const result = await db('notification')
      .whereIn('id', notificationIds)
      .update({
        is_read: true,
        read_at: new Date(),
        updated_at: new Date(),
      });

    return result;
  }

  // Mark all notifications as read for a user
  async markAllNotificationsAsRead(userId: string): Promise<number> {
    const result = await db('notification')
      .where('notifier_id', userId)
      .where('is_read', false)
      .update({
        is_read: true,
        read_at: new Date(),
        updated_at: new Date(),
      });

    return result;
  }

  // Delete multiple notifications
  async deleteNotifications(notificationIds: string[]): Promise<number> {
    const result = await db('notification')
      .whereIn('id', notificationIds)
      .del();

    return result;
  }

  // Get notification statistics for a user
  async getNotificationStats(userId: string): Promise<NotificationStats> {
    // Total notifications
    const totalResult = await db('notification as n')
      .leftJoin(
        'notification_object as no',
        'n.notification_object_id',
        'no.id'
      )
      .where('n.notifier_id', userId)
      .where('no.status', 1)
      .count('* as count')
      .first();

    // Unread notifications
    const unreadResult = await db('notification as n')
      .leftJoin(
        'notification_object as no',
        'n.notification_object_id',
        'no.id'
      )
      .where('n.notifier_id', userId)
      .where('n.is_read', false)
      .where('no.status', 1)
      .count('* as count')
      .first();

    // Notifications by type
    const typeResults = await db('notification as n')
      .leftJoin(
        'notification_object as no',
        'n.notification_object_id',
        'no.id'
      )
      .where('n.notifier_id', userId)
      .where('no.status', 1)
      .select('no.entity_type')
      .count('* as count')
      .groupBy('no.entity_type');

    const notificationsByType: Record<NotificationEntityType, number> =
      {} as any;
    typeResults.forEach(result => {
      notificationsByType[result.entity_type as NotificationEntityType] =
        parseInt(result.count as string);
    });

    // Recent activity (last 7 days)
    const recentActivity = await db('notification as n')
      .leftJoin(
        'notification_object as no',
        'n.notification_object_id',
        'no.id'
      )
      .where('n.notifier_id', userId)
      .where('no.status', 1)
      .where('n.created_at', '>=', db.raw("datetime('now', '-7 days')"))
      .select(db.raw('date(n.created_at) as date'))
      .count('* as count')
      .groupBy(db.raw('date(n.created_at)'))
      .orderBy('date', 'desc');

    return {
      total_notifications: parseInt(totalResult?.count as string) || 0,
      unread_notifications: parseInt(unreadResult?.count as string) || 0,
      notifications_by_type: notificationsByType,
      recent_activity: recentActivity.map((activity: any) => ({
        date: activity.date,
        count: parseInt(activity.count as string),
      })),
    };
  }

  // Get notification by ID with details
  async getNotificationById(
    notificationId: string
  ): Promise<NotificationWithDetails | null> {
    const notification = await db('notification as n')
      .select(
        'n.*',
        'no.entity_type',
        'no.entity_id',
        'no.created_on',
        'no.status as object_status',
        'nc.actor_id',
        'u.rsi_handle as actor_username',
        'u.avatar_url as actor_avatar'
      )
      .leftJoin(
        'notification_object as no',
        'n.notification_object_id',
        'no.id'
      )
      .leftJoin(
        'notification_change as nc',
        'no.id',
        'nc.notification_object_id'
      )
      .leftJoin('users as u', 'nc.actor_id', 'u.id')
      .where('n.id', notificationId)
      .where('no.status', 1)
      .first();

    if (!notification) {
      return null;
    }

    return {
      id: notification.id,
      notification_object_id: notification.notification_object_id,
      notifier_id: notification.notifier_id,
      is_read: notification.is_read,
      read_at: notification.read_at,
      created_at: notification.created_at,
      updated_at: notification.updated_at,
      notification_object: {
        id: notification.notification_object_id,
        entity_type: notification.entity_type,
        entity_id: notification.entity_id,
        created_on: notification.created_on,
        status: notification.object_status,
        created_at: notification.created_at,
        updated_at: notification.updated_at,
      },
      actor: notification.actor_id
        ? {
            id: notification.actor_id,
            rsi_handle: notification.actor_username,
            avatar_url: notification.actor_avatar,
          }
        : undefined,
    };
  }

  // Clean up old notifications (for maintenance)
  async cleanupOldNotifications(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await db('notification_object')
      .where('created_on', '<', cutoffDate)
      .where('status', 0) // Only inactive notifications
      .del();

    return result;
  }

  /**
   * Mark a single notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    await db('notification').where('id', notificationId).update({
      is_read: true,
      read_at: new Date(),
      updated_at: new Date(),
    });
  }

  /**
   * Mark all notifications for a user as read for a specific entity
   */
  async markEntityNotificationsAsRead(
    userId: string,
    entityType: NotificationEntityType,
    entityId: string
  ): Promise<number> {
    // Update notifications in two steps for better performance
    const notificationIds = await db('notification')
      .join(
        'notification_object',
        'notification.notification_object_id',
        'notification_object.id'
      )
      .where({
        'notification.notifier_id': userId,
        'notification.is_read': false,
        'notification_object.entity_type': entityType,
        'notification_object.entity_id': entityId,
      })
      .select('notification.id');

    if (notificationIds.length === 0) return 0;

    const ids = notificationIds.map(n => n.id);
    const result = await db('notification').whereIn('id', ids).update({
      is_read: true,
      read_at: new Date(),
      updated_at: new Date(),
    });

    return result;
  }

  /**
   * Mark multiple notifications as read by their IDs
   */
  async markMultipleAsRead(notificationIds: string[]): Promise<number> {
    if (notificationIds.length === 0) return 0;

    const result = await db('notification')
      .whereIn('id', notificationIds)
      .where('is_read', false)
      .update({
        is_read: true,
        read_at: new Date(),
        updated_at: new Date(),
      });

    return result;
  }

  /**
   * Delete older reminder notifications for an event (cleanup when issuing new reminders)
   */
  async deleteOlderEventReminders(
    eventId: string,
    currentReminderType: '24h' | '2h' | '1h' | 'starting'
  ): Promise<number> {
    const reminderHierarchy = {
      '24h': 0,
      '2h': 1,
      '1h': 2,
      starting: 3,
    };

    const currentLevel = reminderHierarchy[currentReminderType];
    const olderReminders = Object.keys(reminderHierarchy).filter(
      reminder =>
        reminderHierarchy[reminder as keyof typeof reminderHierarchy] <
        currentLevel
    );

    if (olderReminders.length === 0) return 0;

    // Find notifications for this event that are older reminder types
    const notificationsToDelete = await db('notification')
      .join(
        'notification_object',
        'notification.notification_object_id',
        'notification_object.id'
      )
      .where({
        'notification_object.entity_type':
          NotificationEntityType.EVENT_REMINDER,
        'notification_object.entity_id': eventId,
      })
      .whereRaw(
        `json_extract(notification_object.custom_data, '$.reminderType') IN (${olderReminders.map(() => '?').join(',')})`,
        olderReminders
      )
      .select('notification.id');

    if (notificationsToDelete.length === 0) return 0;

    const notificationIds = notificationsToDelete.map(n => n.id);

    // Delete the notifications
    const result = await db('notification')
      .whereIn('id', notificationIds)
      .del();

    logger.info(
      `Deleted ${result} older reminder notifications for event ${eventId} when issuing ${currentReminderType} reminder`
    );
    return result;
  }

  /**
   * Delete a single notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    await db('notification').where('id', notificationId).del();
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<number> {
    const result = await db('notification')
      .where({
        notifier_id: userId,
        is_read: false,
      })
      .update({
        is_read: true,
        read_at: new Date(),
        updated_at: new Date(),
      });

    return result;
  }

  /**
   * Delete all notifications for a user
   */
  async deleteAllNotifications(userId: string): Promise<number> {
    const result = await db('notification').where('notifier_id', userId).del();

    return result;
  }
}
