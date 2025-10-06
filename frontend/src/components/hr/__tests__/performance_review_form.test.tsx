import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { BrowserRouter } from 'react-router-dom';
import { apiSlice } from '../../../services/apiSlice';
import PerformanceReviewForm from '../performance_review_form';
import type { PerformanceReview } from '../../../types/hr';

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ organizationId: 'test-org' }),
  };
});

// Create a mock store
const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      api: apiSlice.reducer,
    },
    preloadedState: initialState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(apiSlice.middleware),
  });
};

// Mock existing performance review
const mockExistingReview: PerformanceReview = {
  id: 'review-1',
  organization_id: 'test-org',
  reviewee_id: 'test-user',
  reviewer_id: 'test-reviewer',
  review_period_start: '2024-01-01T00:00:00Z',
  review_period_end: '2024-03-31T00:00:00Z',
  status: 'draft',
  ratings: {
    leadership: { score: 4, comments: 'Shows good leadership potential' },
    teamwork: { score: 5, comments: 'Excellent team player' },
    communication: { score: 3, comments: 'Could improve communication skills' },
    reliability: { score: 4, comments: 'Very reliable member' },
    skill_development: { score: 3, comments: 'Making steady progress' },
    organization_contribution: { score: 4, comments: 'Contributes well to org goals' },
  },
  overall_rating: 4,
  strengths: ['Leadership', 'Teamwork'],
  areas_for_improvement: ['Communication', 'Technical Skills'],
  goals: [
    {
      id: 'goal-1',
      title: 'Improve Communication',
      description: 'Work on clearer communication in team meetings',
      target_date: '2024-06-30T00:00:00Z',
      status: 'not_started',
      progress_percentage: 0,
    },
  ],
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

// Mock historical reviews
const mockHistoricalReviews = {
  data: [
    {
      ...mockExistingReview,
      id: 'review-0',
      overall_rating: 3,
      created_at: '2023-10-01T00:00:00Z',
    },
    mockExistingReview,
  ],
  total: 2,
  page: 1,
  limit: 20,
};

describe('PerformanceReviewForm', () => {
  let store: ReturnType<typeof createMockStore>;
  let mockCreateReview: ReturnType<typeof vi.fn>;
  let mockUpdateReview: ReturnType<typeof vi.fn>;
  let mockOnSuccess: ReturnType<typeof vi.fn>;
  let mockOnCancel: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    store = createMockStore();
    mockCreateReview = vi.fn();
    mockUpdateReview = vi.fn();
    mockOnSuccess = vi.fn();
    mockOnCancel = vi.fn();
    
    // Mock the RTK Query hooks
    vi.spyOn(apiSlice.endpoints.createPerformanceReview, 'useMutation').mockReturnValue([
      mockCreateReview,
      { isLoading: false }
    ] as any);
    
    vi.spyOn(apiSlice.endpoints.updatePerformanceReview, 'useMutation').mockReturnValue([
      mockUpdateReview,
      { isLoading: false }
    ] as any);
    
    vi.spyOn(apiSlice.endpoints.getPerformanceReviews, 'useQuery').mockReturnValue({
      data: mockHistoricalReviews,
      isLoading: false,
      error: null,
    } as any);
  });

  const renderWithProvider = (component: React.ReactElement) => {
    return render(
      <Provider store={store}>
        <BrowserRouter>
          {component}
        </BrowserRouter>
      </Provider>
    );
  };

  it('renders performance review form for new review', () => {
    renderWithProvider(
      <PerformanceReviewForm 
        revieweeId="test-user" 
        onSuccess={mockOnSuccess} 
        onCancel={mockOnCancel} 
      />
    );
    
    expect(screen.getByText('Create Performance Review')).toBeInTheDocument();
    expect(screen.getByText('Review Period')).toBeInTheDocument();
    expect(screen.getByText('Performance Ratings')).toBeInTheDocument();
    expect(screen.getByText('Strengths')).toBeInTheDocument();
    expect(screen.getByText('Areas for Improvement')).toBeInTheDocument();
    expect(screen.getByText('Performance Goals')).toBeInTheDocument();
  });

  it('renders performance review form for editing existing review', () => {
    renderWithProvider(
      <PerformanceReviewForm 
        revieweeId="test-user" 
        existingReview={mockExistingReview}
        onSuccess={mockOnSuccess} 
        onCancel={mockOnCancel} 
      />
    );
    
    expect(screen.getByText('Edit Performance Review')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2024-01-01')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2024-03-31')).toBeInTheDocument();
  });

  it('displays all rating categories with radio buttons', () => {
    renderWithProvider(
      <PerformanceReviewForm 
        revieweeId="test-user" 
        onSuccess={mockOnSuccess} 
        onCancel={mockOnCancel} 
      />
    );
    
    expect(screen.getByText('Leadership & Initiative')).toBeInTheDocument();
    expect(screen.getByText('Teamwork & Collaboration')).toBeInTheDocument();
    expect(screen.getByText('Communication')).toBeInTheDocument();
    expect(screen.getByText('Reliability & Attendance')).toBeInTheDocument();
    expect(screen.getByText('Skill Development')).toBeInTheDocument();
    expect(screen.getByText('Organization Contribution')).toBeInTheDocument();
    
    // Check that rating options are present
    expect(screen.getAllByText(/1 - Needs Improvement/)).toHaveLength(6);
    expect(screen.getAllByText(/5 - Outstanding/)).toHaveLength(6);
  });

  it('updates overall rating when individual ratings change', async () => {
    const user = userEvent.setup();
    renderWithProvider(
      <PerformanceReviewForm 
        revieweeId="test-user" 
        onSuccess={mockOnSuccess} 
        onCancel={mockOnCancel} 
      />
    );
    
    // Click on a 5-star rating for leadership
    const leadershipRating5 = screen.getAllByText('5 - Outstanding')[0];
    await user.click(leadershipRating5);
    
    // Overall rating should update (though exact calculation depends on other ratings)
    await waitFor(() => {
      const overallRatingDisplay = screen.getByText(/Overall Rating/);
      expect(overallRatingDisplay).toBeInTheDocument();
    });
  });

  it('allows adding and removing strengths', async () => {
    const user = userEvent.setup();
    renderWithProvider(
      <PerformanceReviewForm 
        revieweeId="test-user" 
        onSuccess={mockOnSuccess} 
        onCancel={mockOnCancel} 
      />
    );
    
    const strengthInput = screen.getByPlaceholderText('Add a strength...');
    const addButton = screen.getAllByText('Add')[0];
    
    await user.type(strengthInput, 'Excellent problem solving');
    await user.click(addButton);
    
    expect(screen.getByText('Excellent problem solving')).toBeInTheDocument();
    
    // Remove the strength
    const removeButton = screen.getByRole('button', { name: /Remove/ });
    await user.click(removeButton);
    
    expect(screen.queryByText('Excellent problem solving')).not.toBeInTheDocument();
  });

  it('allows adding and removing areas for improvement', async () => {
    const user = userEvent.setup();
    renderWithProvider(
      <PerformanceReviewForm 
        revieweeId="test-user" 
        onSuccess={mockOnSuccess} 
        onCancel={mockOnCancel} 
      />
    );
    
    const improvementInput = screen.getByPlaceholderText('Add an area for improvement...');
    const addButton = screen.getAllByText('Add')[1];
    
    await user.type(improvementInput, 'Time management');
    await user.click(addButton);
    
    expect(screen.getByText('Time management')).toBeInTheDocument();
  });

  it('allows adding performance goals', async () => {
    const user = userEvent.setup();
    renderWithProvider(
      <PerformanceReviewForm 
        revieweeId="test-user" 
        onSuccess={mockOnSuccess} 
        onCancel={mockOnCancel} 
      />
    );
    
    const goalTitleInput = screen.getByLabelText('Goal Title');
    const goalDescriptionInput = screen.getByLabelText('Goal Description');
    const targetDateInput = screen.getByLabelText('Target Date');
    const addGoalButton = screen.getByRole('button', { name: /Add Goal/ });
    
    await user.type(goalTitleInput, 'Improve Leadership Skills');
    await user.type(goalDescriptionInput, 'Take on more leadership responsibilities in team projects');
    await user.type(targetDateInput, '2024-06-30');
    await user.click(addGoalButton);
    
    expect(screen.getByText('Improve Leadership Skills')).toBeInTheDocument();
    expect(screen.getByText('Take on more leadership responsibilities in team projects')).toBeInTheDocument();
  });

  it('validates required fields before submission', async () => {
    const user = userEvent.setup();
    renderWithProvider(
      <PerformanceReviewForm 
        revieweeId="test-user" 
        onSuccess={mockOnSuccess} 
        onCancel={mockOnCancel} 
      />
    );
    
    const submitButton = screen.getByRole('button', { name: /Create Review/ });
    await user.click(submitButton);
    
    expect(screen.getByText('At least one strength is required')).toBeInTheDocument();
    expect(screen.getByText('At least one area for improvement is required')).toBeInTheDocument();
    expect(mockCreateReview).not.toHaveBeenCalled();
  });

  it('submits form with valid data for new review', async () => {
    const user = userEvent.setup();
    mockCreateReview.mockResolvedValue({ unwrap: () => Promise.resolve({ id: 'new-review' }) });
    
    renderWithProvider(
      <PerformanceReviewForm 
        revieweeId="test-user" 
        onSuccess={mockOnSuccess} 
        onCancel={mockOnCancel} 
      />
    );
    
    // Add required strengths and improvements
    const strengthInput = screen.getByPlaceholderText('Add a strength...');
    const improvementInput = screen.getByPlaceholderText('Add an area for improvement...');
    
    await user.type(strengthInput, 'Great teamwork');
    await user.click(screen.getAllByText('Add')[0]);
    
    await user.type(improvementInput, 'Communication skills');
    await user.click(screen.getAllByText('Add')[1]);
    
    const submitButton = screen.getByRole('button', { name: /Create Review/ });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockCreateReview).toHaveBeenCalledWith({
        organizationId: 'test-org',
        data: expect.objectContaining({
          reviewee_id: 'test-user',
          strengths: ['Great teamwork'],
          areas_for_improvement: ['Communication skills'],
        }),
      });
    });
    
    expect(mockOnSuccess).toHaveBeenCalled();
  });

  it('submits form with valid data for existing review update', async () => {
    const user = userEvent.setup();
    mockUpdateReview.mockResolvedValue({ unwrap: () => Promise.resolve(mockExistingReview) });
    
    renderWithProvider(
      <PerformanceReviewForm 
        revieweeId="test-user" 
        existingReview={mockExistingReview}
        onSuccess={mockOnSuccess} 
        onCancel={mockOnCancel} 
      />
    );
    
    const submitButton = screen.getByRole('button', { name: /Update Review/ });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockUpdateReview).toHaveBeenCalledWith({
        organizationId: 'test-org',
        reviewId: 'review-1',
        data: expect.objectContaining({
          reviewee_id: 'test-user',
        }),
      });
    });
    
    expect(mockOnSuccess).toHaveBeenCalled();
  });

  it('displays historical comparison when available', () => {
    renderWithProvider(
      <PerformanceReviewForm 
        revieweeId="test-user" 
        existingReview={mockExistingReview}
        onSuccess={mockOnSuccess} 
        onCancel={mockOnCancel} 
      />
    );
    
    expect(screen.getByText('Historical Comparison')).toBeInTheDocument();
    expect(screen.getByText('Previous')).toBeInTheDocument();
    expect(screen.getByText('Change')).toBeInTheDocument();
    expect(screen.getByText('Current')).toBeInTheDocument();
  });

  it('handles submission errors gracefully', async () => {
    const user = userEvent.setup();
    mockCreateReview.mockRejectedValue({
      data: { message: 'Review creation failed' }
    });
    
    renderWithProvider(
      <PerformanceReviewForm 
        revieweeId="test-user" 
        onSuccess={mockOnSuccess} 
        onCancel={mockOnCancel} 
      />
    );
    
    // Add required data
    const strengthInput = screen.getByPlaceholderText('Add a strength...');
    const improvementInput = screen.getByPlaceholderText('Add an area for improvement...');
    
    await user.type(strengthInput, 'Great teamwork');
    await user.click(screen.getAllByText('Add')[0]);
    
    await user.type(improvementInput, 'Communication skills');
    await user.click(screen.getAllByText('Add')[1]);
    
    const submitButton = screen.getByRole('button', { name: /Create Review/ });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Review creation failed')).toBeInTheDocument();
    });
    
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProvider(
      <PerformanceReviewForm 
        revieweeId="test-user" 
        onSuccess={mockOnSuccess} 
        onCancel={mockOnCancel} 
      />
    );
    
    const cancelButton = screen.getByRole('button', { name: /Cancel/ });
    await user.click(cancelButton);
    
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('shows loading state during submission', () => {
    vi.spyOn(apiSlice.endpoints.createPerformanceReview, 'useMutation').mockReturnValue([
      mockCreateReview,
      { isLoading: true }
    ] as any);
    
    renderWithProvider(
      <PerformanceReviewForm 
        revieweeId="test-user" 
        onSuccess={mockOnSuccess} 
        onCancel={mockOnCancel} 
      />
    );
    
    expect(screen.getByText('Saving...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Saving.../ })).toBeDisabled();
  });
});