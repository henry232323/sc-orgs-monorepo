/**
 * Frontend response transformers for consistent data handling
 * Helps eliminate duplication and ensure consistent data structure across the app
 */

import type { Event, EventReviewWithUser, Organization, User } from '../types';

/**
 * Transforms event data to handle organization information consistently
 * @param event - Event object from API
 * @returns Transformed event with consistent organization data
 */
export function transformEventResponse(event: any): Event {
  const { organization_id, organization_name, ...eventWithoutInternalFields } = event;
  
  return {
    ...eventWithoutInternalFields,
    // organization_spectrum_id is already provided by backend
    // Remove any internal organization fields that might have leaked through
  };
}

/**
 * Transforms an array of events
 * @param events - Array of event objects from API
 * @returns Array of transformed events
 */
export function transformEventsResponse(events: any[]): Event[] {
  return events.map(transformEventResponse);
}

/**
 * Transforms event review data to ensure consistent structure
 * @param review - Review object from API
 * @returns Transformed review with consistent user data
 */
export function transformEventReviewResponse(review: any): EventReviewWithUser {
  return {
    ...review,
    // Ensure user data is consistently structured
    user: {
      username: review.user?.username || 'Unknown',
      avatar_url: review.user?.avatar_url,
    },
  };
}

/**
 * Transforms an array of event reviews
 * @param reviews - Array of review objects from API
 * @returns Array of transformed reviews
 */
export function transformEventReviewsResponse(reviews: any[]): EventReviewWithUser[] {
  return reviews.map(transformEventReviewResponse);
}

/**
 * Transforms organization data to remove internal fields
 * @param organization - Organization object from API
 * @returns Transformed organization
 */
export function transformOrganizationResponse(organization: any): Organization {
  const { internal_id, ...organizationWithoutInternal } = organization;
  return organizationWithoutInternal;
}

/**
 * Transforms an array of organizations
 * @param organizations - Array of organization objects from API
 * @returns Array of transformed organizations
 */
export function transformOrganizationsResponse(organizations: any[]): Organization[] {
  return organizations.map(transformOrganizationResponse);
}

/**
 * Transforms user data to remove sensitive fields
 * @param user - User object from API
 * @returns Transformed user without sensitive data
 */
export function transformUserResponse(user: any): User {
  const { password_hash, email, internal_id, ...userWithoutSensitive } = user;
  return userWithoutSensitive;
}

/**
 * Transforms an array of users
 * @param users - Array of user objects from API
 * @returns Array of transformed users
 */
export function transformUsersResponse(users: any[]): User[] {
  return users.map(transformUserResponse);
}

/**
 * Transforms paginated response with data transformation
 * @param response - Paginated response object
 * @param dataTransformer - Function to transform each data item
 * @returns Transformed paginated response
 */
export function transformPaginatedResponse<T, R>(
  response: { data: T[]; pagination?: any; [key: string]: any },
  dataTransformer: (item: T) => R
): { data: R[]; pagination?: any; [key: string]: any } {
  return {
    ...response,
    data: response.data.map(dataTransformer),
  };
}

/**
 * Standard response transformer for API success responses
 * @param response - API response with success/data structure
 * @param transformer - Optional transformer function for data
 * @returns Transformed response data
 */
export function transformApiResponse<T, R = T>(
  response: { success: boolean; data: T },
  transformer?: (data: T) => R
): R {
  if (transformer) {
    return transformer(response.data);
  }
  return response.data as unknown as R;
}

/**
 * Transforms notification data to ensure consistent structure
 * @param notification - Notification object from API
 * @returns Transformed notification
 */
export function transformNotificationResponse(notification: any): any {
  return {
    ...notification,
    // Ensure consistent timestamp handling
    created_at: notification.created_at ? new Date(notification.created_at).toISOString() : notification.created_at,
    // Ensure metadata is properly structured
    metadata: notification.metadata || {},
  };
}

/**
 * Transforms an array of notifications
 * @param notifications - Array of notification objects from API
 * @returns Array of transformed notifications
 */
export function transformNotificationsResponse(notifications: any[]): any[] {
  return notifications.map(transformNotificationResponse);
}

/**
 * Generic field remover utility
 * @param obj - Object to transform
 * @param fieldsToRemove - Array of field names to remove
 * @returns Object with specified fields removed
 */
export function removeFields<T extends Record<string, any>>(
  obj: T,
  fieldsToRemove: (keyof T)[]
): Omit<T, keyof T> {
  const result = { ...obj };
  fieldsToRemove.forEach(field => {
    delete result[field];
  });
  return result;
}

/**
 * Transforms comment data to ensure consistent structure
 * @param comment - Comment object from API
 * @returns Transformed comment
 */
export function transformCommentResponse(comment: any): any {
  return {
    ...comment,
    // Ensure user data is consistently structured
    user: comment.user ? {
      username: comment.user.username || 'Unknown',
      avatar_url: comment.user.avatar_url,
    } : undefined,
  };
}

/**
 * Transforms an array of comments
 * @param comments - Array of comment objects from API
 * @returns Array of transformed comments
 */
export function transformCommentsResponse(comments: any[]): any[] {
  return comments.map(transformCommentResponse);
}
