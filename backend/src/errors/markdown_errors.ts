/**
 * Custom error types for markdown processing failures
 * Provides specific error handling for markdown document operations
 */

export class MarkdownError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: any;

  constructor(message: string, code: string, statusCode: number = 400, details?: any) {
    super(message);
    this.name = 'MarkdownError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MarkdownError);
    }
  }
}

export class MarkdownValidationError extends MarkdownError {
  public readonly errors: string[];
  public readonly warnings: string[];

  constructor(
    message: string, 
    errors: string[], 
    warnings: string[] = [],
    details?: any
  ) {
    super(message, 'MARKDOWN_VALIDATION_ERROR', 400, details);
    this.name = 'MarkdownValidationError';
    this.errors = errors;
    this.warnings = warnings;
  }
}

export class MarkdownSanitizationError extends MarkdownError {
  public readonly originalContent: string;
  public readonly sanitizedContent?: string;

  constructor(
    message: string, 
    originalContent: string, 
    sanitizedContent?: string,
    details?: any
  ) {
    super(message, 'MARKDOWN_SANITIZATION_ERROR', 400, details);
    this.name = 'MarkdownSanitizationError';
    this.originalContent = originalContent;
    this.sanitizedContent = sanitizedContent;
  }
}

export class MarkdownRenderingError extends MarkdownError {
  public readonly content: string;
  public readonly renderingContext?: string;

  constructor(
    message: string, 
    content: string, 
    renderingContext?: string,
    details?: any
  ) {
    super(message, 'MARKDOWN_RENDERING_ERROR', 500, details);
    this.name = 'MarkdownRenderingError';
    this.content = content;
    this.renderingContext = renderingContext;
  }
}

export class MarkdownSecurityError extends MarkdownError {
  public readonly securityViolations: string[];
  public readonly content: string;

  constructor(
    message: string, 
    securityViolations: string[], 
    content: string,
    details?: any
  ) {
    super(message, 'MARKDOWN_SECURITY_ERROR', 403, details);
    this.name = 'MarkdownSecurityError';
    this.securityViolations = securityViolations;
    this.content = content;
  }
}

export class MarkdownContentTooLargeError extends MarkdownError {
  public readonly contentLength: number;
  public readonly maxLength: number;

  constructor(
    contentLength: number, 
    maxLength: number,
    details?: any
  ) {
    super(
      `Content exceeds maximum length of ${maxLength} characters (got ${contentLength})`,
      'MARKDOWN_CONTENT_TOO_LARGE',
      413,
      details
    );
    this.name = 'MarkdownContentTooLargeError';
    this.contentLength = contentLength;
    this.maxLength = maxLength;
  }
}

export class MarkdownProcessingTimeoutError extends MarkdownError {
  public readonly timeoutMs: number;
  public readonly operation: string;

  constructor(
    operation: string, 
    timeoutMs: number,
    details?: any
  ) {
    super(
      `Markdown ${operation} operation timed out after ${timeoutMs}ms`,
      'MARKDOWN_PROCESSING_TIMEOUT',
      408,
      details
    );
    this.name = 'MarkdownProcessingTimeoutError';
    this.timeoutMs = timeoutMs;
    this.operation = operation;
  }
}

export class DocumentNotFoundError extends MarkdownError {
  public readonly documentId: string;

  constructor(documentId: string, details?: any) {
    super(
      `Document with ID ${documentId} not found`,
      'DOCUMENT_NOT_FOUND',
      404,
      details
    );
    this.name = 'DocumentNotFoundError';
    this.documentId = documentId;
  }
}

export class DocumentAccessDeniedError extends MarkdownError {
  public readonly documentId: string;
  public readonly userId: string;
  public readonly requiredRoles?: string[];

  constructor(
    documentId: string, 
    userId: string, 
    requiredRoles?: string[],
    details?: any
  ) {
    super(
      `Access denied to document ${documentId} for user ${userId}`,
      'DOCUMENT_ACCESS_DENIED',
      403,
      details
    );
    this.name = 'DocumentAccessDeniedError';
    this.documentId = documentId;
    this.userId = userId;
    this.requiredRoles = requiredRoles;
  }
}

export class DocumentVersionConflictError extends MarkdownError {
  public readonly documentId: string;
  public readonly currentVersion: number;
  public readonly requestedVersion: number;

  constructor(
    documentId: string, 
    currentVersion: number, 
    requestedVersion: number,
    details?: any
  ) {
    super(
      `Version conflict for document ${documentId}: current version is ${currentVersion}, but update was based on version ${requestedVersion}`,
      'DOCUMENT_VERSION_CONFLICT',
      409,
      details
    );
    this.name = 'DocumentVersionConflictError';
    this.documentId = documentId;
    this.currentVersion = currentVersion;
    this.requestedVersion = requestedVersion;
  }
}

/**
 * Type guard to check if an error is a MarkdownError
 */
export function isMarkdownError(error: any): error is MarkdownError {
  return error instanceof MarkdownError;
}

/**
 * Type guard to check if an error is a MarkdownValidationError
 */
export function isMarkdownValidationError(error: any): error is MarkdownValidationError {
  return error instanceof MarkdownValidationError;
}

/**
 * Type guard to check if an error is a MarkdownSecurityError
 */
export function isMarkdownSecurityError(error: any): error is MarkdownSecurityError {
  return error instanceof MarkdownSecurityError;
}

/**
 * Helper function to create user-friendly error messages
 */
export function createUserFriendlyErrorMessage(error: MarkdownError): string {
  switch (error.code) {
    case 'MARKDOWN_VALIDATION_ERROR':
      return 'The document content contains formatting errors. Please check your markdown syntax and try again.';
    
    case 'MARKDOWN_SANITIZATION_ERROR':
      return 'The document content contains potentially unsafe elements that have been removed for security.';
    
    case 'MARKDOWN_RENDERING_ERROR':
      return 'Unable to display the document content. The formatting may be corrupted.';
    
    case 'MARKDOWN_SECURITY_ERROR':
      return 'The document content contains security violations and cannot be processed.';
    
    case 'MARKDOWN_CONTENT_TOO_LARGE':
      return 'The document is too large. Please reduce the content size and try again.';
    
    case 'MARKDOWN_PROCESSING_TIMEOUT':
      return 'The document is taking too long to process. Please try again or reduce the content complexity.';
    
    case 'DOCUMENT_NOT_FOUND':
      return 'The requested document could not be found. It may have been deleted or moved.';
    
    case 'DOCUMENT_ACCESS_DENIED':
      return 'You do not have permission to access this document. Contact your administrator if you believe this is an error.';
    
    case 'DOCUMENT_VERSION_CONFLICT':
      return 'The document has been modified by another user. Please refresh and try your changes again.';
    
    default:
      return 'An error occurred while processing the document. Please try again.';
  }
}

/**
 * Error codes for client-side error handling
 */
export const MARKDOWN_ERROR_CODES = {
  VALIDATION_ERROR: 'MARKDOWN_VALIDATION_ERROR',
  SANITIZATION_ERROR: 'MARKDOWN_SANITIZATION_ERROR',
  RENDERING_ERROR: 'MARKDOWN_RENDERING_ERROR',
  SECURITY_ERROR: 'MARKDOWN_SECURITY_ERROR',
  CONTENT_TOO_LARGE: 'MARKDOWN_CONTENT_TOO_LARGE',
  PROCESSING_TIMEOUT: 'MARKDOWN_PROCESSING_TIMEOUT',
  DOCUMENT_NOT_FOUND: 'DOCUMENT_NOT_FOUND',
  ACCESS_DENIED: 'DOCUMENT_ACCESS_DENIED',
  VERSION_CONFLICT: 'DOCUMENT_VERSION_CONFLICT',
} as const;

export type MarkdownErrorCode = typeof MARKDOWN_ERROR_CODES[keyof typeof MARKDOWN_ERROR_CODES];