import React, { useState } from 'react';
import {
  Button,
  Paper,
  Dialog,
  Input,
  Textarea,
  RadioGroup,
  SectionTitle,
  ComponentTitle,
  ComponentSubtitle,
  StatMedium,
  StatSmall,
} from '../ui';
import {
  useGetPerformanceReviewsQuery,
  useCreatePerformanceReviewMutation,
  useGetPerformanceAnalyticsQuery,
} from '../../services/apiSlice';
import type { PerformanceReview, CreatePerformanceReviewData } from '../../types/hr';
import {
  TrophyIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  ChartBarIcon,
  CalendarIcon,
  UserIcon,
  StarIcon,
  CheckCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

interface PerformanceCenterProps {
  organizationId: string;
}

const PerformanceCenter: React.FC<PerformanceCenterProps> = ({ organizationId }) => {
  // State for modals and forms
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState<PerformanceReview | null>(null);
  const [page, setPage] = useState(1);

  // Form state for creating/editing reviews
  const [formData, setFormData] = useState<Partial<CreatePerformanceReviewData>>({
    reviewee_id: '',
    review_period_start: '',
    review_period_end: '',
    ratings: {},
    overall_rating: 3,
    strengths: [],
    areas_for_improvement: [],
    goals: [],
  });

  // Fetch data
  const { data: reviewsData, isLoading } = useGetPerformanceReviewsQuery({
    organizationId,
    page,
    limit: 20,
  });

  const { data: analyticsData } = useGetPerformanceAnalyticsQuery({
    organizationId,
  });

  // Mutations
  const [createReview] = useCreatePerformanceReviewMutation();

  // Rating categories for performance reviews
  const ratingCategories = [
    { key: 'technical_skills', label: 'Technical Skills', description: 'Proficiency in required technical areas' },
    { key: 'communication', label: 'Communication', description: 'Verbal and written communication effectiveness' },
    { key: 'teamwork', label: 'Teamwork', description: 'Collaboration and team contribution' },
    { key: 'leadership', label: 'Leadership', description: 'Leadership abilities and initiative' },
    { key: 'reliability', label: 'Reliability', description: 'Consistency and dependability' },
    { key: 'problem_solving', label: 'Problem Solving', description: 'Analytical and creative problem-solving skills' },
  ];

  // Rating scale options
  const ratingOptions = [
    { value: 1, label: '1 - Needs Improvement', description: 'Below expectations' },
    { value: 2, label: '2 - Developing', description: 'Approaching expectations' },
    { value: 3, label: '3 - Meets Expectations', description: 'Fully meets expectations' },
    { value: 4, label: '4 - Exceeds Expectations', description: 'Consistently exceeds expectations' },
    { value: 5, label: '5 - Outstanding', description: 'Exceptional performance' },
  ];

  // Handle form submission
  const handleCreateReview = async () => {
    if (!formData.reviewee_id || !formData.review_period_start || !formData.review_period_end) {
      return;
    }

    try {
      await createReview({
        organizationId,
        data: formData as CreatePerformanceReviewData,
      }).unwrap();
      
      // Reset form and close modal
      setFormData({
        reviewee_id: '',
        review_period_start: '',
        review_period_end: '',
        ratings: {},
        overall_rating: 3,
        strengths: [],
        areas_for_improvement: [],
        goals: [],
      });
      setShowCreateModal(false);
    } catch (error) {
      console.error('Failed to create performance review:', error);
    }
  };

  // Handle rating change
  const handleRatingChange = (category: string, rating: number) => {
    setFormData(prev => ({
      ...prev,
      ratings: {
        ...prev.ratings,
        [category]: { score: rating, comments: prev.ratings?.[category]?.comments || '' },
      },
    }));
  };

  // Handle rating comment change
  const handleRatingCommentChange = (category: string, comments: string) => {
    setFormData(prev => ({
      ...prev,
      ratings: {
        ...prev.ratings,
        [category]: { score: prev.ratings?.[category]?.score || 3, comments },
      },
    }));
  };



  // Get status color for reviews
  const getStatusColor = (status: PerformanceReview['status']) => {
    switch (status) {
      case 'submitted':
        return 'text-success';
      case 'acknowledged':
        return 'text-info';
      default:
        return 'text-warning';
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Calculate overall rating from individual ratings
  const calculateOverallRating = () => {
    const ratings = Object.values(formData.ratings || {});
    if (ratings.length === 0) return 3;
    
    const sum = ratings.reduce((acc, rating) => acc + rating.score, 0);
    return Math.round(sum / ratings.length);
  };

  return (
    <div className='space-y-[var(--spacing-section)]'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <SectionTitle>Performance Center</SectionTitle>
        <div className='flex items-center gap-[var(--gap-button)]'>
          <Button
            variant='secondary'
            size='sm'
          >
            <ChartBarIcon className='w-4 h-4 mr-2' />
            Analytics
          </Button>
          <Button
            variant='primary'
            size='sm'
            onClick={() => setShowCreateModal(true)}
          >
            <PlusIcon className='w-4 h-4 mr-2' />
            New Review
          </Button>
        </div>
      </div>

      {/* Analytics Overview */}
      {analyticsData && (
        <div className='grid grid-cols-1 md:grid-cols-4 gap-[var(--gap-grid-md)]'>
          <Paper variant='glass' size='md' className='text-center'>
            <TrophyIcon className='w-8 h-8 text-tertiary mx-auto mb-3' />
            <StatMedium className='mb-1'>
              {analyticsData.reviews_completed}
            </StatMedium>
            <ComponentSubtitle className='text-tertiary'>
              Reviews Completed
            </ComponentSubtitle>
          </Paper>

          <Paper variant='glass' size='md' className='text-center'>
            <StarIcon className='w-8 h-8 text-tertiary mx-auto mb-3' />
            <StatMedium className='mb-1'>
              {analyticsData.average_rating.toFixed(1)}
            </StatMedium>
            <ComponentSubtitle className='text-tertiary'>
              Average Rating
            </ComponentSubtitle>
          </Paper>

          <Paper variant='glass' size='md' className='text-center'>
            <ClockIcon className='w-8 h-8 text-tertiary mx-auto mb-3' />
            <StatMedium className='mb-1'>
              {analyticsData.improvement_plans_active}
            </StatMedium>
            <ComponentSubtitle className='text-tertiary'>
              Active Plans
            </ComponentSubtitle>
          </Paper>

          <Paper variant='glass' size='md' className='text-center'>
            <CheckCircleIcon className='w-8 h-8 text-tertiary mx-auto mb-3' />
            <StatMedium className='mb-1'>
              {(analyticsData.goals_completion_rate * 100).toFixed(0)}%
            </StatMedium>
            <ComponentSubtitle className='text-tertiary'>
              Goals Completed
            </ComponentSubtitle>
          </Paper>
        </div>
      )}

      {/* Reviews List */}
      <Paper variant='glass' size='lg'>
        <ComponentTitle className='mb-[var(--spacing-card-lg)]'>
          Performance Reviews
        </ComponentTitle>

        {isLoading ? (
          <div className='flex items-center justify-center py-12'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
          </div>
        ) : reviewsData?.data && reviewsData.data.length > 0 ? (
          <div className='space-y-[var(--gap-grid-md)]'>
            {reviewsData.data.map((review) => (
              <Paper
                key={review.id}
                variant='glass-subtle'
                size='md'
                interactive
                className='transition-all duration-[var(--duration-normal)]'
              >
                <div className='flex items-center justify-between'>
                  <div className='flex-1'>
                    <div className='flex items-center gap-3 mb-2'>
                      <ComponentTitle className='text-primary'>
                        Review #{review.id.slice(-8)}
                      </ComponentTitle>
                      <span className={`text-sm font-medium ${getStatusColor(review.status)}`}>
                        {review.status.charAt(0).toUpperCase() + review.status.slice(1)}
                      </span>
                    </div>
                    
                    <div className='grid grid-cols-1 md:grid-cols-3 gap-4 text-sm'>
                      <div>
                        <ComponentSubtitle className='text-tertiary mb-1'>
                          Review Period
                        </ComponentSubtitle>
                        <div className='flex items-center text-secondary'>
                          <CalendarIcon className='w-4 h-4 mr-1' />
                          {formatDate(review.review_period_start)} - {formatDate(review.review_period_end)}
                        </div>
                      </div>
                      
                      <div>
                        <ComponentSubtitle className='text-tertiary mb-1'>
                          Reviewee
                        </ComponentSubtitle>
                        <div className='flex items-center text-secondary'>
                          <UserIcon className='w-4 h-4 mr-1' />
                          {review.reviewee_id}
                        </div>
                      </div>
                      
                      <div>
                        <ComponentSubtitle className='text-tertiary mb-1'>
                          Overall Rating
                        </ComponentSubtitle>
                        <div className='flex items-center text-secondary'>
                          <StarIcon className='w-4 h-4 mr-1' />
                          {review.overall_rating}/5
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className='flex items-center gap-2'>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => {
                        setSelectedReview(review);
                        setShowViewModal(true);
                      }}
                    >
                      <EyeIcon className='w-4 h-4 mr-1' />
                      View
                    </Button>
                    
                    {review.status === 'draft' && (
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => {
                          setSelectedReview(review);
                          // Set form data for editing
                          setFormData({
                            reviewee_id: review.reviewee_id,
                            review_period_start: review.review_period_start,
                            review_period_end: review.review_period_end,
                            ratings: review.ratings,
                            overall_rating: review.overall_rating,
                            strengths: review.strengths,
                            areas_for_improvement: review.areas_for_improvement,
                            goals: review.goals,
                          });
                          setShowCreateModal(true);
                        }}
                      >
                        <PencilIcon className='w-4 h-4 mr-1' />
                        Edit
                      </Button>
                    )}
                  </div>
                </div>
              </Paper>
            ))}
          </div>
        ) : (
          <div className='text-center py-12'>
            <TrophyIcon className='w-16 h-16 text-tertiary mx-auto mb-4' />
            <ComponentTitle className='text-primary mb-2'>
              No Performance Reviews
            </ComponentTitle>
            <ComponentSubtitle className='text-secondary'>
              Start by creating your first performance review.
            </ComponentSubtitle>
          </div>
        )}

        {/* Pagination */}
        {reviewsData && reviewsData.total > reviewsData.limit && (
          <div className='flex items-center justify-between mt-[var(--spacing-card-lg)] pt-4 border-t border-glass-border'>
            <div className='text-sm text-tertiary'>
              Showing {((page - 1) * reviewsData.limit) + 1} to{' '}
              {Math.min(page * reviewsData.limit, reviewsData.total)} of{' '}
              {reviewsData.total} reviews
            </div>
            <div className='flex items-center gap-2'>
              <Button
                variant='ghost'
                size='sm'
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <Button
                variant='ghost'
                size='sm'
                disabled={page * reviewsData.limit >= reviewsData.total}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Paper>

      {/* Create/Edit Review Modal */}
      <Dialog
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setSelectedReview(null);
          setFormData({
            reviewee_id: '',
            review_period_start: '',
            review_period_end: '',
            ratings: {},
            overall_rating: 3,
            strengths: [],
            areas_for_improvement: [],
            goals: [],
          });
        }}
        title={selectedReview ? 'Edit Performance Review' : 'Create Performance Review'}
        size='xl'
      >
        <div className='space-y-[var(--spacing-card-lg)] max-h-[70vh] overflow-y-auto'>
          {/* Basic Information */}
          <div>
            <ComponentTitle className='mb-4'>Basic Information</ComponentTitle>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div>
                <ComponentSubtitle className='text-tertiary mb-2'>
                  Reviewee ID
                </ComponentSubtitle>
                <Input
                  value={formData.reviewee_id || ''}
                  onChange={(value) => setFormData(prev => ({ ...prev, reviewee_id: value }))}
                  placeholder='Enter reviewee ID'
                  className='w-full'
                />
              </div>
              
              <div>
                <ComponentSubtitle className='text-tertiary mb-2'>
                  Review Period
                </ComponentSubtitle>
                <div className='grid grid-cols-2 gap-2'>
                  <input
                    type='date'
                    value={formData.review_period_start || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, review_period_start: e.target.value }))}
                    className='px-3 py-2 bg-glass border border-glass-border rounded-[var(--radius-glass-sm)] text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-transparent'
                  />
                  <input
                    type='date'
                    value={formData.review_period_end || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, review_period_end: e.target.value }))}
                    className='px-3 py-2 bg-glass border border-glass-border rounded-[var(--radius-glass-sm)] text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-transparent'
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Rating Categories */}
          <div>
            <ComponentTitle className='mb-4'>Performance Ratings</ComponentTitle>
            <div className='space-y-6'>
              {ratingCategories.map((category) => (
                <Paper key={category.key} variant='glass-subtle' size='sm'>
                  <div className='mb-3'>
                    <ComponentSubtitle className='text-primary mb-1'>
                      {category.label}
                    </ComponentSubtitle>
                    <p className='text-xs text-tertiary'>
                      {category.description}
                    </p>
                  </div>
                  
                  <RadioGroup
                    options={ratingOptions}
                    value={formData.ratings?.[category.key]?.score || 3}
                    onChange={(rating) => handleRatingChange(category.key, rating)}
                    variant='buttons'
                    size='sm'
                    className='mb-3'
                  />
                  
                  <Textarea
                    value={formData.ratings?.[category.key]?.comments || ''}
                    onChange={(comments) => handleRatingCommentChange(category.key, comments)}
                    placeholder='Add comments for this category...'
                    rows={2}
                    className='w-full'
                  />
                </Paper>
              ))}
            </div>
          </div>

          {/* Overall Rating Display */}
          <div>
            <ComponentTitle className='mb-4'>Overall Rating</ComponentTitle>
            <Paper variant='glass-subtle' size='md' className='text-center'>
              <StatMedium className='text-accent-blue mb-2'>
                {calculateOverallRating()}/5
              </StatMedium>
              <ComponentSubtitle className='text-tertiary'>
                Calculated from individual ratings
              </ComponentSubtitle>
            </Paper>
          </div>

          {/* Action Buttons */}
          <div className='flex items-center justify-end gap-[var(--gap-button)] pt-4 border-t border-glass-border'>
            <Button
              variant='ghost'
              onClick={() => {
                setShowCreateModal(false);
                setSelectedReview(null);
                setFormData({
                  reviewee_id: '',
                  review_period_start: '',
                  review_period_end: '',
                  ratings: {},
                  overall_rating: 3,
                  strengths: [],
                  areas_for_improvement: [],
                  goals: [],
                });
              }}
            >
              Cancel
            </Button>
            <Button
              variant='primary'
              onClick={handleCreateReview}
              disabled={!formData.reviewee_id || !formData.review_period_start || !formData.review_period_end}
            >
              {selectedReview ? 'Update Review' : 'Create Review'}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* View Review Modal */}
      {selectedReview && (
        <Dialog
          isOpen={showViewModal}
          onClose={() => {
            setShowViewModal(false);
            setSelectedReview(null);
          }}
          title={`Performance Review #${selectedReview.id.slice(-8)}`}
          size='lg'
        >
          <div className='space-y-[var(--spacing-card-lg)] max-h-[70vh] overflow-y-auto'>
            {/* Review Details */}
            <div>
              <ComponentTitle className='mb-4'>Review Details</ComponentTitle>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div>
                  <ComponentSubtitle className='text-tertiary mb-1'>
                    Reviewee
                  </ComponentSubtitle>
                  <div className='text-secondary'>{selectedReview.reviewee_id}</div>
                </div>
                <div>
                  <ComponentSubtitle className='text-tertiary mb-1'>
                    Status
                  </ComponentSubtitle>
                  <span className={`text-sm font-medium ${getStatusColor(selectedReview.status)}`}>
                    {selectedReview.status.charAt(0).toUpperCase() + selectedReview.status.slice(1)}
                  </span>
                </div>
                <div>
                  <ComponentSubtitle className='text-tertiary mb-1'>
                    Review Period
                  </ComponentSubtitle>
                  <div className='text-secondary'>
                    {formatDate(selectedReview.review_period_start)} - {formatDate(selectedReview.review_period_end)}
                  </div>
                </div>
                <div>
                  <ComponentSubtitle className='text-tertiary mb-1'>
                    Overall Rating
                  </ComponentSubtitle>
                  <StatSmall className='text-accent-blue'>
                    {selectedReview.overall_rating}/5
                  </StatSmall>
                </div>
              </div>
            </div>

            {/* Ratings Breakdown */}
            <div>
              <ComponentTitle className='mb-4'>Ratings Breakdown</ComponentTitle>
              <div className='space-y-4'>
                {Object.entries(selectedReview.ratings).map(([category, rating]) => {
                  const categoryInfo = ratingCategories.find(cat => cat.key === category);
                  return (
                    <Paper key={category} variant='glass-subtle' size='sm'>
                      <div className='flex items-center justify-between mb-2'>
                        <ComponentSubtitle className='text-primary'>
                          {categoryInfo?.label || category}
                        </ComponentSubtitle>
                        <StatSmall className='text-accent-blue'>
                          {rating.score}/5
                        </StatSmall>
                      </div>
                      {rating.comments && (
                        <p className='text-sm text-secondary'>
                          {rating.comments}
                        </p>
                      )}
                    </Paper>
                  );
                })}
              </div>
            </div>

            {/* Strengths and Areas for Improvement */}
            {(selectedReview.strengths.length > 0 || selectedReview.areas_for_improvement.length > 0) && (
              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                {selectedReview.strengths.length > 0 && (
                  <div>
                    <ComponentTitle className='mb-4 text-success'>
                      Strengths
                    </ComponentTitle>
                    <div className='space-y-2'>
                      {selectedReview.strengths.map((strength, index) => (
                        <Paper key={index} variant='glass-subtle' size='sm'>
                          <p className='text-sm text-secondary'>{strength}</p>
                        </Paper>
                      ))}
                    </div>
                  </div>
                )}

                {selectedReview.areas_for_improvement.length > 0 && (
                  <div>
                    <ComponentTitle className='mb-4 text-warning'>
                      Areas for Improvement
                    </ComponentTitle>
                    <div className='space-y-2'>
                      {selectedReview.areas_for_improvement.map((area, index) => (
                        <Paper key={index} variant='glass-subtle' size='sm'>
                          <p className='text-sm text-secondary'>{area}</p>
                        </Paper>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Goals */}
            {selectedReview.goals.length > 0 && (
              <div>
                <ComponentTitle className='mb-4'>Performance Goals</ComponentTitle>
                <div className='space-y-4'>
                  {selectedReview.goals.map((goal, index) => (
                    <Paper key={index} variant='glass-subtle' size='sm'>
                      <div className='flex items-center justify-between mb-2'>
                        <ComponentSubtitle className='text-primary'>
                          {goal.title}
                        </ComponentSubtitle>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          goal.status === 'completed' ? 'bg-success/20 text-success' :
                          goal.status === 'in_progress' ? 'bg-warning/20 text-warning' :
                          goal.status === 'cancelled' ? 'bg-error/20 text-error' :
                          'bg-gray-500/20 text-gray-300'
                        }`}>
                          {goal.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className='text-sm text-secondary mb-2'>
                        {goal.description}
                      </p>
                      <div className='flex items-center justify-between text-xs text-tertiary'>
                        <span>Target: {formatDate(goal.target_date)}</span>
                        <span>{goal.progress_percentage}% complete</span>
                      </div>
                    </Paper>
                  ))}
                </div>
              </div>
            )}

            {/* Close Button */}
            <div className='flex items-center justify-end pt-4 border-t border-glass-border'>
              <Button
                variant='ghost'
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedReview(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
};

export default PerformanceCenter;