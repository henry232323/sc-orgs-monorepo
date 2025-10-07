import { Request, Response, NextFunction } from 'express';
import { 
  MarkdownValidationError,
  MarkdownSanitizationError,
  MarkdownRenderingError,
  MarkdownSecurityError,
  MarkdownContentTooLargeError,
  MarkdownProcessingTimeoutError,
  DocumentNotFoundError,
  DocumentAccessDeniedError,
  DocumentVersionConflictError,
  createUserFriendlyErrorMessage,
  isMarkdownError,
  MARKDOWN_ERROR_CODES
} from '../errors/markdown_errors';
import { validateMarkdownContent } from '../middleware/markdown_validation';
import { markdownErrorHandler } from '../middleware/markdown_error_handler';
import { MarkdownProcessingService } from '../services/markdown_processing_service';

// Mock logger
jest.mock('../config/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
}));

describe('Markdown Error Handling', () => {
  describe('Custom Error Types', () => {
    it('should create MarkdownValidationError with proper properties', () => {
      const errors = ['Invalid syntax', 'Missing closing bracket'];
      const warnings = ['Long line detected'];
      const error = new MarkdownValidationError(
        'Validation failed',
        errors,
        warnings,
        { field: 'content' }
      );

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(MarkdownValidationError);
      expect(error.name).toBe('MarkdownValidationError');
      expect(error.code).toBe('MARKDOWN_VALIDATION_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.errors).toEqual(errors);
      expect(error.warnings).toEqual(warnings);
      expect(error.details).toEqual({ field: 'content' });
    });

    it('should create MarkdownContentTooLargeError with size information', () => {
      const error = new MarkdownContentTooLargeError(2000000, 1000000);

      expect(error).toBeInstanceOf(MarkdownContentTooLargeError);
      expect(error.code).toBe('MARKDOWN_CONTENT_TOO_LARGE');
      expect(error.statusCode).toBe(413);
      expect(error.contentLength).toBe(2000000);
      expect(error.maxLength).toBe(1000000);
      expect(error.message).toContain('2000000');
      expect(error.message).toContain('1000000');
    });

    it('should create MarkdownSecurityError with violations', () => {
      const violations = ['XSS attempt detected', 'Dangerous script tag'];
      const content = '<script>alert("xss")</script>';
      const error = new MarkdownSecurityError(
        'Security violations found',
        violations,
        content
      );

      expect(error).toBeInstanceOf(MarkdownSecurityError);
      expect(error.code).toBe('MARKDOWN_SECURITY_ERROR');
      expect(error.statusCode).toBe(403);
      expect(error.securityViolations).toEqual(violations);
      expect(error.content).toBe(content);
    });

    it('should create DocumentVersionConflictError with version info', () => {
      const error = new DocumentVersionConflictError('doc123', 5, 3);

      expect(error).toBeInstanceOf(DocumentVersionConflictError);
      expect(error.code).toBe('DOCUMENT_VERSION_CONFLICT');
      expect(error.statusCode).toBe(409);
      expect(error.documentId).toBe('doc123');
      expect(error.currentVersion).toBe(5);
      expect(error.requestedVersion).toBe(3);
    });
  });

  describe('Error Type Guards', () => {
    it('should correctly identify markdown errors', () => {
      const markdownError = new MarkdownValidationError('test', [], []);
      const genericError = new Error('generic error');

      expect(isMarkdownError(markdownError)).toBe(true);
      expect(isMarkdownError(genericError)).toBe(false);
    });
  });

  describe('User-Friendly Error Messages', () => {
    it('should provide user-friendly messages for validation errors', () => {
      const error = new MarkdownValidationError('Technical validation error', [], []);
      const message = createUserFriendlyErrorMessage(error);

      expect(message).toBe('The document content contains formatting errors. Please check your markdown syntax and try again.');
      expect(message).not.toContain('Technical validation error');
    });

    it('should provide user-friendly messages for content too large errors', () => {
      const error = new MarkdownContentTooLargeError(2000000, 1000000);
      const message = createUserFriendlyErrorMessage(error);

      expect(message).toBe('The document is too large. Please reduce the content size and try again.');
    });

    it('should provide user-friendly messages for security errors', () => {
      const error = new MarkdownSecurityError('Security violation', [], '');
      const message = createUserFriendlyErrorMessage(error);

      expect(message).toBe('The document content contains security violations and cannot be processed.');
    });
  });

  describe('Validation Middleware', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;

    beforeEach(() => {
      req = {
        body: {},
        user: { id: 'user123', roles: [] },
        org: { 
          id: 'org123',
          rsi_org_id: 'org123',
          name: 'Test Organization',
          is_registered: true,
          owner_id: 'owner123',
          created_at: new Date(),
          updated_at: new Date(),
          is_active: true,
          settings: {},
          subscription_tier: 'free',
          subscription_status: 'active'
        },
      };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      next = jest.fn();
    });

    it('should pass valid markdown content', async () => {
      req.body = { content: '# Valid Markdown\n\nThis is a test.' };
      
      const middleware = validateMarkdownContent();
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.validatedMarkdown).toBeDefined();
      expect(req.validatedMarkdown?.wordCount).toBeGreaterThan(0);
    });

    it('should reject content that is too large', async () => {
      const largeContent = 'x'.repeat(2000000);
      req.body = { content: largeContent };
      
      const middleware = validateMarkdownContent({ maxContentLength: 1000000 });
      await middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(413);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'MARKDOWN_CONTENT_TOO_LARGE',
        })
      );
    });

    it('should handle validation errors gracefully', async () => {
      req.body = { content: '[invalid markdown link(' };
      
      const middleware = validateMarkdownContent({ strictMode: true });
      await middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('formatting errors'),
        })
      );
    });

    it('should skip validation for privileged users', async () => {
      req.body = { content: 'any content' };
      req.user = { id: 'admin', roles: ['admin'] };
      
      const middleware = validateMarkdownContent({ skipValidationForRoles: ['admin'] });
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.validatedMarkdown).toBeUndefined();
    });
  });

  describe('Error Handler Middleware', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;

    beforeEach(() => {
      req = {
        method: 'POST',
        path: '/api/documents',
        headers: {},
        user: { id: 'user123' },
        org: { 
          id: 'org123',
          rsi_org_id: 'org123',
          name: 'Test Organization',
          is_registered: true,
          owner_id: 'owner123',
          created_at: new Date(),
          updated_at: new Date(),
          is_active: true,
          settings: {},
          subscription_tier: 'free',
          subscription_status: 'active'
        },
        get: jest.fn(),
        ip: '127.0.0.1',
        body: { content: 'test content' },
      };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        setHeader: jest.fn(),
      };
      next = jest.fn();
    });

    it('should handle MarkdownValidationError correctly', () => {
      const error = new MarkdownValidationError(
        'Validation failed',
        ['Invalid syntax'],
        ['Long line'],
        { field: 'content' }
      );

      markdownErrorHandler(error, req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'MARKDOWN_VALIDATION_ERROR',
          error: expect.stringContaining('formatting errors'),
          details: expect.objectContaining({
            validation_errors: ['Invalid syntax'],
            validation_warnings: ['Long line'],
          }),
          suggestions: expect.arrayContaining([
            expect.stringContaining('markdown syntax'),
          ]),
        })
      );
    });

    it('should handle MarkdownContentTooLargeError correctly', () => {
      const error = new MarkdownContentTooLargeError(2000000, 1000000);

      markdownErrorHandler(error, req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(413);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'MARKDOWN_CONTENT_TOO_LARGE',
          details: expect.objectContaining({
            content_length: 2000000,
            max_length: 1000000,
          }),
        })
      );
    });

    it('should handle DocumentNotFoundError correctly', () => {
      const error = new DocumentNotFoundError('doc123');

      markdownErrorHandler(error, req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'DOCUMENT_NOT_FOUND',
          details: expect.objectContaining({
            document_id: 'doc123',
          }),
        })
      );
    });

    it('should handle generic validation errors', () => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';

      markdownErrorHandler(error, req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'VALIDATION_ERROR',
          error: expect.stringContaining('Validation failed'),
        })
      );
    });

    it('should handle timeout errors', () => {
      const error = new Error('Request timeout');

      markdownErrorHandler(error, req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(408);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'REQUEST_TIMEOUT',
        })
      );
    });

    it('should handle generic server errors', () => {
      const error = new Error('Unexpected error');

      markdownErrorHandler(error, req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'INTERNAL_SERVER_ERROR',
          error: 'An unexpected error occurred. Please try again.',
        })
      );
    });

    it('should add request ID to responses', () => {
      const error = new MarkdownValidationError('test', [], []);
      req.headers!['x-request-id'] = 'test-request-id';

      markdownErrorHandler(error, req as Request, res as Response, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          request_id: 'test-request-id',
        })
      );
    });
  });

  describe('Integration with MarkdownProcessingService', () => {
    let service: MarkdownProcessingService;

    beforeEach(() => {
      service = new MarkdownProcessingService();
    });

    it('should throw MarkdownValidationError for invalid content', async () => {
      await expect(
        service.validateContent('')
      ).rejects.toThrow(MarkdownValidationError);
    });

    it('should throw MarkdownContentTooLargeError for oversized content', async () => {
      const largeContent = 'x'.repeat(2000000);
      
      await expect(
        service.validateContent(largeContent, { maxContentLength: 1000000 })
      ).rejects.toThrow(MarkdownContentTooLargeError);
    });

    it('should throw MarkdownRenderingError for rendering failures', async () => {
      // Mock markdown-it to throw an error
      const originalRender = service['md'].render;
      service['md'].render = jest.fn().mockImplementation(() => {
        throw new Error('Rendering failed');
      });

      await expect(
        service.validateContent('# Test')
      ).rejects.toThrow(MarkdownRenderingError);

      // Restore original method
      service['md'].render = originalRender;
    });

    it('should throw MarkdownSanitizationError for sanitization failures', () => {
      // Mock DOMPurify to throw an error
      const originalSanitize = service['domPurify']?.sanitize;
      if (service['domPurify']) {
        service['domPurify'].sanitize = jest.fn().mockImplementation(() => {
          throw new Error('Sanitization failed');
        });
      }

      expect(() => {
        service.sanitizeContent('# Test');
      }).toThrow(MarkdownSanitizationError);

      // Restore original method
      if (service['domPurify'] && originalSanitize) {
        service['domPurify'].sanitize = originalSanitize;
      }
    });
  });
});