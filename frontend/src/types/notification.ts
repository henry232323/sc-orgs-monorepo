// Entity types for notifications - following the backend approach
export enum NotificationEntityType {
  // Organization related notifications
  ORGANIZATION_CREATED = 1,
  ORGANIZATION_UPDATED = 2,
  ORGANIZATION_DELETED = 3,
  ORGANIZATION_JOINED = 4,
  ORGANIZATION_LEFT = 5,
  ORGANIZATION_INVITED = 6,
  ORGANIZATION_ROLE_CHANGED = 7,

  // Event related notifications
  EVENT_CREATED = 10,
  EVENT_UPDATED = 11,
  EVENT_DELETED = 12,
  EVENT_REGISTERED = 13,
  EVENT_UNREGISTERED = 14,
  EVENT_STARTING_SOON = 15,
  EVENT_REMINDER = 16,

  // Comment related notifications
  COMMENT_CREATED = 20,
  COMMENT_UPDATED = 21,
  COMMENT_DELETED = 22,
  COMMENT_REPLIED = 23,
  COMMENT_VOTED = 24,

  // User related notifications
  USER_VERIFIED = 30,
  USER_PROFILE_UPDATED = 31,

  // System notifications
  SYSTEM_ANNOUNCEMENT = 40,
  SYSTEM_MAINTENANCE = 41,
  SYSTEM_UPDATE = 42,

  // Security notifications
  SECURITY_LOGIN = 50,
  SECURITY_PASSWORD_CHANGED = 51,
  SECURITY_ACCOUNT_LOCKED = 52,
}

// Core notification database entities
export interface NotificationObject {
  id: string;
  entity_type: NotificationEntityType;
  entity_id: string;
  created_on: string;
  status: number; // 1 = active, 0 = inactive
  title?: string;
  message?: string;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  notification_object_id: string;
  notifier_id: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
  updated_at: string;
}

// Extended notification with related data
export interface NotificationWithDetails extends Notification {
  notification_object: NotificationObject;
  actor?: {
    id: string;
    rsi_handle: string;
    discord_avatar?: string;
  };
  entity_data?: Record<string, any>;
  message?: string;
  title?: string;
}

// API request/response types
export interface CreateNotificationObjectData {
  entity_type: NotificationEntityType;
  entity_id: string;
  actor_id: string;
  notifier_ids: string[];
}

export interface CreateNotificationRequest {
  notification_object_id: string;
  notifier_id: string;
}

export interface UpdateNotificationRequest {
  is_read?: boolean;
  read_at?: string;
}

export interface NotificationResponse {
  id: string;
  notification_object_id: string;
  notifier_id: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
  updated_at: string;
  notification_object: NotificationObject;
  actor?: {
    id: string;
    rsi_handle: string;
    discord_avatar?: string;
  };
}

export interface NotificationListResponse {
  notifications: NotificationWithDetails[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
  unread_count: number;
}

export interface NotificationPreferences {
  email_notifications: boolean;
  push_notifications: boolean;
  organization_updates: boolean;
  event_reminders: boolean;
  security_alerts: boolean;
  marketing: boolean;
}

// Notification statistics
export interface NotificationStats {
  total_notifications: number;
  unread_notifications: number;
  notifications_by_type: Record<NotificationEntityType, number>;
  recent_activity: {
    date: string;
    count: number;
  }[];
}
