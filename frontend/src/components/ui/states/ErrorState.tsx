import React from 'react';
import { ComponentTitle, ComponentSubtitle } from '../Typography';
import Button from '../Button';
import {
  ExclamationTriangleIcon,
  WifiIcon,
  ServerIcon,
  ShieldExclamationIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

interface ErrorStateProps {
  /**
   * Error object or message
   */
  error?: any;
  /**
   * Custom title for the error state
   */
  title?: string;
  /**
   * Custom description for the error state
   */
  description?: string;
  /**
   * Retry function to call when retry button is clicked
   */
  onRetry?: () => void;
  /**
   * Custom retry button text
   */
  retryText?: string;
  /**
   * Whether to show the retry button
   */
  showRetry?: boolean;
  /**
   * Error type for different visual treatments
   */
  variant?: 'network' | 'server' | 'permission' | 'timeout' | 'generic';
  /**
   * Size of the error state
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Additional actions to show alongside retry
   */
  actions?: React.ReactNode;
}

/**
 * Reusable error state component with retry functionality
 * Automatically detects error types and provides appropriate messaging
 */
const ErrorState: React.FC<ErrorStateProps> = ({
  error,
  title,
  description,
  onRetry,
  retryText = 'Try Again',
  showRetry = true,
  variant,
  size = 'md',
  className = '',
  actions,
}) => {
  // Auto-detect error type if not specified
  const getErrorVariant = (): typeof variant => {
    if (variant) return variant;
    
    if (!error) return 'generic';
    
    const errorMessage = error?.message?.toLowerCase() || '';
    const errorStatus = error?.status || error?.code;
    
    if (errorStatus === 401 || errorStatus === 403 || errorMessage.includes('permission') || errorMessage.includes('unauthorized')) {
      return 'permission';
    }
    
    if (errorStatus === 408 || errorStatus === 504 || errorMessage.includes('timeout')) {
      return 'timeout';
    }
    
    if (errorStatus >= 500 || errorMessage.includes('server') || errorMessage.includes('internal')) {
      return 'server';
    }
    
    if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('connection')) {
      return 'network';
    }
    
    return 'generic';
  };

  const errorVariant = getErrorVariant();

  // Get appropriate icon, title, and description based on error type
  const getErrorContent = () => {
    switch (errorVariant) {
      case 'network':
        return {
          icon: WifiIcon,
          defaultTitle: 'Connection Problem',
          defaultDescription: 'Unable to connect to the server. Please check your internet connection and try again.',
          iconColor: 'text-warning',
        };
      
      case 'server':
        return {
          icon: ServerIcon,
          defaultTitle: 'Server Error',
          defaultDescription: 'Something went wrong on our end. Our team has been notified and is working on a fix.',
          iconColor: 'text-error',
        };
      
      case 'permission':
        return {
          icon: ShieldExclamationIcon,
          defaultTitle: 'Access Denied',
          defaultDescription: 'You don\'t have permission to access this resource. Contact your administrator if you believe this is an error.',
          iconColor: 'text-warning',
        };
      
      case 'timeout':
        return {
          icon: ClockIcon,
          defaultTitle: 'Request Timeout',
          defaultDescription: 'The request took too long to complete. Please try again.',
          iconColor: 'text-warning',
        };
      
      default:
        return {
          icon: ExclamationTriangleIcon,
          defaultTitle: 'Something Went Wrong',
          defaultDescription: 'An unexpected error occurred. Please try again or contact support if the problem persists.',
          iconColor: 'text-error',
        };
    }
  };

  const { icon: Icon, defaultTitle, defaultDescription, iconColor } = getErrorContent();

  const sizeClasses = {
    sm: 'py-4',
    md: 'py-8',
    lg: 'py-12',
  };

  const iconSizes = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  // Extract error message for display
  const getErrorMessage = () => {
    if (description) return description;
    
    if (error?.message) {
      // Clean up common error messages
      let message = error.message;
      if (message.includes('Failed to fetch')) {
        return 'Unable to connect to the server. Please check your internet connection.';
      }
      return message;
    }
    
    return defaultDescription;
  };

  // Get error details for debugging (only in development)
  const getErrorDetails = () => {
    if (import.meta.env.PROD) return null;
    
    const details = [];
    if (error?.status) details.push(`Status: ${error.status}`);
    if (error?.code) details.push(`Code: ${error.code}`);
    if (error?.stack) details.push(`Stack: ${error.stack.split('\n')[0]}`);
    
    return details.length > 0 ? details.join(' | ') : null;
  };

  return (
    <div className={`text-center ${sizeClasses[size]} ${className}`}>
      {/* Error icon */}
      <Icon className={`${iconSizes[size]} ${iconColor} mx-auto mb-4`} />
      
      {/* Error title */}
      <ComponentTitle className="text-primary mb-2">
        {title || defaultTitle}
      </ComponentTitle>
      
      {/* Error description */}
      <ComponentSubtitle className="text-secondary mb-6 max-w-md mx-auto">
        {getErrorMessage()}
      </ComponentSubtitle>
      
      {/* Error details (development only) */}
      {getErrorDetails() && (
        <div className="mb-4 p-3 bg-white/5 rounded-lg border border-white/10">
          <p className="text-xs text-tertiary font-mono">
            {getErrorDetails()}
          </p>
        </div>
      )}
      
      {/* Action buttons */}
      <div className="flex items-center justify-center gap-3">
        {showRetry && onRetry && (
          <Button 
            variant="secondary" 
            onClick={onRetry}
            size={size}
          >
            {retryText}
          </Button>
        )}
        {actions}
      </div>
    </div>
  );
};

export default ErrorState;