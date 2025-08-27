import React, { useState } from 'react';
import { Button } from '../ui';
import { useCheckReviewEligibilityQuery } from '../../services/apiSlice';
import EventReviewModal from './EventReviewModal';
import { StarIcon, PencilIcon } from '@heroicons/react/24/outline';

interface ReviewEligibilityButtonProps {
  eventId: string;
  eventTitle: string;
  isEventPast: boolean;
  userAttended: boolean;
  className?: string;
  variant?: 'primary' | 'outline' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
}

const ReviewEligibilityButton: React.FC<ReviewEligibilityButtonProps> = ({
  eventId,
  eventTitle,
  isEventPast,
  userAttended,
  className,
  variant = 'primary',
  size = 'md',
}) => {
  const [showReviewModal, setShowReviewModal] = useState(false);

  const {
    data: eligibility,
    isLoading,
    error,
  } = useCheckReviewEligibilityQuery(
    { eventId },
    {
      skip: !isEventPast || !userAttended,
    }
  );

  const handleReviewClick = () => {
    setShowReviewModal(true);
  };

  const handleCloseModal = () => {
    setShowReviewModal(false);
  };

  // If event hasn't passed yet, don't show anything
  if (!isEventPast) {
    return null;
  }

  // If user didn't attend, show message
  if (!userAttended) {
    return (
      <div className='text-center py-4 border-t border-white/10'>
        <p className='text-gray-400 text-sm'>
          Only attendees can review this event
        </p>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Button
        variant={variant}
        size={size}
        disabled
        className={className || ''}
      >
        <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2'></div>
        Checking eligibility...
      </Button>
    );
  }

  // Error state
  if (error) {
    return (
      <Button
        variant='outline'
        size={size}
        disabled
        className={className || ''}
      >
        Unable to check review eligibility
      </Button>
    );
  }

  // No eligibility data
  if (!eligibility) {
    return null;
  }

  // User can review
  if (eligibility.can_review) {
    return (
      <>
        <Button
          variant={variant}
          size={size}
          onClick={handleReviewClick}
          className={className || ''}
        >
          <StarIcon className='w-4 h-4 mr-2' />
          Leave Review
        </Button>

        <EventReviewModal
          isOpen={showReviewModal}
          onClose={handleCloseModal}
          eventId={eventId}
          eventTitle={eventTitle}
        />
      </>
    );
  }

  // User already reviewed
  if (eligibility.already_reviewed) {
    return (
      <>
        <Button
          variant='outline'
          size={size}
          onClick={handleReviewClick}
          className={className || ''}
        >
          <PencilIcon className='w-4 h-4 mr-2' />
          Update Review
        </Button>

        <EventReviewModal
          isOpen={showReviewModal}
          onClose={handleCloseModal}
          eventId={eventId}
          eventTitle={eventTitle}
        />
      </>
    );
  }

  // Cannot review (with reason)
  if (eligibility.reason) {
    return (
      <div className='text-center py-4 border-t border-white/10'>
        <p className='text-gray-400 text-sm'>{eligibility.reason}</p>
      </div>
    );
  }

  return null;
};

export default ReviewEligibilityButton;
