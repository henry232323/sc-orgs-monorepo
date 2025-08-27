/**
 * Notification-related OpenAPI schemas
 */

// Notification Schema
export const NotificationSchema = {
  type: 'object' as const,
  properties: {
    id: {
      type: 'string' as const,
      description: 'Notification ID'
    },
    userId: {
      type: 'string' as const,
      description: 'User ID'
    },
    type: {
      type: 'string' as const,
      description: 'Notification type',
      enum: ['event_reminder', 'event_update', 'event_cancelled', 'organization_invite', 'role_assigned', 'comment_reply', 'system']
    },
    title: {
      type: 'string' as const,
      description: 'Notification title'
    },
    message: {
      type: 'string' as const,
      description: 'Notification message'
    },
    data: {
      type: 'object' as const,
      description: 'Additional notification data',
      nullable: true
    },
    isRead: {
      type: 'boolean' as const,
      description: 'Whether the notification has been read'
    },
    createdAt: {
      type: 'string' as const,
      format: 'date-time' as const,
      description: 'Notification creation timestamp'
    },
    readAt: {
      type: 'string' as const,
      format: 'date-time' as const,
      description: 'When the notification was read',
      nullable: true
    }
  },
  required: ['id', 'userId', 'type', 'title', 'message', 'isRead', 'createdAt']
};

// Notification Stats Schema
export const NotificationStatsSchema = {
  type: 'object' as const,
  properties: {
    total: {
      type: 'integer' as const,
      description: 'Total number of notifications'
    },
    unread: {
      type: 'integer' as const,
      description: 'Number of unread notifications'
    },
    byType: {
      type: 'object' as const,
      properties: {
        event_reminder: { type: 'integer' as const },
        event_update: { type: 'integer' as const },
        event_cancelled: { type: 'integer' as const },
        organization_invite: { type: 'integer' as const },
        role_assigned: { type: 'integer' as const },
        comment_reply: { type: 'integer' as const },
        system: { type: 'integer' as const }
      },
      description: 'Notification count by type'
    }
  },
  required: ['total', 'unread', 'byType']
};

// Notification Preferences Schema
export const NotificationPreferencesSchema = {
  type: 'object' as const,
  properties: {
    event_reminder: {
      type: 'boolean' as const,
      description: 'Enable event reminder notifications'
    },
    event_update: {
      type: 'boolean' as const,
      description: 'Enable event update notifications'
    },
    event_cancelled: {
      type: 'boolean' as const,
      description: 'Enable event cancellation notifications'
    },
    organization_invite: {
      type: 'boolean' as const,
      description: 'Enable organization invite notifications'
    },
    role_assigned: {
      type: 'boolean' as const,
      description: 'Enable role assignment notifications'
    },
    comment_reply: {
      type: 'boolean' as const,
      description: 'Enable comment reply notifications'
    },
    system: {
      type: 'boolean' as const,
      description: 'Enable system notifications'
    }
  },
  required: ['event_reminder', 'event_update', 'event_cancelled', 'organization_invite', 'role_assigned', 'comment_reply', 'system']
};

// Create Notification Request Schema
export const CreateNotificationRequestSchema = {
  type: 'object' as const,
  properties: {
    userId: {
      type: 'string' as const,
      description: 'User ID'
    },
    type: {
      type: 'string' as const,
      description: 'Notification type',
      enum: ['event_reminder', 'event_update', 'event_cancelled', 'organization_invite', 'role_assigned', 'comment_reply', 'system']
    },
    title: {
      type: 'string' as const,
      description: 'Notification title',
      minLength: 1,
      maxLength: 200
    },
    message: {
      type: 'string' as const,
      description: 'Notification message',
      minLength: 1,
      maxLength: 1000
    },
    data: {
      type: 'object' as const,
      description: 'Additional notification data',
      nullable: true
    }
  },
  required: ['userId', 'type', 'title', 'message']
};

// Update Notification Request Schema
export const UpdateNotificationRequestSchema = {
  type: 'object' as const,
  properties: {
    isRead: {
      type: 'boolean' as const,
      description: 'Whether the notification has been read'
    }
  }
};

// Mark Read Request Schema
export const MarkReadRequestSchema = {
  type: 'object' as const,
  properties: {
    notificationIds: {
      type: 'array' as const,
      items: {
        type: 'string' as const
      },
      description: 'Array of notification IDs to mark as read',
      minItems: 1
    }
  },
  required: ['notificationIds']
};

// Update Preferences Request Schema
export const UpdatePreferencesRequestSchema = {
  type: 'object' as const,
  properties: {
    event_reminder: {
      type: 'boolean' as const,
      description: 'Enable event reminder notifications'
    },
    event_update: {
      type: 'boolean' as const,
      description: 'Enable event update notifications'
    },
    event_cancelled: {
      type: 'boolean' as const,
      description: 'Enable event cancellation notifications'
    },
    organization_invite: {
      type: 'boolean' as const,
      description: 'Enable organization invite notifications'
    },
    role_assigned: {
      type: 'boolean' as const,
      description: 'Enable role assignment notifications'
    },
    comment_reply: {
      type: 'boolean' as const,
      description: 'Enable comment reply notifications'
    },
    system: {
      type: 'boolean' as const,
      description: 'Enable system notifications'
    }
  }
};

// Delete Notifications Request Schema
export const DeleteNotificationsRequestSchema = {
  type: 'object' as const,
  properties: {
    notificationIds: {
      type: 'array' as const,
      items: {
        type: 'string' as const
      },
      description: 'Array of notification IDs to delete',
      minItems: 1
    }
  },
  required: ['notificationIds']
};

// Notifications Response Schema
export const NotificationsResponseSchema = {
  type: 'object' as const,
  properties: {
    success: {
      type: 'boolean' as const,
      description: 'Success status'
    },
    data: {
      type: 'array' as const,
      items: {
        $ref: '#/components/schemas/Notification'
      },
      description: 'List of notifications'
    },
    pagination: {
      $ref: '#/components/schemas/Pagination'
    }
  },
  required: ['success', 'data', 'pagination']
};

// Notification Response Schema
export const NotificationResponseSchema = {
  type: 'object' as const,
  properties: {
    success: {
      type: 'boolean' as const,
      description: 'Success status'
    },
    data: {
      $ref: '#/components/schemas/Notification'
    }
  },
  required: ['success', 'data']
};

// Notification Stats Response Schema
export const NotificationStatsResponseSchema = {
  type: 'object' as const,
  properties: {
    success: {
      type: 'boolean' as const,
      description: 'Success status'
    },
    data: {
      $ref: '#/components/schemas/NotificationStats'
    }
  },
  required: ['success', 'data']
};

// Notification Preferences Response Schema
export const NotificationPreferencesResponseSchema = {
  type: 'object' as const,
  properties: {
    success: {
      type: 'boolean' as const,
      description: 'Success status'
    },
    data: {
      $ref: '#/components/schemas/NotificationPreferences'
    }
  },
  required: ['success', 'data']
};
