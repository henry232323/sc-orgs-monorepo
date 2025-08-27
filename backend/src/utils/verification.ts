import crypto from 'crypto';
import logger from '../config/logger';

const VERIFICATION_SECRET =
  process.env.VERIFICATION_SECRET ||
  'default-verification-secret-change-in-production';

/**
 * Generates a user-specific verification code based on the user's ID
 * This code will be the same for all organizations owned by the same user
 */
export function generateUserVerificationCode(userId: string): string {
  try {
    // Create HMAC using user ID and secret
    const hmac = crypto.createHmac('sha256', VERIFICATION_SECRET);
    hmac.update(userId);

    // Take first 8 characters of the hex digest for readability
    const digest = hmac.digest('hex');
    const shortCode = digest.substring(0, 8).toUpperCase();

    // Format as [SCORGS:XXXXXXXX]
    return `[SCORGS:${shortCode}]`;
  } catch (error) {
    logger.error('Failed to generate verification code', { error, userId });
    throw new Error('Failed to generate verification code');
  }
}

/**
 * Verifies if a verification code matches the expected code for a user
 */
export function verifyUserVerificationCode(
  userId: string,
  verificationCode: string
): boolean {
  try {
    const expectedCode = generateUserVerificationCode(userId);
    const isValid = verificationCode.trim() === expectedCode;

    logger.debug('Verification code check', {
      userId,
      providedCode: verificationCode,
      expectedCode,
      isValid,
    });

    return isValid;
  } catch (error) {
    logger.error('Failed to verify verification code', {
      error,
      userId,
      verificationCode,
    });
    return false;
  }
}

/**
 * Extracts the verification code from text content
 */
export function extractVerificationCode(content: string): string | null {
  // Look for the pattern SCORGS:XXXXXXXX (with or without brackets/escaping)
  const match = content.match(/SCORGS:([A-F0-9]{8})/i);
  if (match) {
    // Return the full code with brackets for consistency
    return `[${match[0]}]`;
  }
  return null;
}

/**
 * Extracts the verification code that matches the expected code from text content
 */
export function extractMatchingVerificationCode(
  content: string,
  expectedCode: string
): string | null {
  // Search for the code without brackets (handles escaped content)
  const codeWithoutBrackets = expectedCode.replace(/[\[\]]/g, '');
  if (content.includes(codeWithoutBrackets)) {
    return expectedCode;
  }
  return null;
}
