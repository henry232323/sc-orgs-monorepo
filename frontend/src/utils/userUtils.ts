/**
 * Utility functions for user display and RSI handle management
 */

/**
 * Checks if an RSI handle is a temporary generated handle (vs a real RSI handle)
 */
export function isTemporaryRsiHandle(rsiHandle: string): boolean {
  return /^user_[a-f0-9]{8}$/.test(rsiHandle);
}

/**
 * Gets the display name for a user, with verification status indication
 */
export function getUserDisplayName(user: {
  rsi_handle: string;
  is_rsi_verified: boolean;
}): string {
  return user.rsi_handle;
}

/**
 * Gets verification status text for display
 */
export function getVerificationStatusText(user: {
  rsi_handle: string;
  is_rsi_verified: boolean;
}): string | null {
  if (isTemporaryRsiHandle(user.rsi_handle)) {
    return 'Unverified';
  }
  return null;
}

/**
 * Checks if a user should show verification indicators
 */
export function shouldShowVerificationIndicator(user: {
  rsi_handle: string;
  is_rsi_verified: boolean;
}): boolean {
  return isTemporaryRsiHandle(user.rsi_handle) || !user.is_rsi_verified;
}
