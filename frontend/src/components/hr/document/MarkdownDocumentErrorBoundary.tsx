import React from 'react';
import { ErrorBoundary } from '../../ui';
import { useRetry } from '../../../hooks/useRetry';
import Button from '../../ui/Button';
import { ComponentTitle, ComponentSubtitle } from '../../ui/Typography';

interface MarkdownDocumentErrorBoundaryProps {
  children: React.ReactNode;
  /**
   * Document ID for context
   */
  documentId?: string;
  /**
   * Organization ID for context
   */
  organizationId?: string;
  /**
   * Operation being performed (create, edit, view, etc.)
   */
  operation?: 'create' | 'edit' | 'view' | 'delete' | 'export';
  /**
   * Whether to enable automatic retry for recoverable errors
   */
  enableRetry?: boolean;
  /**
   * Callback when error occurs
   */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /**
   * Callback when user requests to go back
   */
  onGoBack?: () => void;
}

/**
 * Specialized error boundary for markdown document operations
 * Provides document-specific error handling and recovery mechanisms
 */
const MarkdownDocumentErrorBoundary: React.FC<MarkdownDocumentErrorBoundaryProps> = ({
  children,
  documentId,
  organizationId,
  operation = 'view',
  enableRetry = true,
  onError,
  onGoBack,
}) => {
  const { retry, state } = useRetry({
    maxAttempts: 3,
    initialDelay: 1000,
    backoffMultiplier: 2,
    onRetry: (attempt, error) => {
      console.log(`Document ${operation} retry attempt ${attempt}:`, error);
    },
    onMaxAttemptsReached: (error) => {
      console.error(`Document ${operation} max retries reached:`, error);
    },
  });

  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Log document-specific error context
    console.error('Markdown Document Error:', {
      operation,
      documentId,
      organizationId,
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    });

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo);
    }

    // Report to monitoring service with document context
    if (import.meta.env.PROD) {
      // TODO: Integrate with error monitoring service
      // Include document-specific context
    }
  };

  const getErrorType = (error: Error): 'validation' | 'network' | 'permission' | 'rendering' | 'generic' => {
    const message = error.message.toLowerCase();
    
    if (message.includes('validation') || message.includes('invalid markdown') || message.includes('syntax')) {
      return 'validation';
    }
    if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
      return 'network';
    }
    if (message.includes('permission') || message.includes('unauthorized') || message.includes('forbidden')) {
      return 'permission';
    }
    if (message.includes('render') || message.includes('display') || message.includes('markdown')) {
      return 'rendering';
    }
    return 'generic';
  };

  const getErrorIcon = (errorType: string) => {
    switch (errorType) {
      case 'validation':
        return (
          <svg className="w-8 h-8 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 18.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'network':
        return (
          <svg className="w-8 h-8 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'permission':
        return (
          <svg className="w-8 h-8 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        );
      case 'rendering':
        return (
          <svg className="w-8 h-8 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      default:
        return (
          <svg className="w-8 h-8 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 18.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
    }
  };

  const getErrorTitle = (errorType: string, operation: string): string => {
    const operationText = operation.charAt(0).toUpperCase() + operation.slice(1);
    
    switch (errorType) {
      case 'validation':
        return 'Document Validation Error';
      case 'network':
        return 'Connection Error';
      case 'permission':
        return 'Access Denied';
      case 'rendering':
        return 'Display Error';
      default:
        return `Document ${operationText} Error`;
    }
  };

  const getErrorDescription = (errorType: string, operation: string): string => {
    switch (errorType) {
      case 'validation':
        return 'The document contains formatting errors or invalid content. Please check your markdown syntax and try again.';
      case 'network':
        return 'Unable to connect to the server. Please check your internet connection and try again.';
      case 'permission':
        return 'You don\'t have permission to perform this action on this document. Contact your administrator if you believe this is an error.';
      case 'rendering':
        return 'The document content cannot be displayed properly. The formatting may be corrupted or too complex.';
      default:
        return `An error occurred while ${operation === 'view' ? 'loading' : `${operation}ing`} the document. This is usually a temporary issue.`;
    }
  };

  const getSuggestions = (errorType: string, _operation: string): string[] => {
    switch (errorType) {
      case 'validation':
        return [
          'Check your markdown syntax for errors',
          'Remove any unsupported HTML tags',
          'Ensure all links and images are properly formatted',
          'Try simplifying complex formatting',
        ];
      case 'network':
        return [
          'Check your internet connection',
          'Try refreshing the page',
          'Wait a moment and try again',
          'Contact support if the problem persists',
        ];
      case 'permission':
        return [
          'Contact your administrator for access',
          'Verify you\'re logged in with the correct account',
          'Check if the document has been moved or deleted',
        ];
      case 'rendering':
        return [
          'Try refreshing the page',
          'Check if the document content is too large',
          'Simplify complex formatting or tables',
          'Contact support if the issue persists',
        ];
      default:
        return [
          'Try refreshing the page',
          'Wait a moment and try again',
          'Contact support if the problem continues',
        ];
    }
  };

  const customFallback = (error: Error, _errorInfo: React.ErrorInfo, resetError: () => void) => {
    const errorType = getErrorType(error);
    const title = getErrorTitle(errorType, operation);
    const description = getErrorDescription(errorType, operation);
    const suggestions = getSuggestions(errorType, operation);

    return (
      <div className="min-h-[400px] flex items-center justify-center p-6">
        <div className="max-w-lg w-full">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-error/20 rounded-full flex items-center justify-center mx-auto mb-4">
              {getErrorIcon(errorType)}
            </div>
            
            <ComponentTitle className="text-primary mb-2">
              {title}
            </ComponentTitle>
            
            <ComponentSubtitle className="text-secondary mb-6">
              {description}
            </ComponentSubtitle>
          </div>

          {/* Suggestions */}
          <div className="mb-8 p-4 bg-white/5 rounded-lg border border-white/10">
            <ComponentSubtitle className="text-primary mb-3 text-sm font-medium">
              Try these solutions:
            </ComponentSubtitle>
            <ul className="space-y-2 text-sm text-secondary">
              {suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-accent-blue mt-1">•</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Button
              onClick={resetError}
              variant="primary"
              size="md"
              disabled={state.isRetrying}
            >
              {state.isRetrying ? 'Retrying...' : 'Try Again'}
            </Button>
            
            {enableRetry && errorType === 'network' && (
              <Button
                onClick={() => retry(() => Promise.resolve(resetError()))}
                variant="secondary"
                size="md"
                disabled={state.isRetrying || !state.canRetry}
              >
                {state.isRetrying ? `Auto Retry ${state.attempt}/3` : 'Auto Retry'}
              </Button>
            )}
            
            {onGoBack && (
              <Button
                onClick={onGoBack}
                variant="ghost"
                size="md"
              >
                Go Back
              </Button>
            )}
            
            <Button
              onClick={() => window.location.reload()}
              variant="ghost"
              size="md"
            >
              Reload Page
            </Button>
          </div>

          {/* Retry status */}
          {state.isRetrying && (
            <div className="mt-6 p-3 bg-white/5 rounded-lg text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-4 h-4 border-2 border-accent-blue border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm text-secondary">
                  Attempting to recover...
                </span>
              </div>
              <p className="text-xs text-tertiary">
                Attempt {state.attempt} of 3
              </p>
            </div>
          )}

          {/* Development error details */}
          {!import.meta.env.PROD && (
            <details className="mt-8 text-left">
              <summary className="text-xs text-tertiary cursor-pointer hover:text-secondary mb-2">
                Error Details (Development)
              </summary>
              <div className="p-3 bg-white/5 rounded text-xs font-mono space-y-2">
                <div>
                  <strong className="text-primary">Operation:</strong> {operation}
                </div>
                {documentId && (
                  <div>
                    <strong className="text-primary">Document ID:</strong> {documentId}
                  </div>
                )}
                {organizationId && (
                  <div>
                    <strong className="text-primary">Organization:</strong> {organizationId}
                  </div>
                )}
                <div>
                  <strong className="text-primary">Error Type:</strong> {errorType}
                </div>
                <div>
                  <strong className="text-primary">Error Message:</strong> {error.message}
                </div>
                <div className="text-tertiary text-xs overflow-auto max-h-32">
                  <strong className="text-primary">Stack Trace:</strong>
                  <pre className="mt-1 whitespace-pre-wrap">{error.stack}</pre>
                </div>
              </div>
            </details>
          )}
        </div>
      </div>
    );
  };

  return (
    <ErrorBoundary
      fallback={customFallback}
      onError={handleError}
      componentName={`MarkdownDocument${operation.charAt(0).toUpperCase() + operation.slice(1)}`}
      showErrorDetails={!import.meta.env.PROD}
    >
      {children}
    </ErrorBoundary>
  );
};

export default MarkdownDocumentErrorBoundary;