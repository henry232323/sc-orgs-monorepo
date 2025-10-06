import { Component, ErrorInfo, ReactNode } from 'react';
import ErrorState from './ErrorState';
import Button from '../Button';
import { ComponentTitle, ComponentSubtitle } from '../Typography';

interface ErrorBoundaryProps {
  children: ReactNode;
  /**
   * Custom fallback component to render when an error occurs
   */
  fallback?: (error: Error, errorInfo: ErrorInfo, resetError: () => void) => ReactNode;
  /**
   * Callback function called when an error occurs
   */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /**
   * Whether to show error details in development
   */
  showErrorDetails?: boolean;
  /**
   * Custom error message
   */
  errorMessage?: string;
  /**
   * Component name for better error reporting
   */
  componentName?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error boundary component for catching and handling React errors
 * Provides a graceful fallback UI when components crash
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Update state with error info
    this.setState({
      error,
      errorInfo,
    });

    // Call onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Report error to monitoring service in production
    if (import.meta.env.PROD) {
      // TODO: Integrate with error monitoring service (e.g., Sentry)
      this.reportError(error, errorInfo);
    }
  }

  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    // This would integrate with your error monitoring service
    // For now, we'll just log it
    console.error('Reporting error to monitoring service:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      componentName: this.props.componentName,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    });
  };

  private resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  private reloadPage = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Custom fallback component
      if (this.props.fallback) {
        return this.props.fallback(
          this.state.error,
          this.state.errorInfo!,
          this.resetError
        );
      }

      // Default error UI
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="max-w-md w-full">
            <ErrorState
              error={this.state.error}
              title="Component Error"
              description={
                this.props.errorMessage ||
                `Something went wrong in the ${this.props.componentName || 'component'}. This is usually a temporary issue.`
              }
              onRetry={this.resetError}
              retryText="Try Again"
              variant="generic"
              size="md"
              actions={
                <Button 
                  variant="ghost" 
                  onClick={this.reloadPage}
                  size="md"
                >
                  Reload Page
                </Button>
              }
            />

            {/* Error details in development */}
            {(this.props.showErrorDetails || !import.meta.env.PROD) && (
              <div className="mt-8 p-4 bg-white/5 rounded-lg border border-white/10">
                <ComponentTitle className="text-error mb-3 text-sm">
                  Error Details (Development)
                </ComponentTitle>
                
                <div className="space-y-3 text-xs">
                  <div>
                    <ComponentSubtitle className="text-tertiary mb-1">
                      Error Message:
                    </ComponentSubtitle>
                    <pre className="text-error font-mono bg-white/5 p-2 rounded overflow-x-auto">
                      {this.state.error.message}
                    </pre>
                  </div>
                  
                  {this.state.error.stack && (
                    <div>
                      <ComponentSubtitle className="text-tertiary mb-1">
                        Stack Trace:
                      </ComponentSubtitle>
                      <pre className="text-tertiary font-mono bg-white/5 p-2 rounded overflow-x-auto max-h-32 overflow-y-auto">
                        {this.state.error.stack}
                      </pre>
                    </div>
                  )}
                  
                  {this.state.errorInfo?.componentStack && (
                    <div>
                      <ComponentSubtitle className="text-tertiary mb-1">
                        Component Stack:
                      </ComponentSubtitle>
                      <pre className="text-tertiary font-mono bg-white/5 p-2 rounded overflow-x-auto max-h-32 overflow-y-auto">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;