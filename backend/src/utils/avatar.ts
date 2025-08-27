import { User } from '../types/user';

/**
 * Get the avatar URL for a user
 * @param user - The user object
 * @returns The avatar URL or null if no avatar is available
 */
export function getUserAvatarUrl(user: User): string | null {
  return user.avatar_url || null;
}

/**
 * Check if an avatar URL is valid
 * @param url - The avatar URL to check
 * @returns true if the URL appears valid
 */
export function isValidAvatarUrl(url: string | null | undefined): boolean {
  if (!url) return false;

  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
