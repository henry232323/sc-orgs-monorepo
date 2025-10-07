/**
 * Frontend error handling utilities for markdown document operations
 * Provides consistent error handling and user-friendly messages
 */

export interface MarkdownError {
  code: string;
  message: string;
  details?: any;
  suggestions?: string[];
  timestamp?: string;
  request_id?: string;
}

export interface ValidationError {
  code: string;
  message: string;
  field?: string;
  line?: number;
  column?: number;
}

export interface ValidationWarning {
  code: string;
  message: string;
  field?: string;
  line?: number;
  column?: number;
}

export interface MarkdownOperationError extends Error {
  code?: string;
  statusCode?: number;
  details?: any;
  suggestions?: string[];
  validationErrors?: ValidationError[];
  validationWarnings?: ValidationWarning[];
}

/**
 * Error codes that match backend error codes
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
  NETWORK_ERROR: 'NETWORK_ERROR',
  AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
} as const;

export type MarkdownErrorCode = typeof MARKDOWN_ERROR_CODES[keyof typeof MARKDOWN_ERROR_CODES];

/**
 * Parses API error responses into structured error objects
 */
export function parseApiError(error: any): MarkdownOperationError {
  // Handle network errors
  if (!error.response) {
    const networkError = new Error('Network error. Please check your connection and try again.') as MarkdownOperationError;
    networkError.code = MARKDOWN_ERROR_CODES.NETWORK_ERROR;
    networkError.statusCode = 0;
    networkError.suggestions = [
      'Check your internet connection',
      'Try again in a few moments',
      'Contact support if the problem persists',
    ];
    return networkError;
  }

  const { status, data } = error.response;
  
  // Handle structured API error responses
  if (data && typeof data === 'object') {
    const apiError = new Error(data.error || 'An error occurred') as MarkdownOperationError;
    apiError.code = data.code;
    apiError.statusCode = status;
    apiError.details = data.details;
    apiError.suggestions = data.suggestions || [];
    
    // Extract validation errors if present
    if (data.details?.validation_errors) {
      apiError.validationErrors = data.details.validation_errors.map((err: any) => ({
        code: err.code || 'VALIDATION_ERROR',
        message: err.message || err,
        field: err.field,
        line: err.line,
        column: err.column,
      }));
    }
    
    // Extract validation warnings if present
    if (data.details?.validation_warnings) {
      apiError.validationWarnings = data.details.validation_warnings.map((warn: any) => ({
        code: warn.code || 'VALIDATION_WARNING',
        message: warn.message || warn,
        field: warn.field,
        line: warn.line,
        column: warn.column,
      }));
    }
    
    return apiError;
  }

  // Handle generic HTTP errors
  const genericError = new Error(getGenericErrorMessage(status)) as MarkdownOperationError;
  genericError.statusCode = status;
  genericError.suggestions = getGenericErrorSuggestions(status);
  
  return genericError;
}

/**
 * Gets user-friendly error messages based on error codes
 */
export function getUserFriendlyErrorMessage(error: MarkdownOperationError): string {
  if (!error.code) {
    return error.message || 'An unexpected error occurred';
  }

  switch (error.code) {
    case MARKDOWN_ERROR_CODES.VALIDATION_ERROR:
      return 'The document contains formatting errors. Please check your markdown syntax and try again.';
    
    case MARKDOWN_ERROR_CODES.SANITIZATION_ERROR:
      return 'Some content was removed for security reasons. Please review your document.';
    
    case MARKDOWN_ERROR_CODES.RENDERING_ERROR:
      return 'Unable to display the document properly. The formatting may be corrupted.';
    
    case MARKDOWN_ERROR_CODES.SECURITY_ERROR:
      return 'The document contains potentially unsafe content that cannot be processed.';
    
    case MARKDOWN_ERROR_CODES.CONTENT_TOO_LARGE:
      return 'The document is too large. Please reduce the content size and try again.';
    
    case MARKDOWN_ERROR_CODES.PROCESSING_TIMEOUT:
      return 'The document is taking too long to process. Please try again or simplify the content.';
    
    case MARKDOWN_ERROR_CODES.DOCUMENT_NOT_FOUND:
      return 'The document could not be found. It may have been deleted or moved.';
    
    case MARKDOWN_ERROR_CODES.ACCESS_DENIED:
      return 'You don\'t have permission to access this document.';
    
    case MARKDOWN_ERROR_CODES.VERSION_CONFLICT:
      return 'The document has been modified by another user. Please refresh and try again.';
    
    case MARKDOWN_ERROR_CODES.NETWORK_ERROR:
      return 'Network connection error. Please check your internet connection.';
    
    case MARKDOWN_ERROR_CODES.AUTHENTICATION_REQUIRED:
      return 'Please log in to continue.';
    
    case MARKDOWN_ERROR_CODES.PERMISSION_DENIED:
      return 'You don\'t have permission to perform this action.';
    
    case MARKDOWN_ERROR_CODES.RATE_LIMIT_EXCEEDED:
      return 'Too many requests. Please wait before trying again.';
    
    default:
      return error.message || 'An unexpected error occurred';
  }
}

/**
 * Gets actionable suggestions based on error type
 */
export function getErrorSuggestions(error: MarkdownOperationError): string[] {
  if (error.suggestions && error.suggestions.length > 0) {
    return error.suggestions;
  }

  if (!error.code) {
    return ['Try again in a few moments', 'Contact support if the problem persists'];
  }

  switch (error.code) {
    case MARKDOWN_ERROR_CODES.VALIDATION_ERROR:
      return [
        'Check your markdown syntax for errors',
        'Ensure all links and images are properly formatted',
        'Verify that code blocks use proper ``` syntax',
        'Make sure all brackets and parentheses are balanced',
      ];

    case MARKDOWN_ERROR_CODES.CONTENT_TOO_LARGE:
      return [
        'Split the document into smaller sections',
        'Remove unnecessary images or content',
        'Use links to reference external content',
        'Compress or optimize any embedded images',
      ];

    case MARKDOWN_ERROR_CODES.SECURITY_ERROR:
      return [
        'Remove any HTML script tags',
        'Use standard markdown formatting instead of raw HTML',
        'Check that all links use safe protocols',
        'Remove any suspicious content',
      ];

    case MARKDOWN_ERROR_CODES.NETWORK_ERROR:
      return [
        'Check your internet connection',
        'Try refreshing the page',
        'Wait a moment and try again',
        'Contact support if the problem continues',
      ];

    case MARKDOWN_ERROR_CODES.ACCESS_DENIED:
      return [
        'Contact your administrator for access',
        'Verify you\'re using the correct account',
        'Check if the document has been moved',
        'Ensure you have the necessary permissions',
      ];

    case MARKDOWN_ERROR_CODES.VERSION_CONFLICT:
      return [
        'Refresh the page to get the latest version',
        'Copy your changes before refreshing',
        'Coordinate with other editors',
        'Try saving smaller changes more frequently',
      ];

    default:
      return [
        'Try refreshing the page',
        'Wait a moment and try again',
        'Contact support if the issue persists',
      ];
  }
}

/**
 * Determines if an error is recoverable (user can retry)
 */
export function isRecoverableError(error: MarkdownOperationError): boolean {
  if (!error.code) {
    return true; // Assume generic errors are recoverable
  }

  const nonRecoverableErrors = [
    MARKDOWN_ERROR_CODES.ACCESS_DENIED,
    MARKDOWN_ERROR_CODES.PERMISSION_DENIED,
    MARKDOWN_ERROR_CODES.AUTHENTICATION_REQUIRED,
    MARKDOWN_ERROR_CODES.DOCUMENT_NOT_FOUND,
  ];

  return !nonRecoverableErrors.includes(error.code as MarkdownErrorCode);
}

/**
 * Determines if an error should trigger automatic retry
 */
export function shouldAutoRetry(error: MarkdownOperationError): boolean {
  if (!error.code) {
    return false;
  }

  const autoRetryErrors = [
    MARKDOWN_ERROR_CODES.NETWORK_ERROR,
    MARKDOWN_ERROR_CODES.PROCESSING_TIMEOUT,
  ];

  return autoRetryErrors.includes(error.code as MarkdownErrorCode);
}

/**
 * Gets the error severity level
 */
export function getErrorSeverity(error: MarkdownOperationError): 'error' | 'warning' | 'info' {
  if (!error.code) {
    return 'error';
  }

  const warningErrors = [
    MARKDOWN_ERROR_CODES.SANITIZATION_ERROR,
  ];

  const infoErrors = [
    MARKDOWN_ERROR_CODES.VERSION_CONFLICT,
  ];

  if (warningErrors.includes(error.code as MarkdownErrorCode)) {
    return 'warning';
  }

  if (infoErrors.includes(error.code as MarkdownErrorCode)) {
    return 'info';
  }

  return 'error';
}

/**
 * Creates a toast notification message from an error
 */
export function createErrorToast(error: MarkdownOperationError): {
  title: string;
  message: string;
  type: 'error' | 'warning' | 'info';
  duration?: number;
} {
  const severity = getErrorSeverity(error);
  const message = getUserFriendlyErrorMessage(error);
  
  let title = 'Error';
  if (severity === 'warning') {
    title = 'Warning';
  } else if (severity === 'info') {
    title = 'Notice';
  }

  return {
    title,
    message,
    type: severity,
    duration: severity === 'error' ? 8000 : 5000,
  };
}

/**
 * Logs errors for debugging and monitoring
 */
export function logError(error: MarkdownOperationError, context?: any): void {
  const errorData = {
    message: error.message,
    code: error.code,
    statusCode: error.statusCode,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
  };

  console.error('Markdown operation error:', errorData);

  // In production, send to monitoring service
  if (import.meta.env.PROD) {
    // TODO: Integrate with error monitoring service (e.g., Sentry)
    // sendToMonitoring(errorData);
  }
}

// Helper functions for generic HTTP errors
function getGenericErrorMessage(status: number): string {
  switch (status) {
    case 400:
      return 'Invalid request. Please check your input and try again.';
    case 401:
      return 'Authentication required. Please log in.';
    case 403:
      return 'You don\'t have permission to perform this action.';
    case 404:
      return 'The requested resource was not found.';
    case 408:
      return 'Request timed out. Please try again.';
    case 409:
      return 'Conflict detected. The resource may have been modified.';
    case 413:
      return 'Request too large. Please reduce the content size.';
    case 429:
      return 'Too many requests. Please wait before trying again.';
    case 500:
      return 'Server error. Please try again later.';
    case 502:
      return 'Service temporarily unavailable. Please try again.';
    case 503:
      return 'Service unavailable. Please try again later.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}

function getGenericErrorSuggestions(status: number): string[] {
  switch (status) {
    case 400:
      return ['Check your input for errors', 'Ensure all required fields are filled'];
    case 401:
      return ['Log in to your account', 'Check if your session has expired'];
    case 403:
      return ['Contact your administrator', 'Verify your permissions'];
    case 404:
      return ['Check the URL', 'Verify the resource exists'];
    case 408:
      return ['Try again', 'Check your internet connection'];
    case 413:
      return ['Reduce content size', 'Split into smaller parts'];
    case 429:
      return ['Wait before trying again', 'Reduce request frequency'];
    case 500:
    case 502:
    case 503:
      return ['Try again later', 'Contact support if problem persists'];
    default:
      return ['Try again', 'Contact support if needed'];
  }
}