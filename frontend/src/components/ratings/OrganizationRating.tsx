import React, { useState, useEffect } from 'react';
import { StarIcon } from '@heroicons/react/24/solid';
import { StarIcon as StarOutlineIcon } from '@heroicons/react/24/outline';
import { Button, Textarea, Paper } from '../ui';
import { useAuth } from '../../contexts/AuthContext';

interface OrganizationRatingProps {
  organizationId: string;
  currentRating?: number;
  currentReview?: string;
  onRatingSubmit: (rating: number, review?: string) => void;
  onRatingUpdate?: (rating: number, review?: string) => void;
  onRatingDelete?: () => void;
  isSubmitting?: boolean;
}

const OrganizationRating: React.FC<OrganizationRatingProps> = ({
  currentRating = 0,
  currentReview = '',
  onRatingSubmit,
  onRatingUpdate,
  onRatingDelete,
  isSubmitting = false,
}) => {
  const { user } = useAuth();
  const [rating, setRating] = useState(currentRating);
  const [review, setReview] = useState(currentReview);
  const [hoveredRating, setHoveredRating] = useState(0);

  useEffect(() => {
    setRating(currentRating);
    setReview(currentReview);
  }, [currentRating, currentReview]);

  const handleRatingClick = (selectedRating: number) => {
    setRating(selectedRating);
  };

  const handleSubmit = () => {
    if (rating > 0) {
      if (currentRating > 0) {
        onRatingUpdate?.(rating, review);
      } else {
        onRatingSubmit(rating, review);
      }
    }
  };

  const handleCancel = () => {
    setRating(currentRating);
    setReview(currentReview);
  };

  const handleDelete = () => {
    if (onRatingDelete) {
      onRatingDelete();
      setRating(0);
      setReview('');
    }
  };

  if (!user) {
    return (
      <Paper variant='glass' size='md'>
        <div className='text-center py-6'>
          <StarOutlineIcon className='w-12 h-12 text-primary/40 mx-auto mb-3' />
          <h3 className='text-lg font-semibold text-primary mb-2'>
            Rate This Organization
          </h3>
          <p className='text-primary/60 mb-4'>
            Please log in to rate this organization
          </p>
        </div>
      </Paper>
    );
  }

  return (
    <Paper variant='glass' size='md'>
      <div className='p-6'>
        <h3 className='text-lg font-semibold text-primary mb-4'>
          {currentRating > 0 ? 'Your Rating' : 'Rate This Organization'}
        </h3>

        {/* Star Rating */}
        <div className='flex items-center justify-center mb-4'>
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              type='button'
              onClick={() => handleRatingClick(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              className='p-1 transition-transform hover:scale-110'
              disabled={isSubmitting}
            >
              {star <= (hoveredRating || rating) ? (
                <StarIcon className='w-8 h-8 text-yellow-400' />
              ) : (
                <StarOutlineIcon className='w-8 h-8 text-primary/40' />
              )}
            </button>
          ))}
        </div>

        {/* Rating Text */}
        <div className='text-center mb-4'>
          <span className='text-primary/80'>
            {rating === 0 && 'Click to rate'}
            {rating === 1 && 'Poor'}
            {rating === 2 && 'Fair'}
            {rating === 3 && 'Good'}
            {rating === 4 && 'Very Good'}
            {rating === 5 && 'Excellent'}
          </span>
        </div>

        {/* Review Textarea */}
        {rating > 0 && (
          <div className='mb-4'>
            <Textarea
              placeholder='Write a review (optional)...'
              value={review}
              onChange={setReview}
              className='w-full'
              rows={3}
              disabled={isSubmitting}
            />
          </div>
        )}

        {/* Action Buttons */}
        {rating > 0 && (
          <div className='flex space-x-3'>
            {currentRating > 0 ? (
              // Update existing rating
              <>
                <Button
                  variant='primary'
                  onClick={handleSubmit}
                  disabled={
                    isSubmitting ||
                    (rating === currentRating && review === currentReview)
                  }
                  className='flex-1'
                >
                  {isSubmitting ? 'Updating...' : 'Update Rating'}
                </Button>
                <Button
                  variant='outline'
                  onClick={handleCancel}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                {onRatingDelete && (
                  <Button
                    variant='outline'
                    onClick={handleDelete}
                    disabled={isSubmitting}
                    className='text-red-400 hover:text-red-300'
                  >
                    Delete
                  </Button>
                )}
              </>
            ) : (
              // Submit new rating
              <>
                <Button
                  variant='primary'
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className='flex-1'
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Rating'}
                </Button>
                <Button
                  variant='outline'
                  onClick={handleCancel}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </Paper>
  );
};

export default OrganizationRating;
