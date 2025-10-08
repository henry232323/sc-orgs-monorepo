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

  // Get status color for reviews using design system colors
  const getStatusColor = (status: PerformanceReview['status']) => {
    switch (status) {
      case 'submitted':
        return 'text-[var(--color-success)]';
      case 'acknowledged':
        return 'text-[var(--color-info)]';
      default:
        return 'text-[var(--color-warning)]';
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
        <div className='flex items-center gap-[var(--spacing-tight)]'>
          <Button
            variant='secondary'
            size='sm'
          >
            <ChartBarIcon className='w-4 h-4' />
            Analytics
          </Button>
          <Button
            variant='primary'
            size='sm'
            onClick={() => setShowCreateModal(true)}
          >
            <PlusIcon className='w-4 h-4' />
            New Review
          </Button>
        </div>
      </div>

      {/* Analytics Overview */}
      {analyticsData && (
        <div className='grid grid-cols-1 md:grid-cols-4 gap-[var(--gap-grid-md)]'>
          <Paper variant='glass' size='md' className='text-center'>
            <TrophyIcon className='w-8 h-8 text-[var(--color-accent-cyan)] mx-auto mb-[var(--spacing-tight)]' />
            <StatMedium className='mb-[var(--spacing-tight)] text-[var(--color-text-primary)]'>
              {analyticsData.reviews_completed}
            </StatMedium>
            <ComponentSubtitle className='text-[var(--color-text-tertiary)]'>
              Reviews Completed
            </ComponentSubtitle>
          </Paper>

          <Paper variant='glass' size='md' className='text-center'>
            <StarIcon className='w-8 h-8 text-[var(--color-accent-blue)] mx-auto mb-[var(--spacing-tight)]' />
            <StatMedium className='mb-[var(--spacing-tight)] text-[var(--color-text-primary)]'>
              {analyticsData.average_rating.toFixed(1)}
            </StatMedium>
            <ComponentSubtitle className='text-[var(--color-text-tertiary)]'>
              Average Rating
            </ComponentSubtitle>
          </Paper>

          <Paper variant='glass' size='md' className='text-center'>
            <ClockIcon className='w-8 h-8 text-[var(--color-accent-purple)] mx-auto mb-[var(--spacing-tight)]' />
            <StatMedium className='mb-[var(--spacing-tight)] text-[var(--color-text-primary)]'>
              {analyticsData.improvement_plans_active}
            </StatMedium>
            <ComponentSubtitle className='text-[var(--color-text-tertiary)]'>
              Active Plans
            </ComponentSubtitle>
          </Paper>

          <Paper variant='glass' size='md' className='text-center'>
            <CheckCircleIcon className='w-8 h-8 text-[var(--color-success)] mx-auto mb-[var(--spacing-tight)]' />
            <StatMedium className='mb-[var(--spacing-tight)] text-[var(--color-text-primary)]'>
              {(analyticsData.goals_completion_rate * 100).toFixed(0)}%
            </StatMedium>
            <ComponentSubtitle className='text-[var(--color-text-tertiary)]'>
              Goals Completed
            </ComponentSubtitle>
          </Paper>
        </div>
      )}

      {/* Event Participation Analytics */}
      {eventAnalytics && (
        <Paper variant='glass' size='lg'>
          <ComponentTitle className='mb-[var(--spacing-card-lg)] text-[var(--color-text-primary)]'>
            Event Participation & Performance Correlation
          </ComponentTitle>
          
          <div className='grid grid-cols-1 md:grid-cols-3 gap-[var(--gap-grid-md)] mb-[var(--spacing-component)]'>
            <Paper variant='glass-subtle' size='md' className='text-center'>
              <CalendarIcon className='w-8 h-8 text-[var(--color-accent-blue)] mx-auto mb-[var(--spacing-tight)]' />
              <StatMedium className='mb-[var(--spacing-tight)] text-[var(--color-accent-blue)]'>
                {eventAnalytics.event_participation.attendance_rate.toFixed(0)}%
              </StatMedium>
              <ComponentSubtitle className='text-[var(--color-text-tertiary)]'>
                Event Attendance Rate
              </ComponentSubtitle>
            </Paper>
            
            <Paper variant='glass-subtle' size='md' className='text-center'>
              <TrophyIcon className='w-8 h-8 text-[var(--color-success)] mx-auto mb-[var(--spacing-tight)]' />
              <StatMedium className='mb-[var(--spacing-tight)] text-[var(--color-success)]'>
                {eventAnalytics.skill_development.skill_verifications_earned}
              </StatMedium>
              <ComponentSubtitle className='text-[var(--color-text-tertiary)]'>
                Skills Verified via Events
              </ComponentSubtitle>
            </Paper>
            
            <Paper variant='glass-subtle' size='md' className='text-center'>
              <UserIcon className='w-8 h-8 text-[var(--color-accent-purple)] mx-auto mb-[var(--spacing-tight)]' />
              <StatMedium className='mb-[var(--spacing-tight)] text-[var(--color-accent-purple)]'>
                {eventAnalytics.performance_correlation.attendance_vs_performance.high_attendance_high_performance}
              </StatMedium>
              <ComponentSubtitle className='text-[var(--color-text-tertiary)]'>
                High Attendance + Performance
              </ComponentSubtitle>
            </Paper>
          </div>

          {/* Recent Event Participation */}
          {eventAnalytics.event_participation.recent_events.length > 0 && (
            <div>
              <ComponentSubtitle className='mb-[var(--spacing-element)] text-[var(--color-text-secondary)]'>
                Recent Event Participation
              </ComponentSubtitle>
              <div className='space-y-[var(--spacing-tight)]'>
                {eventAnalytics.event_participation.recent_events.slice(0, 5).map((event, index) => (
                  <Paper key={index} variant='glass-subtle' size='sm' className='flex items-center justify-between'>
                    <div className='flex items-center space-x-[var(--spacing-tight)]'>
                      <div className={`w-3 h-3 rounded-full ${
                        event.attended ? 'bg-[var(--color-success)]' : 'bg-[var(--color-error)]'
                      }`} />
                      <div>
                        <div className='text-[var(--color-text-primary)] font-medium'>{event.event_title}</div>
                        <div className='text-[var(--color-text-tertiary)] text-sm'>
                          {new Date(event.event_date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className='flex items-center space-x-[var(--spacing-tight)]'>
                      {event.performance_rating && (
                        <div className='flex items-center space-x-1'>
                          <StarIcon className='w-4 h-4 text-[var(--color-accent-cyan)]' />
                          <span className='text-[var(--color-accent-cyan)] text-sm'>{event.performance_rating}/5</span>
                        </div>
                      )}
                      <span className={`text-sm px-2 py-1 rounded-[var(--radius-chip)] ${
                        event.attended 
                          ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]' 
                          : 'bg-[var(--color-error-bg)] text-[var(--color-error)]'
                      }`}>
                        {event.attended ? 'Attended' : 'Missed'}
                      </span>
                    </div>
                  </Paper>
                ))}
              </div>
            </div>
          )}
        </Paper>
      )}

      {/* Reviews List */}
      <Paper variant='glass' size='lg'>
        <ComponentTitle className='mb-[var(--spacing-card-lg)] text-[var(--color-text-primary)]'>
          Performance Reviews
        </ComponentTitle>

        {isLoading ? (
          <div className='flex items-center justify-center py-[var(--spacing-loose)]'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-brand-primary)]'></div>
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
                    <div className='flex items-center gap-[var(--spacing-tight)] mb-[var(--spacing-tight)]'>
                      <ComponentTitle className='text-[var(--color-text-primary)]'>
                        Review #{review.id.slice(-8)}
                      </ComponentTitle>
                      <span className={`text-sm font-medium ${getStatusColor(review.status)}`}>
                        {review.status.charAt(0).toUpperCase() + review.status.slice(1)}
                      </span>
                    </div>
                    
                    <div className='grid grid-cols-1 md:grid-cols-3 gap-[var(--spacing-element)] text-sm'>
                      <div>
                        <ComponentSubtitle className='text-[var(--color-text-tertiary)] mb-[var(--spacing-tight)]'>
                          Review Period
                        </ComponentSubtitle>
                        <div className='flex items-center text-[var(--color-text-secondary)]'>
                          <CalendarIcon className='w-4 h-4 mr-1' />
                          {formatDate(review.review_period_start)} - {formatDate(review.review_period_end)}
                        </div>
                      </div>
                      
                      <div>
                        <ComponentSubtitle className='text-[var(--color-text-tertiary)] mb-[var(--spacing-tight)]'>
                          Reviewee
                        </ComponentSubtitle>
                        <div className='flex items-center text-[var(--color-text-secondary)]'>
                          <UserIcon className='w-4 h-4 mr-1' />
                          {review.reviewee_id}
                        </div>
                      </div>
                      
                      <div>
                        <ComponentSubtitle className='text-[var(--color-text-tertiary)] mb-[var(--spacing-tight)]'>
                          Overall Rating
                        </ComponentSubtitle>
                        <div className='flex items-center text-[var(--color-text-secondary)]'>
                          <StarIcon className='w-4 h-4 mr-1 text-[var(--color-accent-cyan)]' />
                          {review.overall_rating}/5
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className='flex items-center gap-[var(--spacing-tight)]'>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => {
                        setSelectedReview(review);
                        setShowViewModal(true);
                      }}
                    >
                      <EyeIcon className='w-4 h-4' />
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
                        <PencilIcon className='w-4 h-4' />
                        Edit
                      </Button>
                    )}
                  </div>
                </div>
              </Paper>
            ))}
          </div>
        ) : (
          <div className='text-center py-[var(--spacing-loose)]'>
            <TrophyIcon className='w-16 h-16 text-[var(--color-text-tertiary)] mx-auto mb-[var(--spacing-element)]' />
            <ComponentTitle className='text-[var(--color-text-primary)] mb-[var(--spacing-tight)]'>
              No Performance Reviews
            </ComponentTitle>
            <ComponentSubtitle className='text-[var(--color-text-secondary)]'>
              Start by creating your first performance review.
            </ComponentSubtitle>
          </div>
        )}

        {/* Pagination */}
        {reviewsData && reviewsData.total > reviewsData.limit && (
          <div className='flex items-center justify-between mt-[var(--spacing-card-lg)] pt-[var(--spacing-element)] border-t border-[var(--color-glass-border)]'>
            <div className='text-sm text-[var(--color-text-tertiary)]'>
              Showing {((page - 1) * reviewsData.limit) + 1} to{' '}
              {Math.min(page * reviewsData.limit, reviewsData.total)} of{' '}
              {reviewsData.total} reviews
            </div>
            <div className='flex items-center gap-[var(--spacing-tight)]'>
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
              <ComponentTitle className='mb-[var(--spacing-element)] text-[var(--color-text-primary)]'>
                Review Details
              </ComponentTitle>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-[var(--spacing-element)]'>
                <div>
                  <ComponentSubtitle className='text-[var(--color-text-tertiary)] mb-[var(--spacing-tight)]'>
                    Reviewee
                  </ComponentSubtitle>
                  <div className='text-[var(--color-text-secondary)]'>{selectedReview.reviewee_id}</div>
                </div>
                <div>
                  <ComponentSubtitle className='text-[var(--color-text-tertiary)] mb-[var(--spacing-tight)]'>
                    Status
                  </ComponentSubtitle>
                  <span className={`text-sm font-medium ${getStatusColor(selectedReview.status)}`}>
                    {selectedReview.status.charAt(0).toUpperCase() + selectedReview.status.slice(1)}
                  </span>
                </div>
                <div>
                  <ComponentSubtitle className='text-[var(--color-text-tertiary)] mb-[var(--spacing-tight)]'>
                    Review Period
                  </ComponentSubtitle>
                  <div className='text-[var(--color-text-secondary)]'>
                    {formatDate(selectedReview.review_period_start)} - {formatDate(selectedReview.review_period_end)}
                  </div>
                </div>
                <div>
                  <ComponentSubtitle className='text-[var(--color-text-tertiary)] mb-[var(--spacing-tight)]'>
                    Overall Rating
                  </ComponentSubtitle>
                  <StatSmall className='text-[var(--color-accent-blue)]'>
                    {selectedReview.overall_rating}/5
                  </StatSmall>
                </div>
              </div>
            </div>

            {/* Ratings Breakdown */}
            <div>
              <ComponentTitle className='mb-[var(--spacing-element)] text-[var(--color-text-primary)]'>
                Ratings Breakdown
              </ComponentTitle>
              <div className='space-y-[var(--spacing-element)]'>
                {Object.entries(selectedReview.ratings).map(([category, rating]) => {
                  return (
                    <Paper key={category} variant='glass-subtle' size='sm'>
                      <div className='flex items-center justify-between mb-[var(--spacing-tight)]'>
                        <ComponentSubtitle className='text-[var(--color-text-primary)]'>
                          {category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </ComponentSubtitle>
                        <StatSmall className='text-[var(--color-accent-blue)]'>
                          {rating.score}/5
                        </StatSmall>
                      </div>
                      {rating.comments && (
                        <p className='text-sm text-[var(--color-text-secondary)]'>
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
              <div className='grid grid-cols-1 md:grid-cols-2 gap-[var(--gap-grid-md)]'>
                {selectedReview.strengths.length > 0 && (
                  <div>
                    <ComponentTitle className='mb-[var(--spacing-element)] text-[var(--color-success)]'>
                      Strengths
                    </ComponentTitle>
                    <div className='space-y-[var(--spacing-tight)]'>
                      {selectedReview.strengths.map((strength, index) => (
                        <Paper key={index} variant='glass-subtle' size='sm'>
                          <p className='text-sm text-[var(--color-text-secondary)]'>{strength}</p>
                        </Paper>
                      ))}
                    </div>
                  </div>
                )}

                {selectedReview.areas_for_improvement.length > 0 && (
                  <div>
                    <ComponentTitle className='mb-[var(--spacing-element)] text-[var(--color-warning)]'>
                      Areas for Improvement
                    </ComponentTitle>
                    <div className='space-y-[var(--spacing-tight)]'>
                      {selectedReview.areas_for_improvement.map((area, index) => (
                        <Paper key={index} variant='glass-subtle' size='sm'>
                          <p className='text-sm text-[var(--color-text-secondary)]'>{area}</p>
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
                <ComponentTitle className='mb-[var(--spacing-element)] text-[var(--color-text-primary)]'>
                  Performance Goals
                </ComponentTitle>
                <div className='space-y-[var(--spacing-element)]'>
                  {selectedReview.goals.map((goal, index) => (
                    <Paper key={index} variant='glass-subtle' size='sm'>
                      <div className='flex items-center justify-between mb-[var(--spacing-tight)]'>
                        <ComponentSubtitle className='text-[var(--color-text-primary)]'>
                          {goal.title}
                        </ComponentSubtitle>
                        <span className={`text-xs px-2 py-1 rounded-[var(--radius-chip)] ${
                          goal.status === 'completed' ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]' :
                          goal.status === 'in_progress' ? 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]' :
                          goal.status === 'cancelled' ? 'bg-[var(--color-error-bg)] text-[var(--color-error)]' :
                          'bg-[var(--color-glass-bg)] text-[var(--color-text-tertiary)]'
                        }`}>
                          {goal.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className='text-sm text-[var(--color-text-secondary)] mb-[var(--spacing-tight)]'>
                        {goal.description}
                      </p>
                      <div className='flex items-center justify-between text-xs text-[var(--color-text-tertiary)]'>
                        <span>Target: {formatDate(goal.target_date)}</span>
                        <span>{goal.progress_percentage}% complete</span>
                      </div>
                    </Paper>
                  ))}
                </div>
              </div>
            )}

            {/* Close Button */}
            <div className='flex items-center justify-end pt-[var(--spacing-element)] border-t border-[var(--color-glass-border)]'>
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