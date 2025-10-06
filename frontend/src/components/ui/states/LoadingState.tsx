import React from 'react';
import { ComponentTitle, ComponentSubtitle } from '../Typography';

interface LoadingStateProps {
  /**
   * Optional title to display while loading
   */
  title?: string;
  /**
   * Optional description to display while loading
   */
  description?: string;
  /**
   * Number of skeleton items to show (default: 3)
   */
  skeletonCount?: number;
  /**
   * Variant of loading state
   */
  variant?: 'default' | 'card' | 'list' | 'table' | 'minimal';
  /**
   * Size of the loading state
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Reusable loading state component with skeleton loaders
 * Follows the design system patterns for consistent loading experiences
 */
const LoadingState: React.FC<LoadingStateProps> = ({
  title = 'Loading...',
  description,
  skeletonCount = 3,
  variant = 'default',
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'py-4',
    md: 'py-8',
    lg: 'py-12',
  };

  const renderSkeletonItems = () => {
    const items = Array.from({ length: skeletonCount }, (_, i) => i);

    switch (variant) {
      case 'card':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[var(--gap-grid-md)]">
            {items.map(i => (
              <div key={i} className="animate-pulse">
                <div className="glass-card p-6 space-y-4">
                  <div className="w-12 h-12 bg-white/10 rounded-lg mx-auto"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-white/10 rounded w-3/4 mx-auto"></div>
                    <div className="h-3 bg-white/5 rounded w-full"></div>
                    <div className="h-3 bg-white/5 rounded w-2/3 mx-auto"></div>
                  </div>
                  <div className="h-8 bg-white/10 rounded w-1/2 mx-auto"></div>
                </div>
              </div>
            ))}
          </div>
        );

      case 'list':
        return (
          <div className="space-y-4">
            {items.map(i => (
              <div key={i} className="animate-pulse">
                <div className="flex items-start space-x-4 p-4 bg-white/5 rounded-lg">
                  <div className="w-10 h-10 bg-white/10 rounded-lg flex-shrink-0"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-white/10 rounded w-3/4"></div>
                    <div className="h-3 bg-white/5 rounded w-full"></div>
                    <div className="h-3 bg-white/5 rounded w-1/4"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );

      case 'table':
        return (
          <div className="space-y-3">
            {/* Table header skeleton */}
            <div className="animate-pulse">
              <div className="grid grid-cols-4 gap-4 p-4 bg-white/5 rounded-lg">
                <div className="h-4 bg-white/10 rounded"></div>
                <div className="h-4 bg-white/10 rounded"></div>
                <div className="h-4 bg-white/10 rounded"></div>
                <div className="h-4 bg-white/10 rounded"></div>
              </div>
            </div>
            {/* Table rows skeleton */}
            {items.map(i => (
              <div key={i} className="animate-pulse">
                <div className="grid grid-cols-4 gap-4 p-4 border-b border-white/10">
                  <div className="h-4 bg-white/5 rounded"></div>
                  <div className="h-4 bg-white/5 rounded"></div>
                  <div className="h-4 bg-white/5 rounded"></div>
                  <div className="h-4 bg-white/5 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        );

      case 'minimal':
        return (
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white/60"></div>
            <span className="text-sm text-secondary">Loading...</span>
          </div>
        );

      default:
        return (
          <div className="space-y-4">
            {items.map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-white/5 rounded-lg"></div>
              </div>
            ))}
          </div>
        );
    }
  };

  if (variant === 'minimal') {
    return (
      <div className={`flex items-center justify-center ${sizeClasses[size]} ${className}`}>
        {renderSkeletonItems()}
      </div>
    );
  }

  return (
    <div className={`text-center ${sizeClasses[size]} ${className}`}>
      {/* Loading spinner and text */}
      <div className="flex items-center justify-center space-x-3 mb-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/60"></div>
        <ComponentTitle className="text-primary">
          {title}
        </ComponentTitle>
      </div>
      
      {description && (
        <ComponentSubtitle className="text-secondary mb-8">
          {description}
        </ComponentSubtitle>
      )}

      {/* Skeleton content */}
      {renderSkeletonItems()}
    </div>
  );
};

export default LoadingState;