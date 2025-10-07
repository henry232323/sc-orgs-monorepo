import {
  parseApiError,
  getUserFriendlyErrorMessage,
  getErrorSuggestions,
  isRecoverableError,
  shouldAutoRetry,
  getErrorSeverity,
  createErrorToast,
  logError,
  MARKDOWN_ERROR_CODES,
  MarkdownOperationError,
} from '../markdownErrorHandler';

import { vi } from 'vitest';

// Mock console.error for testing
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('markdownErrorHandler', () => {
  beforeEach(() => {
    mockConsoleError.mockClear();
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  describe('parseApiError', () => {
    it('should handle network errors', () => {
      const networkError = { message: 'Network Error' };
      const result = parseApiError(networkError);

      expect(result.code).toBe(MARKDOWN_ERROR_CODES.NETWORK_ERROR);
      expect(result.statusCode).toBe(0);
      expect(result.message).toContain('Network error');
      expect(result.suggestions).toContain('Check your internet connection');
    });

    it('should parse structured API error responses', () => {
      const apiError = {
        response: {
          status: 400,
          data: {
            success: false,
            error: 'Validation failed',
            code: 'MARKDOWN_VALIDATION_ERROR',
            details: {
              validation_errors: [
                { code: 'INVALID_SYNTAX', message: 'Invalid markdown syntax' },
              ],
              validation_warnings: [
                { code: 'LONG_LINE', message: 'Line too long' },
              ],
            },
            suggestions: ['Check your markdown syntax'],
          },
        },
      };

      const result = parseApiError(apiError);

      expect(result.code).toBe('MARKDOWN_VALIDATION_ERROR');
      expect(result.statusCode).toBe(400);
      expect(result.message).toBe('Validation failed');
      expect(result.suggestions).toEqual(['Check your markdown syntax']);
      expect(result.validationErrors).toHaveLength(1);
      expect(result.validationWarnings).toHaveLength(1);
      expect(result.validationErrors?.[0]?.code).toBe('INVALID_SYNTAX');
      expect(result.validationWarnings?.[0]?.code).toBe('LONG_LINE');
    });

    it('should handle generic HTTP errors', () => {
      const httpError = {
        response: {
          status: 404,
          data: 'Not Found',
        },
      };

      const result = parseApiError(httpError);

      expect(result.statusCode).toBe(404);
      expect(result.message).toContain('not found');
      expect(result.suggestions).toContain('Check that the URL is correct');
    });
  });

  describe('getUserFriendlyErrorMessage', () => {
    it('should return user-friendly messages for known error codes', () => {
      const testCases = [
        {
          code: MARKDOWN_ERROR_CODES.VALIDATION_ERROR,
          expected: 'The document contains formatting errors. Please check your markdown syntax and try again.',
        },
        {
          code: MARKDOWN_ERROR_CODES.CONTENT_TOO_LARGE,
          expected: 'The document is too large. Please reduce the content size and try again.',
        },
        {
          code: MARKDOWN_ERROR_CODES.SECURITY_ERROR,
          expected: 'The document contains potentially unsafe content that cannot be processed.',
        },
        {
          code: MARKDOWN_ERROR_CODES.NETWORK_ERROR,
          expected: 'Network connection error. Please check your internet connection.',
        },
      ];

      testCases.forEach(({ code, expected }) => {
        const error = new Error('Technical message') as MarkdownOperationError;
        error.code = code;
        
        const result = getUserFriendlyErrorMessage(error);
        expect(result).toBe(expected);
      });
    });

    it('should return original message for unknown error codes', () => {
      const error = new Error('Custom error message') as MarkdownOperationError;
      error.code = 'UNKNOWN_ERROR';
      
      const result = getUserFriendlyErrorMessage(error);
      expect(result).toBe('Custom error message');
    });

    it('should handle errors without codes', () => {
      const error = new Error('Generic error') as MarkdownOperationError;
      
      const result = getUserFriendlyErrorMessage(error);
      expect(result).toBe('Generic error');
    });
  });

  describe('getErrorSuggestions', () => {
    it('should return suggestions from error object if available', () => {
      const error = new Error('Test error') as MarkdownOperationError;
      error.suggestions = ['Custom suggestion 1', 'Custom suggestion 2'];
      
      const result = getErrorSuggestions(error);
      expect(result).toEqual(['Custom suggestion 1', 'Custom suggestion 2']);
    });

    it('should return appropriate suggestions for different error codes', () => {
      const testCases = [
        {
          code: MARKDOWN_ERROR_CODES.VALIDATION_ERROR,
          expectedSuggestions: [
            'Check your markdown syntax for errors',
            'Ensure all links and images are properly formatted',
          ],
        },
        {
          code: MARKDOWN_ERROR_CODES.CONTENT_TOO_LARGE,
          expectedSuggestions: [
            'Split the document into smaller sections',
            'Remove unnecessary images or content',
          ],
        },
        {
          code: MARKDOWN_ERROR_CODES.NETWORK_ERROR,
          expectedSuggestions: [
            'Check your internet connection',
            'Try refreshing the page',
          ],
        },
      ];

      testCases.forEach(({ code, expectedSuggestions }) => {
        const error = new Error('Test error') as MarkdownOperationError;
        error.code = code;
        
        const result = getErrorSuggestions(error);
        expectedSuggestions.forEach(suggestion => {
          expect(result).toContain(suggestion);
        });
      });
    });
  });

  describe('isRecoverableError', () => {
    it('should identify recoverable errors', () => {
      const recoverableErrors = [
        MARKDOWN_ERROR_CODES.VALIDATION_ERROR,
        MARKDOWN_ERROR_CODES.CONTENT_TOO_LARGE,
        MARKDOWN_ERROR_CODES.NETWORK_ERROR,
        MARKDOWN_ERROR_CODES.PROCESSING_TIMEOUT,
      ];

      recoverableErrors.forEach(code => {
        const error = new Error('Test error') as MarkdownOperationError;
        error.code = code;
        
        expect(isRecoverableError(error)).toBe(true);
      });
    });

    it('should identify non-recoverable errors', () => {
      const nonRecoverableErrors = [
        MARKDOWN_ERROR_CODES.ACCESS_DENIED,
        MARKDOWN_ERROR_CODES.PERMISSION_DENIED,
        MARKDOWN_ERROR_CODES.AUTHENTICATION_REQUIRED,
        MARKDOWN_ERROR_CODES.DOCUMENT_NOT_FOUND,
      ];

      nonRecoverableErrors.forEach(code => {
        const error = new Error('Test error') as MarkdownOperationError;
        error.code = code;
        
        expect(isRecoverableError(error)).toBe(false);
      });
    });

    it('should assume generic errors are recoverable', () => {
      const error = new Error('Generic error') as MarkdownOperationError;
      
      expect(isRecoverableError(error)).toBe(true);
    });
  });

  describe('shouldAutoRetry', () => {
    it('should identify errors that should trigger auto-retry', () => {
      const autoRetryErrors = [
        MARKDOWN_ERROR_CODES.NETWORK_ERROR,
        MARKDOWN_ERROR_CODES.PROCESSING_TIMEOUT,
      ];

      autoRetryErrors.forEach(code => {
        const error = new Error('Test error') as MarkdownOperationError;
        error.code = code;
        
        expect(shouldAutoRetry(error)).toBe(true);
      });
    });

    it('should not auto-retry other errors', () => {
      const noAutoRetryErrors = [
        MARKDOWN_ERROR_CODES.VALIDATION_ERROR,
        MARKDOWN_ERROR_CODES.ACCESS_DENIED,
        MARKDOWN_ERROR_CODES.CONTENT_TOO_LARGE,
      ];

      noAutoRetryErrors.forEach(code => {
        const error = new Error('Test error') as MarkdownOperationError;
        error.code = code;
        
        expect(shouldAutoRetry(error)).toBe(false);
      });
    });
  });

  describe('getErrorSeverity', () => {
    it('should return correct severity levels', () => {
      const testCases = [
        { code: MARKDOWN_ERROR_CODES.SANITIZATION_ERROR, expected: 'warning' },
        { code: MARKDOWN_ERROR_CODES.VERSION_CONFLICT, expected: 'info' },
        { code: MARKDOWN_ERROR_CODES.VALIDATION_ERROR, expected: 'error' },
        { code: MARKDOWN_ERROR_CODES.ACCESS_DENIED, expected: 'error' },
      ];

      testCases.forEach(({ code, expected }) => {
        const error = new Error('Test error') as MarkdownOperationError;
        error.code = code;
        
        expect(getErrorSeverity(error)).toBe(expected);
      });
    });

    it('should default to error severity for unknown codes', () => {
      const error = new Error('Test error') as MarkdownOperationError;
      error.code = 'UNKNOWN_ERROR';
      
      expect(getErrorSeverity(error)).toBe('error');
    });
  });

  describe('createErrorToast', () => {
    it('should create appropriate toast notifications', () => {
      const testCases = [
        {
          code: MARKDOWN_ERROR_CODES.VALIDATION_ERROR,
          expectedTitle: 'Error',
          expectedType: 'error',
          expectedDuration: 8000,
        },
        {
          code: MARKDOWN_ERROR_CODES.SANITIZATION_ERROR,
          expectedTitle: 'Warning',
          expectedType: 'warning',
          expectedDuration: 5000,
        },
        {
          code: MARKDOWN_ERROR_CODES.VERSION_CONFLICT,
          expectedTitle: 'Notice',
          expectedType: 'info',
          expectedDuration: 5000,
        },
      ];

      testCases.forEach(({ code, expectedTitle, expectedType, expectedDuration }) => {
        const error = new Error('Test error') as MarkdownOperationError;
        error.code = code;
        
        const toast = createErrorToast(error);
        
        expect(toast.title).toBe(expectedTitle);
        expect(toast.type).toBe(expectedType);
        expect(toast.duration).toBe(expectedDuration);
        expect(toast.message).toBeTruthy();
      });
    });
  });

  describe('logError', () => {
    it('should log error with context', () => {
      const error = new Error('Test error') as MarkdownOperationError;
      error.code = MARKDOWN_ERROR_CODES.VALIDATION_ERROR;
      error.statusCode = 400;
      
      const context = { documentId: 'doc123', operation: 'create' };
      
      logError(error, context);
      
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Markdown operation error:',
        expect.objectContaining({
          message: 'Test error',
          code: MARKDOWN_ERROR_CODES.VALIDATION_ERROR,
          statusCode: 400,
          context,
          timestamp: expect.any(String),
          userAgent: expect.any(String),
          url: expect.any(String),
        })
      );
    });

    it('should handle errors without additional properties', () => {
      const error = new Error('Simple error') as MarkdownOperationError;
      
      logError(error);
      
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Markdown operation error:',
        expect.objectContaining({
          message: 'Simple error',
          code: undefined,
          statusCode: undefined,
          context: undefined,
        })
      );
    });
  });
});