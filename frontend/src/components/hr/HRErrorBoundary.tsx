import React from 'react';
import { ErrorBoundary } from '../ui';
import { useRetry } from '../../hooks/useRetry';

interface HRErrorBoundaryProps {
  children: React.ReactNode;
  /**
   * Component name for better error reporting
   */
  componentName?: string;
  /**
   * Organization ID for context
   */
  organizationId?: string;
  /**
   * Whether to enable automatic retry for recoverable errors
   */
  enableRetry?: boolean;
}

/**
 * Specialized error boundary for HR components
 * Provides HR-specific error handling and recovery mechanisms
 */
const HRErrorBoundary: React.FC<HRErrorBoundaryProps> = ({
  children,
  componentName = 'HR Component',
  organizationId,
  enableRetry = true,
}) => {
  const { retry, state } = useRetry({
    maxAttempts: 3,
    initialDelay: 1000,
    onRetry: (attempt, error) => {
      console.log(`HR Component retry attempt ${attempt}:`, error);
    },
    onMaxAttemptsReached: (error) => {
      console.error('HR Component max retries reached:', error);
    },
  });

  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Log HR-specific error context
    console.error('HR Component Error:', {
      component: componentName,
      organizationId,
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    });

    // Report to monitoring service with HR context
    if (import.meta.env.PROD) {
      // TODO: Integrate with error monitoring service
      // Include HR-specific context like organization ID, component type, etc.
    }
  };

  const customFallback = (error: Error, _errorInfo: React.ErrorInfo, resetError: () => void) => {
    const isDataError = error.message.includes('data') || error.message.includes('fetch');
    const isPermissionError = error.message.includes('permission') || error.message.includes('unauthorized');

    return (
      <div className="min-h-[300px] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-error/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 18.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            
            <h3 className="text-lg font-semibold text-primary mb-2">
              {isPermissionError ? 'Access Denied' : 
               isDataError ? 'Data Loading Error' : 
               'Component Error'}
            </h3>
            
            <p className="text-secondary text-sm mb-6">
              {isPermissionError 
                ? 'You don\'t have permission to access this HR feature. Contact your administrator.'
                : isDataError 
                ? 'Unable to load HR data. This might be a temporary network issue.'
                : `The ${componentName} encountered an error. This is usually temporary.`}
            </p>
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={resetError}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-primary rounded-lg transition-colors"
              disabled={state.isRetrying}
            >
              {state.isRetrying ? 'Retrying...' : 'Try Again'}
            </button>
            
            {enableRetry && isDataError && (
              <button
                onClick={() => retry(() => Promise.resolve(resetError()))}
                className="px-4 py-2 bg-accent-blue hover:bg-accent-blue/80 text-white rounded-lg transition-colors"
                disabled={state.isRetrying || !state.canRetry}
              >
                {state.isRetrying ? `Retry ${state.attempt}/3` : 'Auto Retry'}
              </button>
            )}
            
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-tertiary hover:text-secondary transition-colors"
            >
              Reload Page
            </button>
          </div>

          {/* Show retry status */}
          {state.isRetrying && (
            <div className="mt-4 p-3 bg-white/5 rounded-lg">
              <p className="text-xs text-tertiary">
                Attempting to recover... (Attempt {state.attempt}/3)
              </p>
            </div>
          )}

          {/* Development error details */}
          {!import.meta.env.PROD && (
            <details className="mt-6 text-left">
              <summary className="text-xs text-tertiary cursor-pointer hover:text-secondary">
                Error Details (Development)
              </summary>
              <div className="mt-2 p-3 bg-white/5 rounded text-xs font-mono">
                <div className="mb-2">
                  <strong>Component:</strong> {componentName}
                </div>
                {organizationId && (
                  <div className="mb-2">
                    <strong>Organization:</strong> {organizationId}
                  </div>
                )}
                <div className="mb-2">
                  <strong>Error:</strong> {error.message}
                </div>
                <div className="text-tertiary text-xs overflow-auto max-h-32">
                  <strong>Stack:</strong>
                  <pre>{error.stack}</pre>
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
      componentName={componentName}
      showErrorDetails={!import.meta.env.PROD}
    >
      {children}
    </ErrorBoundary>
  );
};

export default HRErrorBoundary;