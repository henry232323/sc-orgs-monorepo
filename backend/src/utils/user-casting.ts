import { Request } from 'express';
import { User } from '../types/user';

/**
 * Safely cast req.user to our custom User type
 * This is needed due to Express/Passport type conflicts
 */
export function getUserFromRequest(req: Request): User | null {
  return req.user as User | null;
}

/**
 * Get user ID from request, throwing error if not authenticated
 */
export function getUserIdFromRequest(req: Request): string {
  const user = getUserFromRequest(req);
  if (!user?.id) {
    throw new Error('Authentication required');
  }
  return user.id;
}

/**
 * Get user from request, throwing error if not authenticated
 */
export function requireUserFromRequest(req: Request): User {
  const user = getUserFromRequest(req);
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}