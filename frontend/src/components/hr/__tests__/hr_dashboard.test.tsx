import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import { apiSlice } from '../../../services/apiSlice';
import HRDashboard from '../hr_dashboard';

// Mock the permission hook
vi.mock('../../../hooks/usePermissions', () => ({
  usePermissions: () => ({
    hasPermission: vi.fn(() => true),
  }),
}));

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

// Mock HR analytics data
const mockHRAnalytics = {
  organization_id: 'test-org',
  period_start: '2024-01-01',
  period_end: '2024-12-31',
  metrics: {
    applications: {
      total_received: 25,
      approval_rate: 0.8,
      average_processing_time_days: 3,
      conversion_rate: 0.75,
    },
    onboarding: {
      total_started: 20,
      completion_rate: 0.9,
      average_completion_time_days: 7,
      overdue_count: 2,
    },
    performance: {
      reviews_completed: 15,
      average_rating: 4.2,
      improvement_plans_active: 3,
      goals_completion_rate: 0.85,
    },
    skills: {
      total_skills_tracked: 50,
      verification_rate: 0.7,
      skill_gaps: [
        {
          skill_name: 'Pilot',
          required_count: 10,
          current_count: 7,
          gap_percentage: 30,
        },
      ],
    },
    retention: {
      member_turnover_rate: 0.1,
      average_tenure_days: 180,
      exit_reasons: {},
    },
  },
};

// Mock HR activities data
const mockHRActivities = {
  data: [
    {
      id: '1',
      organization_id: 'test-org',
      activity_type: 'application_submitted',
      user_id: 'user1',
      user_handle: 'test_user',
      title: 'New Application Received',
      description: 'test_user submitted an application for Pilot role',
      metadata: { application_id: 'app1' },
      created_at: '2024-01-01T10:00:00Z',
    },
    {
      id: '2',
      organization_id: 'test-org',
      activity_type: 'skill_verified',
      user_id: 'user2',
      user_handle: 'another_user',
      title: 'Skill Verified',
      description: 'another_user had their Engineering skill verified',
      metadata: { skill_id: 'skill1' },
      created_at: '2024-01-01T09:00:00Z',
    },
  ],
  total: 2,
  page: 1,
  limit: 5,
};

describe('HRDashboard', () => {
  let store: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    store = createMockStore();
    
    // Mock the RTK Query hooks
    vi.spyOn(apiSlice.endpoints.getHRAnalytics, 'useQuery').mockReturnValue({
      data: mockHRAnalytics,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    vi.spyOn(apiSlice.endpoints.getHRActivities, 'useQuery').mockReturnValue({
      data: mockHRActivities,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);
  });

  const renderWithProvider = (component: React.ReactElement) => {
    return render(
      <MemoryRouter>
        <Provider store={store}>
          {component}
        </Provider>
      </MemoryRouter>
    );
  };

  it('renders HR dashboard title', () => {
    renderWithProvider(<HRDashboard organizationId="test-org" />);
    
    expect(screen.getByText('HR Management')).toBeInTheDocument();
  });

  it('displays key metrics when analytics data is available', () => {
    renderWithProvider(<HRDashboard organizationId="test-org" />);
    
    expect(screen.getByText('Key Metrics')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument(); // Applications
    expect(screen.getByText('20')).toBeInTheDocument(); // Onboarding
    expect(screen.getByText('15')).toBeInTheDocument(); // Reviews
    expect(screen.getByText('50')).toBeInTheDocument(); // Skills
  });

  it('displays quick actions section', () => {
    renderWithProvider(<HRDashboard organizationId="test-org" />);
    
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
  });

  it('displays recent activity section with real data', async () => {
    renderWithProvider(<HRDashboard organizationId="test-org" />);
    
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    
    // Should display real activity data, not dummy data
    await waitFor(() => {
      expect(screen.getByText('New Application Received')).toBeInTheDocument();
      expect(screen.getByText('test_user submitted an application for Pilot role')).toBeInTheDocument();
      expect(screen.getByText('Skill Verified')).toBeInTheDocument();
      expect(screen.getByText('another_user had their Engineering skill verified')).toBeInTheDocument();
    });

    // Should NOT display dummy data
    expect(screen.queryByText('John_Doe')).not.toBeInTheDocument();
    expect(screen.queryByText('Jane_Smith')).not.toBeInTheDocument();
  });

  it('displays loading state for activities', () => {
    vi.spyOn(apiSlice.endpoints.getHRActivities, 'useQuery').mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderWithProvider(<HRDashboard organizationId="test-org" />);
    
    // Should show loading skeleton for activities
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    // Loading skeletons should be present
    const loadingElements = document.querySelectorAll('.animate-pulse');
    expect(loadingElements.length).toBeGreaterThan(0);
  });

  it('displays empty state when no activities exist', () => {
    vi.spyOn(apiSlice.endpoints.getHRActivities, 'useQuery').mockReturnValue({
      data: { data: [], total: 0, page: 1, limit: 5 },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderWithProvider(<HRDashboard organizationId="test-org" />);
    
    expect(screen.getByText('No Recent Activity')).toBeInTheDocument();
    expect(screen.getByText('HR activities will appear here as they occur in your organization.')).toBeInTheDocument();
  });

  it('displays error state for activities', () => {
    const mockRefetch = vi.fn();
    vi.spyOn(apiSlice.endpoints.getHRActivities, 'useQuery').mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { message: 'Failed to fetch activities' },
      refetch: mockRefetch,
    } as any);

    renderWithProvider(<HRDashboard organizationId="test-org" />);
    
    expect(screen.getByText('Failed to Load Activities')).toBeInTheDocument();
    expect(screen.getByText('Unable to fetch recent HR activities')).toBeInTheDocument();
    
    // Should have retry button
    const retryButton = screen.getByText('Try Again');
    expect(retryButton).toBeInTheDocument();
  });

  it('displays alerts and notifications section', () => {
    renderWithProvider(<HRDashboard organizationId="test-org" />);
    
    expect(screen.getByText('Alerts & Notifications')).toBeInTheDocument();
  });

  it('displays skill gaps analysis when data is available', () => {
    renderWithProvider(<HRDashboard organizationId="test-org" />);
    
    expect(screen.getByText('Skill Gaps Analysis')).toBeInTheDocument();
    expect(screen.getByText('Pilot')).toBeInTheDocument();
    expect(screen.getByText('7/10')).toBeInTheDocument();
  });

  it('shows loading state when analytics are loading', () => {
    vi.spyOn(apiSlice.endpoints.getHRAnalytics, 'useQuery').mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderWithProvider(<HRDashboard organizationId="test-org" />);
    
    expect(screen.getAllByText('...')).toHaveLength(8); // Loading indicators for metrics (4 metrics x 2 indicators each)
  });

  it('handles role-based permissions correctly', () => {
    renderWithProvider(<HRDashboard organizationId="test-org" />);
    
    // Should show applications action (since mock returns true for all permissions)
    expect(screen.getByText('Review Applications')).toBeInTheDocument();
  });
});