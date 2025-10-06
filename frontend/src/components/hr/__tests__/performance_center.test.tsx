import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { apiSlice } from '../../../services/apiSlice';
import PerformanceCenter from '../performance_center';

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

// Mock performance reviews data
const mockReviewsData = {
  data: [
    {
      id: 'review-1',
      organization_id: 'test-org',
      reviewee_id: 'user-1',
      reviewer_id: 'reviewer-1',
      review_period_start: '2024-01-01',
      review_period_end: '2024-03-31',
      status: 'submitted' as const,
      ratings: {
        technical_skills: { score: 4, comments: 'Good technical skills' },
        communication: { score: 5, comments: 'Excellent communication' },
      },
      overall_rating: 4.5,
      strengths: ['Technical expertise', 'Team collaboration'],
      areas_for_improvement: ['Time management'],
      goals: [
        {
          id: 'goal-1',
          title: 'Improve efficiency',
          description: 'Focus on completing tasks faster',
          target_date: '2024-06-30',
          status: 'in_progress' as const,
          progress_percentage: 60,
        },
      ],
      created_at: '2024-04-01T00:00:00Z',
      updated_at: '2024-04-01T00:00:00Z',
    },
  ],
  total: 1,
  page: 1,
  limit: 20,
};

// Mock analytics data
const mockAnalyticsData = {
  reviews_completed: 15,
  average_rating: 4.2,
  improvement_plans_active: 3,
  goals_completion_rate: 0.85,
};

describe('PerformanceCenter', () => {
  let store: ReturnType<typeof createMockStore>;
  let mockCreateReview: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    store = createMockStore();
    mockCreateReview = vi.fn().mockResolvedValue({ unwrap: () => Promise.resolve() });
    
    // Mock the RTK Query hooks
    vi.spyOn(apiSlice.endpoints.getPerformanceReviews, 'useQuery').mockReturnValue({
      data: mockReviewsData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    vi.spyOn(apiSlice.endpoints.getPerformanceAnalytics, 'useQuery').mockReturnValue({
      data: mockAnalyticsData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    vi.spyOn(apiSlice.endpoints.createPerformanceReview, 'useMutation').mockReturnValue([
      mockCreateReview,
      { isLoading: false },
    ] as any);
  });

  const renderWithProvider = (component: React.ReactElement) => {
    return render(
      <Provider store={store}>
        {component}
      </Provider>
    );
  };

  it('renders performance center title', () => {
    renderWithProvider(<PerformanceCenter organizationId="test-org" />);
    
    expect(screen.getByText('Performance Center')).toBeInTheDocument();
  });

  it('displays analytics overview', () => {
    renderWithProvider(<PerformanceCenter organizationId="test-org" />);
    
    expect(screen.getByText('15')).toBeInTheDocument(); // Reviews completed
    expect(screen.getByText('4.2')).toBeInTheDocument(); // Average rating
    expect(screen.getByText('3')).toBeInTheDocument(); // Active plans
    expect(screen.getByText('85%')).toBeInTheDocument(); // Goals completed
  });

  it('displays performance reviews list', () => {
    renderWithProvider(<PerformanceCenter organizationId="test-org" />);
    
    expect(screen.getByText('Performance Reviews')).toBeInTheDocument();
    expect(screen.getByText('Review #review-1')).toBeInTheDocument();
    expect(screen.getByText('Submitted')).toBeInTheDocument();
  });

  it('opens create review modal when new review button is clicked', () => {
    renderWithProvider(<PerformanceCenter organizationId="test-org" />);
    
    fireEvent.click(screen.getByText('New Review'));
    
    expect(screen.getByText('Create Performance Review')).toBeInTheDocument();
    expect(screen.getByText('Basic Information')).toBeInTheDocument();
  });

  it('opens view review modal when view button is clicked', () => {
    renderWithProvider(<PerformanceCenter organizationId="test-org" />);
    
    fireEvent.click(screen.getByText('View'));
    
    expect(screen.getByText('Performance Review #review-1')).toBeInTheDocument();
    expect(screen.getByText('Review Details')).toBeInTheDocument();
  });

  it('displays review ratings in view modal', () => {
    renderWithProvider(<PerformanceCenter organizationId="test-org" />);
    
    fireEvent.click(screen.getByText('View'));
    
    expect(screen.getByText('Ratings Breakdown')).toBeInTheDocument();
    expect(screen.getByText('Good technical skills')).toBeInTheDocument();
    expect(screen.getByText('Excellent communication')).toBeInTheDocument();
  });

  it('displays strengths and areas for improvement', () => {
    renderWithProvider(<PerformanceCenter organizationId="test-org" />);
    
    fireEvent.click(screen.getByText('View'));
    
    expect(screen.getByText('Strengths')).toBeInTheDocument();
    expect(screen.getByText('Technical expertise')).toBeInTheDocument();
    expect(screen.getByText('Areas for Improvement')).toBeInTheDocument();
    expect(screen.getByText('Time management')).toBeInTheDocument();
  });

  it('displays performance goals', () => {
    renderWithProvider(<PerformanceCenter organizationId="test-org" />);
    
    fireEvent.click(screen.getByText('View'));
    
    expect(screen.getByText('Performance Goals')).toBeInTheDocument();
    expect(screen.getByText('Improve efficiency')).toBeInTheDocument();
    expect(screen.getByText('60% complete')).toBeInTheDocument();
  });

  it('handles form validation in create modal', async () => {
    renderWithProvider(<PerformanceCenter organizationId="test-org" />);
    
    fireEvent.click(screen.getByText('New Review'));
    
    // Try to submit without required fields
    const createButton = screen.getByText('Create Review');
    expect(createButton).toBeDisabled();
  });

  it('calculates overall rating from individual ratings', () => {
    renderWithProvider(<PerformanceCenter organizationId="test-org" />);
    
    fireEvent.click(screen.getByText('New Review'));
    
    expect(screen.getByText('Overall Rating')).toBeInTheDocument();
    expect(screen.getByText('3/5')).toBeInTheDocument(); // Default calculated rating
  });

  it('shows loading state', () => {
    vi.spyOn(apiSlice.endpoints.getPerformanceReviews, 'useQuery').mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderWithProvider(<PerformanceCenter organizationId="test-org" />);
    
    expect(screen.getByRole('status')).toBeInTheDocument(); // Loading spinner
  });

  it('shows empty state when no reviews', () => {
    vi.spyOn(apiSlice.endpoints.getPerformanceReviews, 'useQuery').mockReturnValue({
      data: { data: [], total: 0, page: 1, limit: 20 },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderWithProvider(<PerformanceCenter organizationId="test-org" />);
    
    expect(screen.getByText('No Performance Reviews')).toBeInTheDocument();
  });

  it('handles pagination', () => {
    const mockDataWithPagination = {
      ...mockReviewsData,
      total: 50,
    };

    vi.spyOn(apiSlice.endpoints.getPerformanceReviews, 'useQuery').mockReturnValue({
      data: mockDataWithPagination,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderWithProvider(<PerformanceCenter organizationId="test-org" />);
    
    expect(screen.getByText('Showing 1 to 1 of 50 reviews')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
  });
});