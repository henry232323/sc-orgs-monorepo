import {
  BuildingOfficeIcon,
  CalendarIcon,
  ChatBubbleLeftIcon,
  StarIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { ActivityType } from '../types/activity';

/**
 * Get the appropriate icon component for an activity type
 */
export function getActivityIcon(activityType: string) {
  switch (activityType) {
    case ActivityType.ORGANIZATION_JOINED:
    case ActivityType.ORGANIZATION_CREATED:
      return BuildingOfficeIcon;
    case ActivityType.EVENT_REGISTERED:
    case ActivityType.EVENT_CREATED:
      return CalendarIcon;
    case ActivityType.COMMENT_CREATED:
      return ChatBubbleLeftIcon;
    case ActivityType.ORGANIZATION_RATED:
      return StarIcon;
    default:
      return UserGroupIcon;
  }
}

/**
 * Format a timestamp to relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const activityTime = new Date(timestamp);
  const diffInMs = now.getTime() - activityTime.getTime();
  
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  const diffInWeeks = Math.floor(diffInDays / 7);
  const diffInMonths = Math.floor(diffInDays / 30);

  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
  if (diffInDays < 7) return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
  if (diffInWeeks < 4) return `${diffInWeeks} week${diffInWeeks !== 1 ? 's' : ''} ago`;
  if (diffInMonths < 12) return `${diffInMonths} month${diffInMonths !== 1 ? 's' : ''} ago`;
  
  return activityTime.toLocaleDateString();
}

/**
 * Get the URL for an activity item based on its type and entity
 */
export function getActivityUrl(activityType: string, entityId: string, metadata?: Record<string, any>): string | null {
  switch (activityType) {
    case ActivityType.ORGANIZATION_JOINED:
    case ActivityType.ORGANIZATION_CREATED:
    case ActivityType.ORGANIZATION_RATED:
      return metadata?.rsi_org_id ? `/organizations/${metadata.rsi_org_id}` : null;
    case ActivityType.EVENT_REGISTERED:
    case ActivityType.EVENT_CREATED:
    case ActivityType.COMMENT_CREATED:
      return `/events/${entityId}`;
    default:
      return null;
  }
}
