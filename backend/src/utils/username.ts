import crypto from 'crypto';

/**
 * Generates a unique, deterministic username from a user ID
 * Format: user_XXXXXXXX (where X is a hex character)
 * This ensures usernames are unique, not guessable, and don't reveal Discord usernames
 *
 * @deprecated Use generateTemporaryRsiHandle instead
 */
export function generateUsernameFromId(userId: string): string {
  return generateTemporaryRsiHandle(userId);
}

/**
 * Generates a temporary RSI handle for unverified users
 * Format: user_XXXXXXXX (where X is a hex character)
 * This will be used as the rsi_handle until the user verifies their actual RSI account
 */
export function generateTemporaryRsiHandle(userId: string): string {
  try {
    // Create a hash of the user ID for a shorter, deterministic result
    const hash = crypto.createHash('sha256').update(userId).digest('hex');

    // Take first 8 characters for readability while maintaining uniqueness
    const shortHash = hash.substring(0, 8);

    // Format as user_XXXXXXXX
    return `user_${shortHash}`;
  } catch (error) {
    // Fallback to a simple format if hashing fails
    const fallback = userId.replace(/-/g, '').substring(0, 8);
    return `user_${fallback}`;
  }
}

/**
 * Checks if an RSI handle is a temporary generated handle (vs a real RSI handle)
 */
export function isTemporaryRsiHandle(rsiHandle: string): boolean {
  return /^user_[a-f0-9]{8}$/.test(rsiHandle);
}

/**
 * Checks if a username is a generated username (vs an RSI handle)
 * @deprecated Use isTemporaryRsiHandle instead
 */
export function isGeneratedUsername(username: string): boolean {
  return isTemporaryRsiHandle(username);
}

/**
 * Validates that an RSI handle is suitable for display
 * Temporary handles are always valid, real RSI handles should be validated separately
 */
export function isValidRsiHandle(rsiHandle: string): boolean {
  if (isTemporaryRsiHandle(rsiHandle)) {
    return true;
  }

  // For real RSI handles, basic validation (more comprehensive validation should be done elsewhere)
  return (
    rsiHandle.length >= 3 &&
    rsiHandle.length <= 20 &&
    /^[a-zA-Z0-9_-]+$/.test(rsiHandle)
  );
}

/**
 * Validates that a username is suitable for display
 * @deprecated Use isValidRsiHandle instead
 */
export function isValidUsername(username: string): boolean {
  return isValidRsiHandle(username);
}
