import React, { useState } from 'react';
import {
  Button,
  Paper,
  Dialog,
  SectionTitle,
  ComponentTitle,
  ComponentSubtitle,
  StatMedium,
  StatSmall,
} from '../ui';
import {
  useGetPerformanceReviewsQuery,
  useGetPerformanceAnalyticsQuery,
  useGetHREventAnalyticsQuery,
} from '../../services/apiSlice';
import PerformanceReviewForm from './performance_review_form';
import type { PerformanceReview } from '../../types/hr';
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

  // Fetch data
  const { data: reviewsData, isLoading } = useGetPerformanceReviewsQuery({
    organizationId,
    page,
    limit: 20,
  });

  const { data: analyticsData } = useGetPerformanceAnalyticsQuery({
    organizationId,
  });

  // Get HR event analytics for performance correlation
  const { data: eventAnalytics } = useGetHREventAnalyticsQuery({
    organizationId,
    startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // Last 90 days
    endDate: new Date().toISOString(),
  });

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

      {/* Event Participation Analytics */}
      {eventAnalytics && (
        <Paper variant='glass' size='lg'>
          <ComponentTitle className='mb-[var(--spacing-card-lg)]'>
            Event Participation & Performance Correlation
          </ComponentTitle>
          
          <div className='grid grid-cols-1 md:grid-cols-3 gap-[var(--gap-grid-md)] mb-6'>
            <Paper variant='glass-subtle' size='md' className='text-center'>
              <CalendarIcon className='w-8 h-8 text-blue-400 mx-auto mb-3' />
              <StatMedium className='mb-1 text-blue-300'>
                {eventAnalytics.event_participation.attendance_rate.toFixed(0)}%
              </StatMedium>
              <ComponentSubtitle className='text-tertiary'>
                Event Attendance Rate
              </ComponentSubtitle>
            </Paper>
            
            <Paper variant='glass-subtle' size='md' className='text-center'>
              <TrophyIcon className='w-8 h-8 text-green-400 mx-auto mb-3' />
              <StatMedium className='mb-1 text-green-300'>
                {eventAnalytics.skill_development.skill_verifications_earned}
              </StatMedium>
              <ComponentSubtitle className='text-tertiary'>
                Skills Verified via Events
              </ComponentSubtitle>
            </Paper>
            
            <Paper variant='glass-subtle' size='md' className='text-center'>
              <UserIcon className='w-8 h-8 text-purple-400 mx-auto mb-3' />
              <StatMedium className='mb-1 text-purple-300'>
                {eventAnalytics.performance_correlation.attendance_vs_performance.high_attendance_high_performance}
              </StatMedium>
              <ComponentSubtitle className='text-tertiary'>
                High Attendance + Performance
              </ComponentSubtitle>
            </Paper>
          </div>

          {/* Recent Event Participation */}
          {eventAnalytics.event_participation.recent_events.length > 0 && (
            <div>
              <ComponentSubtitle className='mb-4'>Recent Event Participation</ComponentSubtitle>
              <div className='space-y-3'>
                {eventAnalytics.event_participation.recent_events.slice(0, 5).map((event, index) => (
                  <div key={index} className='flex items-center justify-between p-3 bg-white/5 rounded-lg'>
                    <div className='flex items-center space-x-3'>
                      <div className={`w-3 h-3 rounded-full ${event.attended ? 'bg-green-400' : 'bg-red-400'}`} />
                      <div>
                        <div className='text-white font-medium'>{event.event_title}</div>
                        <div className='text-white/60 text-sm'>
                          {new Date(event.event_date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className='flex items-center space-x-2'>
                      {event.performance_rating && (
                        <div className='flex items-center space-x-1'>
                          <StarIcon className='w-4 h-4 text-yellow-400' />
                          <span className='text-yellow-300 text-sm'>{event.performance_rating}/5</span>
                        </div>
                      )}
                      <span className={`text-sm px-2 py-1 rounded ${
                        event.attended ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                      }`}>
                        {event.attended ? 'Attended' : 'Missed'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Paper>
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
        }}
        title={selectedReview ? 'Edit Performance Review' : 'Create Performance Review'}
        size='xl'
      >
        <PerformanceReviewForm
          {...(selectedReview && { existingReview: selectedReview })}
          onSuccess={(_review) => {
            setShowCreateModal(false);
            setSelectedReview(null);
            // Refresh the reviews list
          }}
          onCancel={() => {
            setShowCreateModal(false);
            setSelectedReview(null);
          }}
        />
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
                  return (
                    <Paper key={category} variant='glass-subtle' size='sm'>
                      <div className='flex items-center justify-between mb-2'>
                        <ComponentSubtitle className='text-primary'>
                          {category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
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