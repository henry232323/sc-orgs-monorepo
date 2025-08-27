import { describe, it, expect } from '@jest/globals';
import {
  isValidVerificationCode,
  generateVerificationCode,
  isValidRSIHandle,
  isValidEmail,
  sanitizeString,
  isValidUUID,
} from '../validation';

describe('Validation Utils', () => {
  describe('isValidVerificationCode', () => {
    it('should validate correct verification codes', () => {
      const validCode = 'SCORGS:ABC123DEF456';
      expect(isValidVerificationCode(validCode)).toBe(true);
    });

    it('should reject invalid verification codes', () => {
      const invalidCodes = [
        'SCORGS:ABC123', // Too short
        'scorgs:ABC123DEF456', // Wrong case
        'SCORGS-ABC123DEF456', // Wrong separator
        'ABC123DEF456', // Missing prefix
        '', // Empty string
      ];

      invalidCodes.forEach(code => {
        expect(isValidVerificationCode(code)).toBe(false);
      });
    });
  });

  describe('generateVerificationCode', () => {
    it('should generate valid verification codes', () => {
      const code = generateVerificationCode();
      expect(isValidVerificationCode(code)).toBe(true);
      expect(code).toMatch(/^SCORGS:[A-Z0-9]{12}$/);
    });

    it('should generate unique codes', () => {
      const code1 = generateVerificationCode();
      const code2 = generateVerificationCode();
      expect(code1).not.toBe(code2);
    });
  });

  describe('isValidRSIHandle', () => {
    it('should validate correct RSI handles', () => {
      const validHandles = ['Player123', 'user_name', 'test-user', 'abc123'];
      validHandles.forEach(handle => {
        expect(isValidRSIHandle(handle)).toBe(true);
      });
    });

    it('should reject invalid RSI handles', () => {
      const invalidHandles = [
        'ab',
        'very-long-handle-that-exceeds-limit',
        'user@name',
        'user name',
      ];
      invalidHandles.forEach(handle => {
        expect(isValidRSIHandle(handle)).toBe(false);
      });
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct emails', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
      ];
      validEmails.forEach(email => {
        expect(isValidEmail(email)).toBe(true);
      });
    });

    it('should reject invalid emails', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user@.com',
      ];
      invalidEmails.forEach(email => {
        expect(isValidEmail(email)).toBe(false);
      });
    });
  });

  describe('sanitizeString', () => {
    it('should remove HTML tags', () => {
      const input = '<p>Hello <b>World</b></p>';
      const result = sanitizeString(input, 100);
      expect(result).toBe('Hello World');
    });

    it('should limit string length', () => {
      const input = 'This is a very long string that should be truncated';
      const result = sanitizeString(input, 20);
      expect(result.length).toBeLessThanOrEqual(20);
    });

    it('should handle empty input', () => {
      const result = sanitizeString('', 100);
      expect(result).toBe('');
    });
  });

  describe('isValidUUID', () => {
    it('should validate correct UUIDs', () => {
      const validUUIDs = [
        '123e4567-e89b-12d3-a456-426614174000',
        '550e8400-e29b-41d4-a716-446655440000',
      ];
      validUUIDs.forEach(uuid => {
        expect(isValidUUID(uuid)).toBe(true);
      });
    });

    it('should reject invalid UUIDs', () => {
      const invalidUUIDs = [
        'not-a-uuid',
        '123e4567-e89b-12d3-a456-42661417400', // Too short
        '123e4567-e89b-12d3-a456-4266141740000', // Too long
        '123e4567-e89b-12d3-a456-42661417400g', // Invalid character
      ];
      invalidUUIDs.forEach(uuid => {
        expect(isValidUUID(uuid)).toBe(false);
      });
    });
  });
});
