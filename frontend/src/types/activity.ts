export interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  entity_type: number;
  entity_id: string;
  metadata?: Record<string, any>;
}

export enum ActivityType {
  ORGANIZATION_JOINED = 'organization_joined',
  ORGANIZATION_CREATED = 'organization_created',
  EVENT_REGISTERED = 'event_registered',
  EVENT_CREATED = 'event_created',
  COMMENT_CREATED = 'comment_created',
  ORGANIZATION_RATED = 'organization_rated',
}

export interface ActivityResponse {
  success: boolean;
  data: ActivityItem[];
  total: number;
}
