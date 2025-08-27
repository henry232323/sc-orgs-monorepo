import {
  VERIFICATION_SENTINEL_PREFIX,
  VERIFICATION_CODE_LENGTH,
} from './constants';

export function isValidVerificationCode(code: string): boolean {
  if (!code || typeof code !== 'string') return false;

  const pattern = new RegExp(
    `^${VERIFICATION_SENTINEL_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[A-Za-z0-9]{${VERIFICATION_CODE_LENGTH}}$`
  );
  return pattern.test(code);
}

export function generateVerificationCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = VERIFICATION_SENTINEL_PREFIX;

  for (let i = 0; i < VERIFICATION_CODE_LENGTH; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
}

export function isValidRSIHandle(handle: string): boolean {
  if (!handle || typeof handle !== 'string') return false;

  // RSI handles are typically 3-20 characters, alphanumeric and some special chars
  const pattern = /^[a-zA-Z0-9_-]{3,20}$/;
  return pattern.test(handle);
}

export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
}

export function sanitizeString(input: string, maxLength: number): string {
  if (!input || typeof input !== 'string') return '';

  // Remove HTML tags and trim
  const sanitized = input.replace(/<[^>]*>/g, '').trim();

  // Limit length
  return sanitized.length > maxLength
    ? sanitized.substring(0, maxLength)
    : sanitized;
}

export function isValidUUID(uuid: string): boolean {
  if (!uuid || typeof uuid !== 'string') return false;

  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidPattern.test(uuid);
}
