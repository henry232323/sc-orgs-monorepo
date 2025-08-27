import React, { useState } from 'react';
import { HandThumbUpIcon as ThumbUpOutlineIcon } from '@heroicons/react/24/outline';
import { HandThumbUpIcon as ThumbUpSolidIcon } from '@heroicons/react/24/solid';
import {
  useUpvoteOrganizationMutation,
  useRemoveUpvoteMutation,
  useGetUpvoteStatusQuery,
} from '../../services/apiSlice';
import Button from './Button';

interface UpvoteButtonProps {
  spectrumId: string;
  showCount?: boolean;
  currentUpvotes?: number;
  variant?: 'default' | 'compact';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const UpvoteButton: React.FC<UpvoteButtonProps> = ({
  spectrumId,
  showCount = true,
  currentUpvotes = 0,
  variant = 'default',
  size = 'md',
  className = '',
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Get upvote status
  const { data: upvoteStatus, isLoading: isLoadingStatus } =
    useGetUpvoteStatusQuery(spectrumId);

  // Debug logging
  React.useEffect(() => {
    console.log('UpvoteButton props:', {
      spectrumId,
      showCount,
      currentUpvotes,
      variant,
      size,
    });
    console.log('UpvoteButton status:', {
      upvoteStatus,
      isLoadingStatus,
      hasUpvoted: upvoteStatus?.data?.hasUpvoted,
      canUpvote: upvoteStatus?.data?.canUpvote,
    });
  }, [spectrumId, upvoteStatus, isLoadingStatus]);

  // Mutations
  const [upvoteOrganization, { isLoading: isUpvoting }] =
    useUpvoteOrganizationMutation();
  const [removeUpvote, { isLoading: isRemoving }] = useRemoveUpvoteMutation();

  const isLoading = isLoadingStatus || isUpvoting || isRemoving;
  const hasUpvoted = upvoteStatus?.data?.hasUpvoted || false;
  const canUpvote = upvoteStatus?.data?.canUpvote ?? true;
  const nextUpvoteDate = upvoteStatus?.data?.nextUpvoteDate;

  const handleUpvote = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    console.log('UpvoteButton clicked:', {
      spectrumId,
      hasUpvoted,
      canUpvote,
      isLoading,
      upvoteStatus: upvoteStatus?.data,
    });

    try {
      if (hasUpvoted) {
        console.log('Removing upvote...');
        const result = await removeUpvote(spectrumId).unwrap();
        console.log('Remove upvote result:', result);
      } else {
        console.log('Adding upvote...');
        const result = await upvoteOrganization(spectrumId).unwrap();
        console.log('Add upvote result:', result);
      }

      // RTK Query will automatically update the UI via cache invalidation
    } catch (error: any) {
      console.error('Upvote error:', error);
      // You could add toast notification here
    }
  };

  const getTooltipText = () => {
    if (hasUpvoted) {
      return 'Remove upvote';
    }
    if (!canUpvote && nextUpvoteDate) {
      return `Can upvote again on ${nextUpvoteDate}`;
    }
    return 'Upvote this organization';
  };

  const isCompact = variant === 'compact';

  if (isCompact) {
    return (
      <button
        onClick={handleUpvote}
        disabled={isLoading || (!hasUpvoted && !canUpvote)}
        className={`
          group flex items-center space-x-1 px-2 py-1 
          glass-button
          ${
            hasUpvoted
              ? '!bg-green-500/20 !border-green-500/30 !text-green-400 hover:!bg-green-500/30'
              : canUpvote
                ? 'text-primary hover:!text-green-400'
                : 'opacity-50 cursor-not-allowed hover:scale-100 active:scale-100'
          }
          ${isLoading ? 'opacity-50' : ''}
          ${className}
        `}
        title={getTooltipText()}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {isLoading ? (
          <div className='w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin' />
        ) : hasUpvoted || (isHovered && canUpvote) ? (
          <ThumbUpSolidIcon className='w-4 h-4' />
        ) : (
          <ThumbUpOutlineIcon className='w-4 h-4' />
        )}
        {showCount && (
          <span className='text-sm font-medium'>{currentUpvotes}</span>
        )}
      </button>
    );
  }

  return (
    <Button
      variant='glass'
      size={size}
      onClick={() => handleUpvote()}
      disabled={isLoading || (!hasUpvoted && !canUpvote)}
      className={`
        group flex items-center space-x-2
        ${
          hasUpvoted
            ? '!bg-green-500/20 !border-green-500/30 !text-green-400 hover:!bg-green-500/30'
            : canUpvote
              ? 'hover:!border-green-500/50 hover:!text-green-400'
              : ''
        }
        ${className}
      `}
    >
      {isLoading ? (
        <div className='w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin' />
      ) : hasUpvoted || (isHovered && canUpvote) ? (
        <ThumbUpSolidIcon className='w-4 h-4' />
      ) : (
        <ThumbUpOutlineIcon className='w-4 h-4' />
      )}
      <span>
        {hasUpvoted ? 'Upvoted' : 'Upvote'}
        {showCount && ` (${currentUpvotes})`}
      </span>
    </Button>
  );
};

export default UpvoteButton;
