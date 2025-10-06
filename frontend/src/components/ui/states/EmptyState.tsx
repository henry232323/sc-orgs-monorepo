import React from 'react';
import { ComponentTitle, ComponentSubtitle } from '../Typography';
import Button from '../Button';
import {
  DocumentIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
  AcademicCapIcon,
  TrophyIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  InboxIcon,
} from '@heroicons/react/24/outline';

interface EmptyStateProps {
  /**
   * Icon to display (can be a Heroicon component or custom icon)
   */
  icon?: React.ComponentType<{ className?: string }>;
  /**
   * Title for the empty state
   */
  title: string;
  /**
   * Description text
   */
  description: string;
  /**
   * Primary action button
   */
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'ghost';
  };
  /**
   * Secondary action button
   */
  secondaryAction?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'ghost';
  };
  /**
   * Predefined empty state types for common scenarios
   */
  variant?: 
    | 'no-data' 
    | 'no-results' 
    | 'no-applications' 
    | 'no-skills' 
    | 'no-documents' 
    | 'no-reviews' 
    | 'no-activities' 
    | 'no-members'
    | 'custom';
  /**
   * Size of the empty state
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Reusable empty state component for when no data is available
 * Provides consistent messaging and actions across the application
 */
const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  secondaryAction,
  variant = 'custom',
  size = 'md',
  className = '',
}) => {
  // Predefined configurations for common empty states
  const getVariantConfig = () => {
    switch (variant) {
      case 'no-applications':
        return {
          icon: ClipboardDocumentListIcon,
          defaultTitle: 'No Applications Yet',
          defaultDescription: 'Applications will appear here once candidates start applying to your organization.',
          suggestedAction: { label: 'Create Job Posting', variant: 'primary' as const },
        };
      
      case 'no-skills':
        return {
          icon: AcademicCapIcon,
          defaultTitle: 'No Skills Tracked',
          defaultDescription: 'Start tracking member skills to build your organization\'s capability matrix.',
          suggestedAction: { label: 'Add Skills', variant: 'primary' as const },
        };
      
      case 'no-documents':
        return {
          icon: DocumentIcon,
          defaultTitle: 'No Documents Available',
          defaultDescription: 'Upload documents to share important information with your organization members.',
          suggestedAction: { label: 'Upload Document', variant: 'primary' as const },
        };
      
      case 'no-reviews':
        return {
          icon: TrophyIcon,
          defaultTitle: 'No Performance Reviews',
          defaultDescription: 'Performance reviews will appear here once they are submitted and completed.',
          suggestedAction: { label: 'Start Review', variant: 'primary' as const },
        };
      
      case 'no-activities':
        return {
          icon: ClockIcon,
          defaultTitle: 'No Recent Activity',
          defaultDescription: 'HR activities will appear here as they occur in your organization.',
          suggestedAction: null,
        };
      
      case 'no-members':
        return {
          icon: UserGroupIcon,
          defaultTitle: 'No Members Found',
          defaultDescription: 'Invite members to your organization to get started with HR management.',
          suggestedAction: { label: 'Invite Members', variant: 'primary' as const },
        };
      
      case 'no-results':
        return {
          icon: MagnifyingGlassIcon,
          defaultTitle: 'No Results Found',
          defaultDescription: 'Try adjusting your search criteria or filters to find what you\'re looking for.',
          suggestedAction: { label: 'Clear Filters', variant: 'secondary' as const },
        };
      
      case 'no-data':
      default:
        return {
          icon: InboxIcon,
          defaultTitle: 'No Data Available',
          defaultDescription: 'There\'s nothing to show here right now. Check back later or try refreshing the page.',
          suggestedAction: null,
        };
    }
  };

  const variantConfig = getVariantConfig();
  const IconComponent = icon || variantConfig.icon;

  const sizeClasses = {
    sm: 'py-6',
    md: 'py-12',
    lg: 'py-16',
  };

  const iconSizes = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-20 h-20',
  };

  const titleSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl',
  };

  return (
    <div className={`text-center ${sizeClasses[size]} ${className}`}>
      {/* Icon */}
      <IconComponent className={`${iconSizes[size]} text-tertiary mx-auto mb-6`} />
      
      {/* Title */}
      <ComponentTitle className={`text-primary mb-3 ${titleSizes[size]}`}>
        {title}
      </ComponentTitle>
      
      {/* Description */}
      <ComponentSubtitle className="text-secondary mb-8 max-w-md mx-auto">
        {description}
      </ComponentSubtitle>
      
      {/* Actions */}
      <div className="flex items-center justify-center gap-3">
        {action && (
          <Button 
            variant={action.variant || 'primary'}
            onClick={action.onClick}
            size={size}
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            {action.label}
          </Button>
        )}
        
        {secondaryAction && (
          <Button 
            variant={secondaryAction.variant || 'secondary'}
            onClick={secondaryAction.onClick}
            size={size}
          >
            {secondaryAction.label}
          </Button>
        )}
        
        {/* Show suggested action from variant if no custom action provided */}
        {!action && !secondaryAction && variantConfig.suggestedAction && (
          <Button 
            variant={variantConfig.suggestedAction.variant}
            onClick={() => {
              console.log(`Suggested action: ${variantConfig.suggestedAction?.label}`);
            }}
            size={size}
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            {variantConfig.suggestedAction.label}
          </Button>
        )}
      </div>
    </div>
  );
};

export default EmptyState;