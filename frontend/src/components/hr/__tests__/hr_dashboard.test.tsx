import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
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

describe('HRDashboard', () => {
  let store: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    store = createMockStore();
    
    // Mock the RTK Query hook
    vi.spyOn(apiSlice.endpoints.getHRAnalytics, 'useQuery').mockReturnValue({
      data: mockHRAnalytics,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);
  });

  const renderWithProvider = (component: React.ReactElement) => {
    return render(
      <Provider store={store}>
        {component}
      </Provider>
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

  it('displays recent activity section', () => {
    renderWithProvider(<HRDashboard organizationId="test-org" />);
    
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
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
    
    expect(screen.getAllByText('...')).toHaveLength(4); // Loading indicators for metrics
  });

  it('handles role-based permissions correctly', () => {
    // Mock permissions to return false for some actions
    vi.mocked(require('../../../hooks/usePermissions').usePermissions).mockReturnValue({
      hasPermission: vi.fn((permission: string) => {
        return permission === 'HR_MANAGE_APPLICATIONS';
      }),
    });

    renderWithProvider(<HRDashboard organizationId="test-org" />);
    
    // Should show applications action but not others
    expect(screen.getByText('Review Applications')).toBeInTheDocument();
  });
});