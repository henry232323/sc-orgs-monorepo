import { NotificationEntityType } from '../types/notification';

export interface NotificationRoute {
  path: string;
  shouldOpenInNewTab?: boolean;
}

export interface NotificationDisplay {
  route?: NotificationRoute | null;
  iconType:
    | 'event'
    | 'organization'
    | 'comment'
    | 'security'
    | 'system'
    | 'default';
  colorScheme: 'blue' | 'green' | 'purple' | 'red' | 'gray';
}

export class NotificationRouter {
  /**
   * Get the route for a notification based on its entity type and ID
   */
  static getNotificationRoute(
    entityType: NotificationEntityType,
    entityId: string
  ): NotificationRoute | null {
    // Event-related notifications
    if (
      entityType >= NotificationEntityType.EVENT_CREATED &&
      entityType <= NotificationEntityType.EVENT_REMINDER
    ) {
      return {
        path: `/events/${entityId}`,
        shouldOpenInNewTab: false,
      };
    }

    // Organization-related notifications
    if (
      entityType >= NotificationEntityType.ORGANIZATION_CREATED &&
      entityType <= NotificationEntityType.ORGANIZATION_ROLE_CHANGED
    ) {
      return {
        path: `/organizations/${entityId}`,
        shouldOpenInNewTab: false,
      };
    }

    // Comment-related notifications
    if (
      entityType >= NotificationEntityType.COMMENT_CREATED &&
      entityType <= NotificationEntityType.COMMENT_VOTED
    ) {
      // For comments, we need to navigate to the parent entity (event or organization)
      // The entityId would be the comment ID, so we'd need to fetch the comment to get the parent
      // For now, return null and handle this case separately
      return null;
    }

    // User-related notifications
    if (
      entityType >= NotificationEntityType.USER_VERIFIED &&
      entityType <= NotificationEntityType.USER_PROFILE_UPDATED
    ) {
      return {
        path: `/profile`,
        shouldOpenInNewTab: false,
      };
    }

    // Security notifications
    if (
      entityType >= NotificationEntityType.SECURITY_LOGIN &&
      entityType <= NotificationEntityType.SECURITY_ACCOUNT_LOCKED
    ) {
      return {
        path: `/profile/security`,
        shouldOpenInNewTab: false,
      };
    }

    // System notifications (no specific route)
    if (
      entityType >= NotificationEntityType.SYSTEM_ANNOUNCEMENT &&
      entityType <= NotificationEntityType.SYSTEM_UPDATE
    ) {
      return null;
    }

    return null;
  }

  /**
   * Get display properties for a notification
   */
  static getNotificationDisplay(
    entityType: NotificationEntityType
  ): NotificationDisplay {
    const route = this.getNotificationRoute(entityType, ''); // entityId not needed for display props

    // Event notifications
    if (
      entityType >= NotificationEntityType.EVENT_CREATED &&
      entityType <= NotificationEntityType.EVENT_REMINDER
    ) {
      return {
        route: route,
        iconType: 'event',
        colorScheme: 'blue',
      };
    }

    // Organization notifications
    if (
      entityType >= NotificationEntityType.ORGANIZATION_CREATED &&
      entityType <= NotificationEntityType.ORGANIZATION_ROLE_CHANGED
    ) {
      return {
        route: route,
        iconType: 'organization',
        colorScheme: 'purple',
      };
    }

    // Comment notifications
    if (
      entityType >= NotificationEntityType.COMMENT_CREATED &&
      entityType <= NotificationEntityType.COMMENT_VOTED
    ) {
      return {
        route: route,
        iconType: 'comment',
        colorScheme: 'green',
      };
    }

    // User notifications
    if (
      entityType >= NotificationEntityType.USER_VERIFIED &&
      entityType <= NotificationEntityType.USER_PROFILE_UPDATED
    ) {
      return {
        route: route,
        iconType: 'default',
        colorScheme: 'gray',
      };
    }

    // Security notifications
    if (
      entityType >= NotificationEntityType.SECURITY_LOGIN &&
      entityType <= NotificationEntityType.SECURITY_ACCOUNT_LOCKED
    ) {
      return {
        route: route,
        iconType: 'security',
        colorScheme: 'red',
      };
    }

    // System notifications
    if (
      entityType >= NotificationEntityType.SYSTEM_ANNOUNCEMENT &&
      entityType <= NotificationEntityType.SYSTEM_UPDATE
    ) {
      return {
        route: route,
        iconType: 'system',
        colorScheme: 'gray',
      };
    }

    // Default fallback
    return {
      route: route || null,
      iconType: 'default',
      colorScheme: 'gray',
    };
  }

  /**
   * Check if a notification should be clickable
   */
  static isNotificationClickable(
    entityType: NotificationEntityType,
    entityId: string
  ): boolean {
    const route = this.getNotificationRoute(entityType, entityId);
    return route !== null;
  }

  /**
   * Get specific notification type information
   */
  static getNotificationTypeInfo(entityType: NotificationEntityType): {
    category: string;
    action: string;
    requiresEntityData: boolean;
  } {
    switch (entityType) {
      case NotificationEntityType.EVENT_CREATED:
        return {
          category: 'Event',
          action: 'Created',
          requiresEntityData: true,
        };
      case NotificationEntityType.EVENT_UPDATED:
        return {
          category: 'Event',
          action: 'Updated',
          requiresEntityData: true,
        };
      case NotificationEntityType.EVENT_DELETED:
        return {
          category: 'Event',
          action: 'Deleted',
          requiresEntityData: false,
        };
      case NotificationEntityType.EVENT_REGISTERED:
        return {
          category: 'Event',
          action: 'Registration',
          requiresEntityData: true,
        };
      case NotificationEntityType.EVENT_UNREGISTERED:
        return {
          category: 'Event',
          action: 'Unregistration',
          requiresEntityData: true,
        };
      case NotificationEntityType.EVENT_STARTING_SOON:
        return {
          category: 'Event',
          action: 'Starting Soon',
          requiresEntityData: true,
        };
      case NotificationEntityType.EVENT_REMINDER:
        return {
          category: 'Event',
          action: 'Reminder',
          requiresEntityData: true,
        };

      case NotificationEntityType.ORGANIZATION_CREATED:
        return {
          category: 'Organization',
          action: 'Created',
          requiresEntityData: true,
        };
      case NotificationEntityType.ORGANIZATION_UPDATED:
        return {
          category: 'Organization',
          action: 'Updated',
          requiresEntityData: true,
        };
      case NotificationEntityType.ORGANIZATION_DELETED:
        return {
          category: 'Organization',
          action: 'Deleted',
          requiresEntityData: false,
        };
      case NotificationEntityType.ORGANIZATION_JOINED:
        return {
          category: 'Organization',
          action: 'Joined',
          requiresEntityData: true,
        };
      case NotificationEntityType.ORGANIZATION_LEFT:
        return {
          category: 'Organization',
          action: 'Left',
          requiresEntityData: true,
        };
      case NotificationEntityType.ORGANIZATION_INVITED:
        return {
          category: 'Organization',
          action: 'Invitation',
          requiresEntityData: true,
        };
      case NotificationEntityType.ORGANIZATION_ROLE_CHANGED:
        return {
          category: 'Organization',
          action: 'Role Changed',
          requiresEntityData: true,
        };

      default:
        return {
          category: 'System',
          action: 'Notification',
          requiresEntityData: false,
        };
    }
  }
}
