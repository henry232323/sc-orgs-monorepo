import React, { useState } from 'react';
import { Button } from '../ui';
import { useGetEventReviewsQuery } from '@/services/apiSlice.ts';
import { EventReviewWithUser } from '@/types';
import { StarIcon } from '@heroicons/react/24/solid';
import { StarIcon as StarIconOutline } from '@heroicons/react/24/outline';
import { UserIcon, CalendarIcon } from '@heroicons/react/24/outline';

interface EventReviewsListProps {
  eventId: string;
  eventTitle: string;
  showHeader?: boolean;
}

const EventReviewsList: React.FC<EventReviewsListProps> = ({
  eventId,
  eventTitle,
  showHeader = true,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const reviewsPerPage = 10;

  const {
    data: reviewsData,
    isLoading,
    error,
  } = useGetEventReviewsQuery({
    eventId,
    page: currentPage,
    limit: reviewsPerPage,
  });

  const reviews = reviewsData?.data || [];
  const pagination = reviewsData?.pagination;
  const totalPages = pagination
    ? Math.ceil(pagination.total / reviewsPerPage)
    : 0;

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => {
      const starNumber = index + 1;
      const isFilled = starNumber <= rating;

      return isFilled ? (
        <StarIcon key={starNumber} className='w-4 h-4 text-yellow-400' />
      ) : (
        <StarIconOutline key={starNumber} className='w-4 h-4 text-gray-400' />
      );
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const ReviewCard: React.FC<{ review: EventReviewWithUser }> = ({
    review,
  }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const shouldTruncate =
      review.review_text && review.review_text.length > 200;
    const displayText =
      shouldTruncate && !isExpanded
        ? (review.review_text || '').substring(0, 200) + '...'
        : review.review_text;

    return (
      <div className='bg-white/5 rounded-lg p-4 border border-white/10'>
        <div className='flex items-start space-x-3'>
          {/* Avatar */}
          <div className='flex-shrink-0'>
            {review.user.avatar_url && !review.is_anonymous ? (
              <img
                src={review.user.avatar_url}
                alt={review.user.username}
                className='w-10 h-10 rounded-full object-cover border border-white/10'
              />
            ) : (
              <div className='w-10 h-10 rounded-full bg-white/10 flex items-center justify-center'>
                <UserIcon className='w-5 h-5 text-gray-400' />
              </div>
            )}
          </div>

          {/* Review Content */}
          <div className='flex-1 min-w-0'>
            <div className='flex items-center space-x-2 mb-2'>
              <span className='font-medium text-white'>
                {review.is_anonymous ? 'Anonymous' : review.user.username}
              </span>
              <div className='flex items-center space-x-1'>
                {renderStars(review.rating)}
              </div>
              <span className='text-sm text-gray-400'>{review.rating}/5</span>
            </div>

            <div className='flex items-center space-x-4 text-sm text-gray-400 mb-3'>
              <div className='flex items-center space-x-1'>
                <CalendarIcon className='w-4 h-4' />
                <span>{formatDate(review.created_at)}</span>
              </div>
            </div>

            {review.review_text && (
              <div className='text-gray-300'>
                <p className='whitespace-pre-wrap'>{displayText}</p>
                {shouldTruncate && (
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className='text-blue-400 hover:text-blue-300 text-sm mt-2 focus:outline-none'
                  >
                    {isExpanded ? 'Show less' : 'Show more'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className='space-y-4'>
        {showHeader && (
          <h3 className='text-xl font-semibold text-white'>Reviews</h3>
        )}
        <div className='space-y-3'>
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className='bg-white/5 rounded-lg p-4 border border-white/10 animate-pulse'
            >
              <div className='flex items-start space-x-3'>
                <div className='w-10 h-10 rounded-full bg-white/10'></div>
                <div className='flex-1 space-y-2'>
                  <div className='h-4 bg-white/10 rounded w-1/4'></div>
                  <div className='h-3 bg-white/10 rounded w-1/6'></div>
                  <div className='h-3 bg-white/10 rounded w-3/4'></div>
                  <div className='h-3 bg-white/10 rounded w-1/2'></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='text-center py-8'>
        <p className='text-red-400 mb-4'>Failed to load reviews</p>
        <Button variant='outline' onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {showHeader && (
        <div className='flex items-center justify-between'>
          <h3 className='text-xl font-semibold text-white'>
            Reviews ({pagination?.total || 0})
          </h3>
        </div>
      )}

      {reviews.length === 0 ? (
        <div className='text-center py-8'>
          <div className='w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4'>
            <StarIconOutline className='w-8 h-8 text-gray-400' />
          </div>
          <h4 className='text-lg font-medium text-white mb-2'>
            No reviews yet
          </h4>
          <p className='text-gray-400'>Be the first to review "{eventTitle}"</p>
        </div>
      ) : (
        <div className='space-y-4'>
          {reviews.map(review => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className='flex items-center justify-center space-x-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>

          <div className='flex items-center space-x-1'>
            {Array.from({ length: Math.min(5, totalPages) }, (_, index) => {
              let pageNumber;
              if (totalPages <= 5) {
                pageNumber = index + 1;
              } else if (currentPage <= 3) {
                pageNumber = index + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNumber = totalPages - 4 + index;
              } else {
                pageNumber = currentPage - 2 + index;
              }

              return (
                <Button
                  key={pageNumber}
                  variant={currentPage === pageNumber ? 'primary' : 'outline'}
                  size='sm'
                  onClick={() => setCurrentPage(pageNumber)}
                  className='w-8 h-8 p-0'
                >
                  {pageNumber}
                </Button>
              );
            })}
          </div>

          <Button
            variant='outline'
            size='sm'
            onClick={() =>
              setCurrentPage(prev => Math.min(totalPages, prev + 1))
            }
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

export default EventReviewsList;
