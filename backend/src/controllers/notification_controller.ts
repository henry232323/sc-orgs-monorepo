import { Request, Response } from 'express';
import { User } from '../types/user';
import { NotificationModel } from '../models/notification_model';
import {
  CreateNotificationObjectData,
  UpdateNotificationData,
  NotificationListQuery,
  NotificationEntityType,
} from '../types/notification';
import logger from '../config/logger';

import { getUserFromRequest } from '../utils/user-casting';
export class NotificationController {
  private notificationModel: NotificationModel;

  constructor() {
    this.notificationModel = new NotificationModel();
  }

  // Get notifications for the current user
  getNotifications = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getUserFromRequest(req)?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const {
        page = 1,
        limit = 20,
        is_read,
        entity_type,
        sort_by = 'created_at',
        sort_order = 'desc',
      } = req.query;

      const query: NotificationListQuery = {
        user_id: userId,
        page: parseInt(page as string) || 1,
        limit: Math.min(parseInt(limit as string) || 20, 100), // Max 100 per page
        is_read: is_read !== undefined ? is_read === 'true' : undefined,
        entity_type: entity_type
          ? (parseInt(entity_type as string) as NotificationEntityType)
          : undefined,
        sort_by: sort_by as 'created_at' | 'read_at',
        sort_order: sort_order as 'asc' | 'desc',
      };

      const result =
        await this.notificationModel.getNotificationsForUser(query);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Error getting notifications:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  // Get notification statistics for the current user
  getNotificationStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getUserFromRequest(req)?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const stats = await this.notificationModel.getNotificationStats(userId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Error getting notification stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  // Get a specific notification by ID
  getNotificationById = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getUserFromRequest(req)?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const notification = await this.notificationModel.getNotificationById(id);

      if (!notification) {
        res.status(404).json({ error: 'Notification not found' });
        return;
      }

      // Check if the notification belongs to the current user
      if (notification.notifier_id !== userId) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      res.json({
        success: true,
        data: notification,
      });
    } catch (error) {
      logger.error('Error getting notification by ID:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  // Update a notification (mark as read/unread)
  updateNotification = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getUserFromRequest(req)?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const updateData: UpdateNotificationData = req.body;

      // First, check if the notification exists and belongs to the user
      const existingNotification =
        await this.notificationModel.getNotificationById(id);
      if (!existingNotification) {
        res.status(404).json({ error: 'Notification not found' });
        return;
      }

      if (existingNotification.notifier_id !== userId) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      const updatedNotification =
        await this.notificationModel.updateNotification(id, updateData);

      res.json({
        success: true,
        data: updatedNotification,
      });
    } catch (error) {
      logger.error('Error updating notification:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  // Mark multiple notifications as read
  markNotificationsAsRead = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const userId = getUserFromRequest(req)?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { notification_ids } = req.body;

      if (!Array.isArray(notification_ids) || notification_ids.length === 0) {
        res
          .status(400)
          .json({ error: 'notification_ids must be a non-empty array' });
        return;
      }

      // Verify all notifications belong to the user
      for (const notificationId of notification_ids) {
        const notification =
          await this.notificationModel.getNotificationById(notificationId);
        if (!notification || notification.notifier_id !== userId) {
          res.status(403).json({
            error: 'One or more notifications not found or forbidden',
          });
          return;
        }
      }

      const updatedCount =
        await this.notificationModel.markNotificationsAsRead(notification_ids);

      res.json({
        success: true,
        data: {
          updated_count: updatedCount,
        },
      });
    } catch (error) {
      logger.error('Error marking notifications as read:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  // Mark all notifications as read for the current user
  markAllNotificationsAsRead = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const userId = getUserFromRequest(req)?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const updatedCount =
        await this.notificationModel.markAllNotificationsAsRead(userId);

      res.json({
        success: true,
        data: {
          updated_count: updatedCount,
        },
      });
    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  // Delete a notification
  deleteNotification = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getUserFromRequest(req)?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;

      // First, check if the notification exists and belongs to the user
      const existingNotification =
        await this.notificationModel.getNotificationById(id);
      if (!existingNotification) {
        res.status(404).json({ error: 'Notification not found' });
        return;
      }

      if (existingNotification.notifier_id !== userId) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      await this.notificationModel.deleteNotification(id);

      res.json({
        success: true,
        message: 'Notification deleted successfully',
      });
    } catch (error) {
      logger.error('Error deleting notification:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  // Delete multiple notifications
  deleteNotifications = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getUserFromRequest(req)?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { notification_ids } = req.body;

      if (!Array.isArray(notification_ids) || notification_ids.length === 0) {
        res
          .status(400)
          .json({ error: 'notification_ids must be a non-empty array' });
        return;
      }

      // Verify all notifications belong to the user
      for (const notificationId of notification_ids) {
        const notification =
          await this.notificationModel.getNotificationById(notificationId);
        if (!notification || notification.notifier_id !== userId) {
          res.status(403).json({
            error: 'One or more notifications not found or forbidden',
          });
          return;
        }
      }

      const deletedCount =
        await this.notificationModel.deleteNotifications(notification_ids);

      res.json({
        success: true,
        data: {
          deleted_count: deletedCount,
        },
      });
    } catch (error) {
      logger.error('Error deleting notifications:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  // Create a notification (for internal use or admin)
  createNotification = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getUserFromRequest(req)?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const data: CreateNotificationObjectData = req.body;

      // Validate required fields
      if (
        !data.entity_type ||
        !data.entity_id ||
        !data.actor_id ||
        !data.notifier_ids
      ) {
        res.status(400).json({
          error:
            'Missing required fields: entity_type, entity_id, actor_id, notifier_ids',
        });
        return;
      }

      if (!Array.isArray(data.notifier_ids) || data.notifier_ids.length === 0) {
        res
          .status(400)
          .json({ error: 'notifier_ids must be a non-empty array' });
        return;
      }

      const result =
        await this.notificationModel.createCompleteNotification(data);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Error creating notification:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  // Get notification preferences (placeholder for future implementation)
  getNotificationPreferences = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const userId = getUserFromRequest(req)?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // TODO: Implement notification preferences table and model
      const defaultPreferences = {
        email_notifications: true,
        push_notifications: true,
        organization_updates: true,
        event_reminders: true,
        security_alerts: true,
        marketing: false,
      };

      res.json({
        success: true,
        data: defaultPreferences,
      });
    } catch (error) {
      logger.error('Error getting notification preferences:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  // Update notification preferences (placeholder for future implementation)
  updateNotificationPreferences = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const userId = getUserFromRequest(req)?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // TODO: Implement notification preferences update
      res.json({
        success: true,
        message: 'Notification preferences updated successfully',
      });
    } catch (error) {
      logger.error('Error updating notification preferences:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Mark a notification as read when clicked
   */
  markNotificationAsRead = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const userId = getUserFromRequest(req)?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const notification = await this.notificationModel.getNotificationById(id);

      if (!notification) {
        res.status(404).json({ error: 'Notification not found' });
        return;
      }

      if (notification.notifier_id !== userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      await this.notificationModel.markAsRead(id);
      logger.debug(`Marked notification ${id} as read for user ${userId}`);

      res.json({
        success: true,
        message: 'Notification marked as read',
      });
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Mark all event reminder notifications as read when viewing event page
   */
  markEventNotificationsAsRead = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const userId = getUserFromRequest(req)?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { eventId } = req.params;

      // Mark both EVENT_REMINDER and custom event notifications as read
      const reminderCount =
        await this.notificationModel.markEntityNotificationsAsRead(
          userId,
          NotificationEntityType.EVENT_REMINDER,
          eventId
        );

      const customCount =
        await this.notificationModel.markEntityNotificationsAsRead(
          userId,
          NotificationEntityType.EVENT_STARTING_SOON,
          eventId
        );

      const totalMarked = reminderCount + customCount;
      logger.debug(
        `Marked ${totalMarked} event notifications as read for user ${userId} and event ${eventId}`
      );

      res.json({
        success: true,
        message: `Marked ${totalMarked} event notifications as read`,
        marked_count: totalMarked,
      });
    } catch (error) {
      logger.error('Error marking event notifications as read:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Bulk mark all notifications as read for a user
   */
  bulkMarkAllAsRead = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getUserFromRequest(req)?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const affectedCount = await this.notificationModel.markAllAsRead(userId);
      logger.debug(
        `Marked ${affectedCount} notifications as read for user ${userId}`
      );

      res.json({
        success: true,
        message: `Marked ${affectedCount} notifications as read`,
        affected_count: affectedCount,
      });
    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Bulk delete all notifications for a user
   */
  bulkDeleteAllNotifications = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const userId = getUserFromRequest(req)?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const affectedCount =
        await this.notificationModel.deleteAllNotifications(userId);
      logger.debug(`Deleted ${affectedCount} notifications for user ${userId}`);

      res.json({
        success: true,
        message: `Deleted ${affectedCount} notifications`,
        affected_count: affectedCount,
      });
    } catch (error) {
      logger.error('Error deleting all notifications:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}
