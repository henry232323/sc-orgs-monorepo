import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { apiSlice } from '../../../services/apiSlice';
import ApplicationsPage from '../ApplicationsPage';

// Mock the permission hook
vi.mock('../../../hooks/usePermissions', () => ({
  usePermissions: () => ({
    hasPermission: vi.fn(() => true),
  }),
}));

// Mock react-router-dom params
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ spectrumId: 'test-org' }),
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

// Mock organization data
const mockOrganization = {
  rsi_org_id: 'test-org',
  name: 'Test Organization',
  description: 'A test organization',
  owner_handle: 'testuser',
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
};

describe('ApplicationsPage', () => {
  let store: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    store = createMockStore();
    
    // Mock the RTK Query hooks
    vi.spyOn(apiSlice.endpoints.getOrganization, 'useQuery').mockReturnValue({
      data: mockOrganization,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    vi.spyOn(apiSlice.endpoints.getApplications, 'useQuery').mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <Provider store={store}>
        <BrowserRouter>
          {component}
        </BrowserRouter>
      </Provider>
    );
  };

  it('renders applications page with organization context', () => {
    renderWithProviders(<ApplicationsPage />);
    
    expect(screen.getByText('Application Tracking')).toBeInTheDocument();
    expect(screen.getByText('Manage job applications for Test Organization')).toBeInTheDocument();
  });

  it('displays HR navigation tabs', () => {
    renderWithProviders(<ApplicationsPage />);
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Applications')).toBeInTheDocument();
    expect(screen.getByText('Performance')).toBeInTheDocument();
    expect(screen.getByText('Skills')).toBeInTheDocument();
    expect(screen.getByText('Documents')).toBeInTheDocument();
  });

  it('displays breadcrumb navigation', () => {
    renderWithProviders(<ApplicationsPage />);
    
    expect(screen.getByText('Test Organization')).toBeInTheDocument();
    expect(screen.getByText('HR')).toBeInTheDocument();
    expect(screen.getByText('Applications')).toBeInTheDocument();
  });

  it('displays header actions with navigation links', () => {
    renderWithProviders(<ApplicationsPage />);
    
    expect(screen.getByText('HR Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Organization')).toBeInTheDocument();
  });

  it('renders application tracker component', () => {
    renderWithProviders(<ApplicationsPage />);
    
    expect(screen.getByText('Application Pipeline')).toBeInTheDocument();
  });

  it('maintains proper URL structure for organization context', () => {
    renderWithProviders(<ApplicationsPage />);
    
    // Check breadcrumb links maintain organization context
    const orgLink = screen.getByRole('link', { name: 'Test Organization' });
    expect(orgLink).toHaveAttribute('href', '/organizations/test-org');
    
    const hrLink = screen.getByRole('link', { name: 'HR' });
    expect(hrLink).toHaveAttribute('href', '/organizations/test-org/hr/dashboard');
  });

  it('shows error state when organization is not found', () => {
    vi.spyOn(apiSlice.endpoints.getOrganization, 'useQuery').mockReturnValue({
      data: null,
      isLoading: false,
      error: { status: 404 },
      refetch: vi.fn(),
    } as any);

    renderWithProviders(<ApplicationsPage />);
    
    expect(screen.getByText('Application Tracking')).toBeInTheDocument();
    expect(screen.getByText('Organization not found or you do not have access to this HR system.')).toBeInTheDocument();
  });
});