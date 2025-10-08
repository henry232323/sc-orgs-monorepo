import { Request, Response, NextFunction } from 'express';
import { getUserFromRequest } from '../utils/user-casting';
import { 
  MarkdownError,
  MarkdownValidationError,
  MarkdownSanitizationError,
  MarkdownRenderingError,
  MarkdownSecurityError,
  MarkdownContentTooLargeError,
  MarkdownProcessingTimeoutError,
  DocumentNotFoundError,
  DocumentAccessDeniedError,
  DocumentVersionConflictError,
  isMarkdownError,
  createUserFriendlyErrorMessage,
  MARKDOWN_ERROR_CODES
} from '../errors/markdown_errors';
import logger from '../config/logger';

interface ErrorResponse {
  success: false;
  error: string;
  code: string;
  details?: any;
  suggestions?: string[];
  timestamp: string;
  request_id?: string;
}

/**
 * Comprehensive error handler for markdown document operations
 * Provides user-friendly error messages and appropriate HTTP status codes
 */
export function markdownErrorHandler(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): any {
  // Generate request ID for tracking
  const requestId = req.headers['x-request-id'] as string || 
                   `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Log error with full context
  logger.error('Markdown operation error', {
    error: error.message,
    stack: error.stack,
    code: error.code || 'UNKNOWN_ERROR',
    requestId,
    userId: getUserFromRequest(req)?.id,
    organizationId: req.org?.id,
    method: req.method,
    path: req.path,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    body: req.method === 'POST' || req.method === 'PUT' ? {
      ...req.body,
      content: req.body.content ? `[${req.body.content.length} chars]` : undefined
    } : undefined,
  });

  // Handle specific markdown errors
  if (isMarkdownError(error)) {
    const errorResponse = createMarkdownErrorResponse(error, requestId);
    return res.status(error.statusCode).json(errorResponse);
  }

  // Handle validation errors from other sources
  if (error.name === 'ValidationError' || error.message.includes('validation')) {
    const errorResponse: ErrorResponse = {
      success: false,
      error: 'Validation failed. Please check your input and try again.',
      code: 'VALIDATION_ERROR',
      details: {
        technical_message: error.message,
        fields: error.errors || [],
      },
      suggestions: [
        'Check that all required fields are provided',
        'Ensure data types match the expected format',
        'Verify that content meets size and format requirements',
      ],
      timestamp: new Date().toISOString(),
      request_id: requestId,
    };
    return res.status(400).json(errorResponse);
  }

  // Handle database errors
  if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.message.includes('database')) {
    const errorResponse: ErrorResponse = {
      success: false,
      error: 'Database connection error. Please try again later.',
      code: 'DATABASE_ERROR',
      details: {
        technical_message: error.message,
      },
      suggestions: [
        'Try again in a few moments',
        'Contact support if the problem persists',
      ],
      timestamp: new Date().toISOString(),
      request_id: requestId,
    };
    return res.status(503).json(errorResponse);
  }

  // Handle timeout errors
  if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
    const errorResponse: ErrorResponse = {
      success: false,
      error: 'Request timed out. Please try again with simpler content.',
      code: 'REQUEST_TIMEOUT',
      details: {
        technical_message: error.message,
      },
      suggestions: [
        'Reduce the size or complexity of your content',
        'Try again in a few moments',
        'Split large documents into smaller sections',
      ],
      timestamp: new Date().toISOString(),
      request_id: requestId,
    };
    return res.status(408).json(errorResponse);
  }

  // Handle permission/authorization errors
  if (error.status === 401 || error.message.includes('unauthorized') || error.message.includes('authentication')) {
    const errorResponse: ErrorResponse = {
      success: false,
      error: 'Authentication required. Please log in and try again.',
      code: 'AUTHENTICATION_REQUIRED',
      details: {
        technical_message: error.message,
      },
      suggestions: [
        'Log in to your account',
        'Check that your session hasn\'t expired',
        'Contact support if you continue to have issues',
      ],
      timestamp: new Date().toISOString(),
      request_id: requestId,
    };
    return res.status(401).json(errorResponse);
  }

  if (error.status === 403 || error.message.includes('forbidden') || error.message.includes('permission')) {
    const errorResponse: ErrorResponse = {
      success: false,
      error: 'You don\'t have permission to perform this action.',
      code: 'PERMISSION_DENIED',
      details: {
        technical_message: error.message,
      },
      suggestions: [
        'Contact your administrator for access',
        'Verify you\'re using the correct account',
        'Check if the resource has been moved or deleted',
      ],
      timestamp: new Date().toISOString(),
      request_id: requestId,
    };
    return res.status(403).json(errorResponse);
  }

  // Handle rate limiting errors
  if (error.status === 429 || error.message.includes('rate limit')) {
    const errorResponse: ErrorResponse = {
      success: false,
      error: 'Too many requests. Please wait before trying again.',
      code: 'RATE_LIMIT_EXCEEDED',
      details: {
        technical_message: error.message,
        retry_after: error.retryAfter || 60,
      },
      suggestions: [
        'Wait a moment before trying again',
        'Reduce the frequency of your requests',
        'Contact support if you need higher limits',
      ],
      timestamp: new Date().toISOString(),
      request_id: requestId,
    };
    return res.status(429).json(errorResponse);
  }

  // Handle not found errors
  if (error.status === 404 || error.message.includes('not found')) {
    const errorResponse: ErrorResponse = {
      success: false,
      error: 'The requested resource was not found.',
      code: 'RESOURCE_NOT_FOUND',
      details: {
        technical_message: error.message,
      },
      suggestions: [
        'Check that the URL is correct',
        'Verify the resource hasn\'t been deleted',
        'Contact support if you believe this is an error',
      ],
      timestamp: new Date().toISOString(),
      request_id: requestId,
    };
    return res.status(404).json(errorResponse);
  }

  // Handle generic server errors
  const errorResponse: ErrorResponse = {
    success: false,
    error: 'An unexpected error occurred. Please try again.',
    code: 'INTERNAL_SERVER_ERROR',
    details: {
      technical_message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
      request_id: requestId,
    },
    suggestions: [
      'Try again in a few moments',
      'Contact support if the problem persists',
      'Include the request ID when contacting support',
    ],
    timestamp: new Date().toISOString(),
    request_id: requestId,
  };

  res.status(500).json(errorResponse);
}

/**
 * Creates a detailed error response for markdown-specific errors
 */
function createMarkdownErrorResponse(error: MarkdownError, requestId: string): ErrorResponse {
  const userFriendlyMessage = createUserFriendlyErrorMessage(error);
  const suggestions = getErrorSuggestions(error);

  const baseResponse: ErrorResponse = {
    success: false,
    error: userFriendlyMessage,
    code: error.code,
    suggestions,
    timestamp: new Date().toISOString(),
    request_id: requestId,
  };

  // Add specific details based on error type
  if (error instanceof MarkdownValidationError) {
    baseResponse.details = {
      technical_message: error.message,
      validation_errors: error.errors,
      validation_warnings: error.warnings,
      error_count: error.errors.length,
      warning_count: error.warnings.length,
    };
  } else if (error instanceof MarkdownSanitizationError) {
    baseResponse.details = {
      technical_message: error.message,
      content_length: error.originalContent.length,
      sanitization_applied: !!error.sanitizedContent,
    };
  } else if (error instanceof MarkdownRenderingError) {
    baseResponse.details = {
      technical_message: error.message,
      content_length: error.content.length,
      rendering_context: error.renderingContext,
    };
  } else if (error instanceof MarkdownSecurityError) {
    baseResponse.details = {
      technical_message: error.message,
      security_violations: error.securityViolations,
      violation_count: error.securityViolations.length,
      content_length: error.content.length,
    };
  } else if (error instanceof MarkdownContentTooLargeError) {
    baseResponse.details = {
      technical_message: error.message,
      content_length: error.contentLength,
      max_length: error.maxLength,
      size_ratio: (error.contentLength / error.maxLength).toFixed(2),
    };
  } else if (error instanceof MarkdownProcessingTimeoutError) {
    baseResponse.details = {
      technical_message: error.message,
      operation: error.operation,
      timeout_ms: error.timeoutMs,
    };
  } else if (error instanceof DocumentNotFoundError) {
    baseResponse.details = {
      technical_message: error.message,
      document_id: error.documentId,
    };
  } else if (error instanceof DocumentAccessDeniedError) {
    baseResponse.details = {
      technical_message: error.message,
      document_id: error.documentId,
      user_id: error.userId,
      required_roles: error.requiredRoles,
    };
  } else if (error instanceof DocumentVersionConflictError) {
    baseResponse.details = {
      technical_message: error.message,
      document_id: error.documentId,
      current_version: error.currentVersion,
      requested_version: error.requestedVersion,
    };
  } else {
    baseResponse.details = {
      technical_message: error.message,
    };
  }

  return baseResponse;
}

/**
 * Provides actionable suggestions based on the error type
 */
function getErrorSuggestions(error: MarkdownError): string[] {
  switch (error.code) {
    case MARKDOWN_ERROR_CODES.VALIDATION_ERROR:
      return [
        'Check your markdown syntax for errors',
        'Ensure all links and images are properly formatted',
        'Verify that headers use the correct number of # symbols',
        'Make sure code blocks are properly enclosed with ```',
      ];

    case MARKDOWN_ERROR_CODES.CONTENT_TOO_LARGE:
      return [
        'Reduce the document size by removing unnecessary content',
        'Split large documents into smaller, related documents',
        'Remove or compress large images',
        'Use links to reference external content instead of embedding',
      ];

    case MARKDOWN_ERROR_CODES.SECURITY_ERROR:
      return [
        'Remove any HTML script tags or event handlers',
        'Use standard markdown formatting instead of raw HTML',
        'Check that all links use safe protocols (http/https)',
        'Remove any suspicious or potentially malicious content',
      ];

    case MARKDOWN_ERROR_CODES.RENDERING_ERROR:
      return [
        'Check for unbalanced brackets or parentheses',
        'Simplify complex formatting or nested structures',
        'Ensure all markdown syntax is properly closed',
        'Try breaking the content into smaller sections',
      ];

    case MARKDOWN_ERROR_CODES.PROCESSING_TIMEOUT:
      return [
        'Reduce the complexity of your document',
        'Remove or simplify large tables',
        'Reduce the number of images or links',
        'Try saving smaller sections at a time',
      ];

    case MARKDOWN_ERROR_CODES.DOCUMENT_NOT_FOUND:
      return [
        'Check that the document ID is correct',
        'Verify the document hasn\'t been deleted',
        'Ensure you have access to the correct organization',
        'Try refreshing the page and navigating to the document again',
      ];

    case MARKDOWN_ERROR_CODES.ACCESS_DENIED:
      return [
        'Contact your administrator for document access',
        'Verify you\'re logged in with the correct account',
        'Check if your role has the necessary permissions',
        'Ensure the document hasn\'t been moved to a restricted folder',
      ];

    case MARKDOWN_ERROR_CODES.VERSION_CONFLICT:
      return [
        'Refresh the page to get the latest version',
        'Copy your changes before refreshing',
        'Merge your changes with the current version',
        'Contact the other editor to coordinate changes',
      ];

    default:
      return [
        'Try refreshing the page and attempting the action again',
        'Check your internet connection',
        'Contact support if the problem persists',
      ];
  }
}

/**
 * Middleware to add request ID to all requests for error tracking
 */
export function addRequestId(req: Request, res: Response, next: NextFunction): void {
  const requestId = req.headers['x-request-id'] as string || 
                   `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);
  
  next();
}

/**
 * Type guard to check if error should be handled by markdown error handler
 */
export function shouldHandleAsMarkdownError(error: any): boolean {
  return isMarkdownError(error) ||
         error.message?.includes('markdown') ||
         error.message?.includes('document') ||
         error.message?.includes('validation') ||
         error.code?.startsWith('MARKDOWN_') ||
         error.code?.startsWith('DOCUMENT_');
}