import React, { useState } from 'react';
import { Dialog, Button, Textarea, ToggleSwitch } from '../ui';
import {
  useCreateEventReviewMutation,
  useUpdateEventReviewMutation,
  useGetUserEventReviewQuery,
} from '../../services/apiSlice';
import { CreateEventReviewData } from '../../types/event_review';
import { StarIcon } from '@heroicons/react/24/solid';
import { StarIcon as StarIconOutline } from '@heroicons/react/24/outline';

interface EventReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
}

const EventReviewModal: React.FC<EventReviewModalProps> = ({
  isOpen,
  onClose,
  eventId,
  eventTitle,
}) => {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  const { data: existingReview } = useGetUserEventReviewQuery(
    { eventId },
    { skip: !isOpen }
  );

  const [createReview, { isLoading: isCreating }] =
    useCreateEventReviewMutation();
  const [updateReview, { isLoading: isUpdating }] =
    useUpdateEventReviewMutation();

  const isLoading = isCreating || isUpdating;

  // Initialize form with existing review data
  React.useEffect(() => {
    if (existingReview && isOpen) {
      setRating(existingReview.rating);
      setReviewText(existingReview.review_text || '');
      setIsAnonymous(existingReview.is_anonymous);
    } else if (isOpen) {
      // Reset form for new review
      setRating(0);
      setReviewText('');
      setIsAnonymous(false);
    }
  }, [existingReview, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      return; // Rating is required
    }

    const reviewData: CreateEventReviewData = {
      rating,
      ...(reviewText.trim() && { review_text: reviewText.trim() }),
      is_anonymous: isAnonymous,
    };

    try {
      if (existingReview) {
        await updateReview({ eventId, reviewData }).unwrap();
      } else {
        await createReview({ eventId, reviewData }).unwrap();
      }
      onClose();
    } catch (error) {
      console.error('Failed to submit review:', error);
      // Error handling could be improved with toast notifications
    }
  };

  const handleClose = () => {
    onClose();
  };

  const renderStars = () => {
    return Array.from({ length: 5 }, (_, index) => {
      const starNumber = index + 1;
      const isFilled = starNumber <= (hoveredRating || rating);

      return (
        <button
          key={starNumber}
          type='button'
          className='focus:outline-none focus:ring-2 focus:ring-white/20 rounded'
          onClick={() => setRating(starNumber)}
          onMouseEnter={() => setHoveredRating(starNumber)}
          onMouseLeave={() => setHoveredRating(0)}
        >
          {isFilled ? (
            <StarIcon className='w-8 h-8 text-yellow-400' />
          ) : (
            <StarIconOutline className='w-8 h-8 text-gray-400 hover:text-yellow-300 transition-colors' />
          )}
        </button>
      );
    });
  };

  const getRatingText = () => {
    if (rating === 0) return 'Select a rating';
    if (rating === 1) return 'Poor';
    if (rating === 2) return 'Fair';
    if (rating === 3) return 'Good';
    if (rating === 4) return 'Very Good';
    if (rating === 5) return 'Excellent';
    return '';
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title={existingReview ? 'Update Your Review' : 'Leave a Review'}
    >
      <div className='w-full max-w-md'>
        <div className='text-center mb-6'>
          <h3 className='text-lg font-semibold text-white mb-2'>
            {existingReview ? 'Update Your Review' : 'Leave a Review'}
          </h3>
          <p className='text-sm text-gray-400'>
            Review: <span className='text-white font-medium'>{eventTitle}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className='space-y-6'>
          {/* Rating Section */}
          <div className='text-center'>
            <div className='flex justify-center space-x-1 mb-3'>
              {renderStars()}
            </div>
            <p className='text-sm text-gray-300'>{getRatingText()}</p>
          </div>

          {/* Review Text */}
          <div>
            <label className='block text-sm font-medium text-white mb-2'>
              Review (optional)
            </label>
            <Textarea
              value={reviewText}
              onChange={setReviewText}
              placeholder='Share your thoughts about this event...'
              rows={4}
              maxLength={1000}
              className='w-full'
            />
            <div className='text-right text-xs text-gray-400 mt-1'>
              {reviewText.length}/1000 characters
            </div>
          </div>

          {/* Anonymous Toggle */}
          <div>
            <ToggleSwitch
              checked={isAnonymous}
              onChange={() => setIsAnonymous(!isAnonymous)}
              label='Post anonymously'
              description='Your username will be hidden from other users'
            />
          </div>

          {/* Action Buttons */}
          <div className='flex space-x-3'>
            <Button
              type='button'
              variant='outline'
              onClick={handleClose}
              disabled={isLoading}
              className='flex-1'
            >
              Cancel
            </Button>
            <Button
              type='submit'
              variant='primary'
              disabled={rating === 0 || isLoading}
              className='flex-1'
            >
              {isLoading ? (
                <div className='flex items-center'>
                  <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2'></div>
                  {existingReview ? 'Updating...' : 'Submitting...'}
                </div>
              ) : existingReview ? (
                'Update Review'
              ) : (
                'Submit Review'
              )}
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  );
};

export default EventReviewModal;
