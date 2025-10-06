import React from 'react';
import LoadingState from './LoadingState';
import ErrorState from './ErrorState';
import EmptyState from './EmptyState';

interface DataStateWrapperProps<T> {
  /**
   * The data from the query
   */
  data?: T;
  /**
   * Loading state from the query
   */
  isLoading?: boolean;
  /**
   * Error from the query
   */
  error?: any;
  /**
   * Whether the query is currently retrying
   */
  isRetrying?: boolean;
  /**
   * Function to retry the query
   */
  onRetry?: () => void;
  /**
   * Function to determine if data is empty
   */
  isEmpty?: (data: T) => boolean;
  /**
   * Children to render when data is available
   */
  children: (data: T) => React.ReactNode;
  /**
   * Loading state configuration
   */
  loadingProps?: {
    title?: string;
    description?: string;
    variant?: 'default' | 'card' | 'list' | 'table' | 'minimal';
    skeletonCount?: number;
  };
  /**
   * Error state configuration
   */
  errorProps?: {
    title?: string;
    description?: string;
    variant?: 'network' | 'server' | 'permission' | 'timeout' | 'generic';
    showRetry?: boolean;
    retryText?: string;
  };
  /**
   * Empty state configuration
   */
  emptyProps?: {
    title?: string;
    description?: string;
    variant?: 'no-data' | 'no-results' | 'no-applications' | 'no-skills' | 'no-documents' | 'no-reviews' | 'no-activities' | 'no-members' | 'custom';
    action?: {
      label: string;
      onClick: () => void;
      variant?: 'primary' | 'secondary' | 'ghost';
    };
    secondaryAction?: {
      label: string;
      onClick: () => void;
      variant?: 'primary' | 'secondary' | 'ghost';
    };
  };
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Comprehensive data state wrapper that handles loading, error, and empty states
 * Provides a consistent pattern for data-dependent components
 */
function DataStateWrapper<T>({
  data,
  isLoading = false,
  error,
  isRetrying = false,
  onRetry,
  isEmpty = (data: T) => {
    if (Array.isArray(data)) return data.length === 0;
    if (typeof data === 'object' && data !== null) {
      return Object.keys(data).length === 0;
    }
    return !data;
  },
  children,
  loadingProps = {},
  errorProps = {},
  emptyProps = {},
  className = '',
}: DataStateWrapperProps<T>) {
  // Show loading state
  if (isLoading && !data) {
    const loadingStateProps = {
      ...(loadingProps?.title && { title: loadingProps.title }),
      ...(loadingProps?.description && { description: loadingProps.description }),
      ...(loadingProps?.variant && { variant: loadingProps.variant }),
      ...(loadingProps?.skeletonCount && { skeletonCount: loadingProps.skeletonCount }),
      ...(isRetrying && { title: 'Retrying...' }),
    };

    return (
      <div className={className}>
        <LoadingState {...loadingStateProps} />
      </div>
    );
  }

  // Show error state
  if (error && !data) {
    const errorStateProps = {
      error,
      ...(errorProps?.title && { title: errorProps.title }),
      ...(errorProps?.description && { description: errorProps.description }),
      ...(errorProps?.variant && { variant: errorProps.variant }),
      ...(onRetry && { onRetry }),
      showRetry: errorProps?.showRetry !== false && !!onRetry,
      ...(errorProps?.retryText && { retryText: errorProps.retryText }),
    };

    return (
      <div className={className}>
        <ErrorState {...errorStateProps} />
      </div>
    );
  }

  // Show empty state
  if (data && isEmpty(data)) {
    const emptyStateProps = {
      title: emptyProps?.title || 'No Data Available',
      description: emptyProps?.description || 'There\'s nothing to show here right now.',
      ...(emptyProps?.variant && { variant: emptyProps.variant }),
      ...(emptyProps?.action && { action: emptyProps.action }),
      ...(emptyProps?.secondaryAction && { secondaryAction: emptyProps.secondaryAction }),
    };

    return (
      <div className={className}>
        <EmptyState {...emptyStateProps} />
      </div>
    );
  }

  // Show data
  if (data) {
    return (
      <div className={className}>
        {children(data)}
      </div>
    );
  }

  // Fallback - should not reach here in normal cases
  return (
    <div className={className}>
      <EmptyState
        title="No Data"
        description="Unable to load data."
        variant="no-data"
      />
    </div>
  );
}

export default DataStateWrapper;