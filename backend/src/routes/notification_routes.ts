import { Router } from 'express';
import { NotificationController } from '../controllers/notification_controller';
import { requireLogin } from '../middleware/auth';
import { oapi } from './openapi_routes';

const router: Router = Router();
const notificationController = new NotificationController();

// Apply authentication middleware to all routes
router.use(requireLogin as any);

// GET /api/notifications - Get notifications for the current user
oapi.path({
  tags: ['Notifications'],
  summary: 'Get user notifications',
  description: 'Get paginated list of notifications for the current user',
  security: [
    { bearerAuth: [] },
    { sessionAuth: [] }
  ],
  parameters: [
    {
      name: 'page',
      in: 'query',
      description: 'Page number',
      schema: { type: 'integer', minimum: 1, default: 1 }
    },
    {
      name: 'limit',
      in: 'query',
      description: 'Number of notifications per page',
      schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
    },
    {
      name: 'type',
      in: 'query',
      description: 'Filter by notification type',
      schema: { 
        type: 'string',
        enum: ['event_reminder', 'event_update', 'event_cancelled', 'organization_invite', 'role_assigned', 'comment_reply', 'system']
      }
    },
    {
      name: 'isRead',
      in: 'query',
      description: 'Filter by read status',
      schema: { type: 'boolean' }
    }
  ],
  responses: {
    '200': {
      description: 'Notifications retrieved successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/NotificationsResponse' }
        }
      }
    },
    '401': { $ref: '#/components/responses/Unauthorized' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.get('/', notificationController.getNotifications as any);

// GET /api/notifications/stats - Get notification statistics
oapi.path({
  tags: ['Notifications'],
  summary: 'Get notification statistics',
  description: 'Get notification statistics for the current user',
  security: [
    { bearerAuth: [] },
    { sessionAuth: [] }
  ],
  responses: {
    '200': {
      description: 'Notification statistics retrieved successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/NotificationStatsResponse' }
        }
      }
    },
    '401': { $ref: '#/components/responses/Unauthorized' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.get('/stats', notificationController.getNotificationStats as any);

// GET /api/notifications/preferences - Get notification preferences
oapi.path({
  tags: ['Notifications'],
  summary: 'Get notification preferences',
  description: 'Get notification preferences for the current user',
  security: [
    { bearerAuth: [] },
    { sessionAuth: [] }
  ],
  responses: {
    '200': {
      description: 'Notification preferences retrieved successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/NotificationPreferencesResponse' }
        }
      }
    },
    '401': { $ref: '#/components/responses/Unauthorized' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.get(
  '/preferences',
  notificationController.getNotificationPreferences as any
);

// GET /api/notifications/:id - Get a specific notification
oapi.path({
  tags: ['Notifications'],
  summary: 'Get notification by ID',
  description: 'Get a specific notification by its ID',
  security: [
    { bearerAuth: [] },
    { sessionAuth: [] }
  ],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      description: 'Notification ID',
      schema: { type: 'string' }
    }
  ],
  responses: {
    '200': {
      description: 'Notification retrieved successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/NotificationResponse' }
        }
      }
    },
    '401': { $ref: '#/components/responses/Unauthorized' },
    '404': { $ref: '#/components/responses/NotFound' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.get('/:id', notificationController.getNotificationById as any);

// PUT /api/notifications/:id - Update a notification
oapi.path({
  tags: ['Notifications'],
  summary: 'Update notification',
  description: 'Update a specific notification',
  security: [
    { bearerAuth: [] },
    { sessionAuth: [] }
  ],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      description: 'Notification ID',
      schema: { type: 'string' }
    }
  ],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/UpdateNotificationRequest' }
      }
    }
  },
  responses: {
    '200': {
      description: 'Notification updated successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/NotificationResponse' }
        }
      }
    },
    '400': { $ref: '#/components/responses/ValidationError' },
    '401': { $ref: '#/components/responses/Unauthorized' },
    '404': { $ref: '#/components/responses/NotFound' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.put('/:id', notificationController.updateNotification as any);

// POST /api/notifications/mark-read - Mark multiple notifications as read
oapi.path({
  tags: ['Notifications'],
  summary: 'Mark notifications as read',
  description: 'Mark multiple notifications as read',
  security: [
    { bearerAuth: [] },
    { sessionAuth: [] }
  ],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/MarkReadRequest' }
      }
    }
  },
  responses: {
    '200': {
      description: 'Notifications marked as read successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/SuccessResponse' }
        }
      }
    },
    '400': { $ref: '#/components/responses/ValidationError' },
    '401': { $ref: '#/components/responses/Unauthorized' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.post(
  '/mark-read',
  notificationController.markNotificationsAsRead as any
);

// POST /api/notifications/mark-all-read - Mark all notifications as read
oapi.path({
  tags: ['Notifications'],
  summary: 'Mark all notifications as read',
  description: 'Mark all notifications as read for the current user',
  security: [
    { bearerAuth: [] },
    { sessionAuth: [] }
  ],
  responses: {
    '200': {
      description: 'All notifications marked as read successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/SuccessResponse' }
        }
      }
    },
    '401': { $ref: '#/components/responses/Unauthorized' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.post(
  '/mark-all-read',
  notificationController.markAllNotificationsAsRead as any
);

// POST /api/notifications - Create a notification (for internal use)
oapi.path({
  tags: ['Notifications'],
  summary: 'Create notification',
  description: 'Create a new notification (internal use)',
  security: [
    { bearerAuth: [] },
    { sessionAuth: [] }
  ],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/CreateNotificationRequest' }
      }
    }
  },
  responses: {
    '201': {
      description: 'Notification created successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/NotificationResponse' }
        }
      }
    },
    '400': { $ref: '#/components/responses/ValidationError' },
    '401': { $ref: '#/components/responses/Unauthorized' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.post('/', notificationController.createNotification as any);

// PUT /api/notifications/preferences - Update notification preferences
oapi.path({
  tags: ['Notifications'],
  summary: 'Update notification preferences',
  description: 'Update notification preferences for the current user',
  security: [
    { bearerAuth: [] },
    { sessionAuth: [] }
  ],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/UpdatePreferencesRequest' }
      }
    }
  },
  responses: {
    '200': {
      description: 'Notification preferences updated successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/NotificationPreferencesResponse' }
        }
      }
    },
    '400': { $ref: '#/components/responses/ValidationError' },
    '401': { $ref: '#/components/responses/Unauthorized' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.put(
  '/preferences',
  notificationController.updateNotificationPreferences as any
);

// PATCH /api/notifications/:id/read - Mark notification as read when clicked
oapi.path({
  tags: ['Notifications'],
  summary: 'Mark notification as read',
  description: 'Mark a specific notification as read',
  security: [
    { bearerAuth: [] },
    { sessionAuth: [] }
  ],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      description: 'Notification ID',
      schema: { type: 'string' }
    }
  ],
  responses: {
    '200': {
      description: 'Notification marked as read successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/SuccessResponse' }
        }
      }
    },
    '401': { $ref: '#/components/responses/Unauthorized' },
    '404': { $ref: '#/components/responses/NotFound' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.patch('/:id/read', notificationController.markNotificationAsRead as any);

// PATCH /api/notifications/events/:eventId/mark-read - Mark all event notifications as read
oapi.path({
  tags: ['Notifications'],
  summary: 'Mark event notifications as read',
  description: 'Mark all notifications for a specific event as read',
  security: [
    { bearerAuth: [] },
    { sessionAuth: [] }
  ],
  parameters: [
    {
      name: 'eventId',
      in: 'path',
      required: true,
      description: 'Event ID',
      schema: { type: 'string' }
    }
  ],
  responses: {
    '200': {
      description: 'Event notifications marked as read successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/SuccessResponse' }
        }
      }
    },
    '401': { $ref: '#/components/responses/Unauthorized' },
    '404': { $ref: '#/components/responses/NotFound' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.patch(
  '/events/:eventId/mark-read',
  notificationController.markEventNotificationsAsRead as any
);

// POST /api/notifications/bulk-read - Mark all notifications as read
oapi.path({
  tags: ['Notifications'],
  summary: 'Bulk mark all notifications as read',
  description: 'Mark all notifications as read for the current user',
  security: [
    { bearerAuth: [] },
    { sessionAuth: [] }
  ],
  responses: {
    '200': {
      description: 'All notifications marked as read successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/SuccessResponse' }
        }
      }
    },
    '401': { $ref: '#/components/responses/Unauthorized' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.post('/bulk-read', notificationController.bulkMarkAllAsRead as any);

// DELETE /api/notifications/bulk - Delete all notifications
oapi.path({
  tags: ['Notifications'],
  summary: 'Bulk delete all notifications',
  description: 'Delete all notifications for the current user',
  security: [
    { bearerAuth: [] },
    { sessionAuth: [] }
  ],
  responses: {
    '200': {
      description: 'All notifications deleted successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/SuccessResponse' }
        }
      }
    },
    '401': { $ref: '#/components/responses/Unauthorized' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.delete(
  '/bulk',
  notificationController.bulkDeleteAllNotifications as any
);

// DELETE /api/notifications - Delete multiple notifications (existing functionality)
oapi.path({
  tags: ['Notifications'],
  summary: 'Delete multiple notifications',
  description: 'Delete multiple notifications by their IDs',
  security: [
    { bearerAuth: [] },
    { sessionAuth: [] }
  ],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/DeleteNotificationsRequest' }
      }
    }
  },
  responses: {
    '200': {
      description: 'Notifications deleted successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/SuccessResponse' }
        }
      }
    },
    '400': { $ref: '#/components/responses/ValidationError' },
    '401': { $ref: '#/components/responses/Unauthorized' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.delete('/', notificationController.deleteNotifications as any);

// DELETE /api/notifications/:id - Delete a specific notification
oapi.path({
  tags: ['Notifications'],
  summary: 'Delete notification',
  description: 'Delete a specific notification by its ID',
  security: [
    { bearerAuth: [] },
    { sessionAuth: [] }
  ],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      description: 'Notification ID',
      schema: { type: 'string' }
    }
  ],
  responses: {
    '200': {
      description: 'Notification deleted successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/SuccessResponse' }
        }
      }
    },
    '401': { $ref: '#/components/responses/Unauthorized' },
    '404': { $ref: '#/components/responses/NotFound' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.delete('/:id', notificationController.deleteNotification as any);

export default router;
