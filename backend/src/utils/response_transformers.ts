/**
 * Utility functions for transforming database responses to API responses
 * Helps eliminate duplication and ensure consistent data structure
 */

/**
 * Transforms a review with user data to remove duplicate fields
 * @param review - Review object with top-level user fields and user object
 * @returns Review object with user data only in the user object
 */
export function transformReviewWithUser(review: any): any {
  const { username, avatar_url, ...reviewWithoutUserData } = review;
  return {
    ...reviewWithoutUserData,
    user: {
      username: review.is_anonymous ? 'Anonymous' : username,
      avatar_url: review.is_anonymous ? undefined : avatar_url,
    },
  };
}

/**
 * Transforms an array of reviews with user data
 * @param reviews - Array of review objects with top-level user fields
 * @returns Array of transformed review objects
 */
export function transformReviewsWithUsers(reviews: any[]): any[] {
  return reviews.map(transformReviewWithUser);
}

/**
 * Transforms an event object to remove internal organization_id and add RSI org ID
 * @param event - Event object with internal organization_id
 * @param organization - Organization object with rsi_org_id
 * @returns Event object without internal organization_id, with organization_spectrum_id
 */
export function transformEventWithOrganization(event: any, organization?: any): any {
  const { organization_id, ...eventWithoutInternalId } = event;
  return {
    ...eventWithoutInternalId,
    organization_spectrum_id: organization?.rsi_org_id || null,
  };
}

/**
 * Transforms user data to remove sensitive fields
 * @param user - User object with potentially sensitive fields
 * @returns User object with sensitive fields removed
 */
export function transformUserForPublic(user: any): any {
  const { password_hash, email, ...publicUserData } = user;
  return publicUserData;
}

/**
 * Transforms an array of users to remove sensitive fields
 * @param users - Array of user objects
 * @returns Array of transformed user objects
 */
export function transformUsersForPublic(users: any[]): any[] {
  return users.map(transformUserForPublic);
}

/**
 * Generic function to remove specified fields from an object
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
 * Generic function to transform an array of objects by removing specified fields
 * @param objects - Array of objects to transform
 * @param fieldsToRemove - Array of field names to remove
 * @returns Array of transformed objects
 */
export function removeFieldsFromArray<T extends Record<string, any>>(
  objects: T[],
  fieldsToRemove: (keyof T)[]
): Array<Omit<T, keyof T>> {
  return objects.map(obj => removeFields(obj, fieldsToRemove));
}

/**
 * Transforms pagination response with data transformation
 * @param data - Array of items to transform
 * @param total - Total count
 * @param transformer - Function to transform each item
 * @returns Paginated response with transformed data
 */
export function transformPaginatedResponse<T, R>(
  data: T[],
  total: number,
  transformer: (item: T) => R
): { data: R[]; total: number } {
  return {
    data: data.map(transformer),
    total,
  };
}

/**
 * Standard fields that should be removed from public responses
 */
export const SENSITIVE_USER_FIELDS = ['password_hash', 'email', 'internal_id'] as const;
export const INTERNAL_ORG_FIELD = ['organization_id'] as const;
