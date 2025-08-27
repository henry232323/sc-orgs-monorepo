import React from 'react';
import { Paper } from '../ui';
import { useGetOrganizationRatingSummaryQuery } from '../../services/apiSlice';
import { StarIcon } from '@heroicons/react/24/solid';
import { StarIcon as StarIconOutline } from '@heroicons/react/24/outline';

interface OrganizationRatingDisplayProps {
  organizationId: string;
  organizationName: string;
  variant?: 'compact' | 'detailed';
}

const OrganizationRatingDisplay: React.FC<OrganizationRatingDisplayProps> = ({
  organizationId,
  organizationName,
  variant = 'detailed',
}) => {
  const {
    data: ratingSummary,
    isLoading,
    error,
  } = useGetOrganizationRatingSummaryQuery({ organizationId });

  const renderStars = (rating: number, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClasses = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
    };

    return Array.from({ length: 5 }, (_, index) => {
      const starNumber = index + 1;
      const isFilled = starNumber <= Math.round(rating);

      return isFilled ? (
        <StarIcon
          key={starNumber}
          className={`${sizeClasses[size]} text-yellow-400`}
        />
      ) : (
        <StarIconOutline
          key={starNumber}
          className={`${sizeClasses[size]} text-gray-400`}
        />
      );
    });
  };

  if (isLoading) {
    return (
      <div className='animate-pulse'>
        {variant === 'compact' ? (
          <div className='flex items-center space-x-2'>
            <div className='flex space-x-1'>
              {Array.from({ length: 5 }, (_, index) => (
                <div key={index} className='w-4 h-4 bg-white/10 rounded'></div>
              ))}
            </div>
            <div className='h-4 bg-white/10 rounded w-8'></div>
            <div className='h-4 bg-white/10 rounded w-16'></div>
          </div>
        ) : (
          <div className='space-y-4'>
            <div className='h-6 bg-white/10 rounded w-32'></div>
            <div className='h-4 bg-white/10 rounded w-48'></div>
          </div>
        )}
      </div>
    );
  }

  if (error || !ratingSummary) {
    return (
      <div className='text-gray-400 text-sm'>
        {variant === 'compact'
          ? 'No ratings yet'
          : 'No event ratings available'}
      </div>
    );
  }

  const { average_event_rating, total_event_reviews, rating_breakdown } =
    ratingSummary;

  if (total_event_reviews === 0) {
    return (
      <div className='text-gray-400 text-sm'>
        {variant === 'compact'
          ? 'No ratings yet'
          : 'No event ratings available'}
      </div>
    );
  }

  const getRatingText = (rating: number) => {
    if (rating >= 4.5) return 'Excellent';
    if (rating >= 3.5) return 'Very Good';
    if (rating >= 2.5) return 'Good';
    if (rating >= 1.5) return 'Fair';
    return 'Poor';
  };

  if (variant === 'compact') {
    return (
      <div className='flex items-center space-x-2'>
        <div className='flex space-x-1'>
          {renderStars(average_event_rating, 'sm')}
        </div>
        <span className='text-sm font-medium text-white'>
          {average_event_rating.toFixed(1)}
        </span>
        <span className='text-sm text-gray-400'>
          ({total_event_reviews} review{total_event_reviews !== 1 ? 's' : ''})
        </span>
      </div>
    );
  }

  return (
    <Paper variant='glass' size='lg'>
      <div className='space-y-6'>
        {/* Header */}
        <div>
          <h3 className='text-lg font-semibold text-white mb-2'>
            Event Ratings
          </h3>
          <p className='text-sm text-gray-400'>
            Based on {total_event_reviews} review
            {total_event_reviews !== 1 ? 's' : ''} from {organizationName}{' '}
            events
          </p>
        </div>

        {/* Overall Rating */}
        <div className='text-center'>
          <div className='flex justify-center space-x-1 mb-2'>
            {renderStars(average_event_rating, 'lg')}
          </div>
          <div className='text-3xl font-bold text-white mb-1'>
            {average_event_rating.toFixed(1)}
          </div>
          <div className='text-sm text-gray-400'>
            {getRatingText(average_event_rating)}
          </div>
        </div>

        {/* Rating Breakdown */}
        <div className='space-y-2'>
          <h4 className='text-sm font-medium text-white'>
            Rating Distribution
          </h4>
          {[5, 4, 3, 2, 1].map(starCount => {
            const count =
              rating_breakdown[starCount as keyof typeof rating_breakdown];
            const percentage =
              total_event_reviews > 0 ? (count / total_event_reviews) * 100 : 0;

            return (
              <div key={starCount} className='flex items-center space-x-3'>
                <div className='flex items-center space-x-1 w-16'>
                  <span className='text-sm text-gray-400 w-2'>{starCount}</span>
                  <StarIcon className='w-4 h-4 text-yellow-400' />
                </div>
                <div className='flex-1 bg-gray-700 rounded-full h-2'>
                  <div
                    className='bg-yellow-400 h-2 rounded-full transition-all duration-300'
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className='text-sm text-gray-400 w-8 text-right'>
                  {count}
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary Stats */}
        <div className='grid grid-cols-2 gap-4 pt-4 border-t border-white/10'>
          <div className='text-center'>
            <div className='text-lg font-semibold text-white'>
              {average_event_rating.toFixed(1)}
            </div>
            <div className='text-xs text-gray-400'>Average Rating</div>
          </div>
          <div className='text-center'>
            <div className='text-lg font-semibold text-white'>
              {total_event_reviews}
            </div>
            <div className='text-xs text-gray-400'>Total Reviews</div>
          </div>
        </div>
      </div>
    </Paper>
  );
};

export default OrganizationRatingDisplay;
