import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { apiSlice } from '../../../../services/apiSlice';
import HRBreadcrumbs from '../HRBreadcrumbs';

// Mock react-router-dom
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

describe('HRBreadcrumbs', () => {
  let store: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    store = createMockStore();
    
    // Mock the RTK Query hook
    vi.spyOn(apiSlice.endpoints.getOrganization, 'useQuery').mockReturnValue({
      data: mockOrganization,
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

  it('renders breadcrumb navigation with organization context', () => {
    renderWithProviders(<HRBreadcrumbs currentPage="Applications" />);
    
    expect(screen.getByText('Organization')).toBeInTheDocument();
    expect(screen.getByText('HR')).toBeInTheDocument();
    expect(screen.getByText('Applications')).toBeInTheDocument();
  });

  it('displays chevron separators between breadcrumb items', () => {
    renderWithProviders(<HRBreadcrumbs currentPage="Applications" />);
    
    const nav = screen.getByRole('navigation');
    const svgElements = nav.querySelectorAll('svg');
    expect(svgElements).toHaveLength(2); // Two separators
  });

  it('creates correct links for organization and HR', () => {
    renderWithProviders(<HRBreadcrumbs currentPage="Applications" />);
    
    const orgLink = screen.getByRole('link', { name: 'Organization' });
    expect(orgLink).toHaveAttribute('href', '/organizations/test-org');
    
    const hrLink = screen.getByRole('link', { name: 'HR' });
    expect(hrLink).toHaveAttribute('href', '/organizations/test-org/hr/dashboard');
  });

  it('does not create link for current page', () => {
    renderWithProviders(<HRBreadcrumbs currentPage="Applications" />);
    
    const currentPage = screen.getByText('Applications');
    expect(currentPage).not.toHaveAttribute('href');
    expect(currentPage).toHaveClass('text-primary');
    expect(currentPage).toHaveClass('font-medium');
  });

  it('applies hover styles to breadcrumb links', () => {
    renderWithProviders(<HRBreadcrumbs currentPage="Applications" />);
    
    const orgLink = screen.getByRole('link', { name: 'Organization' });
    expect(orgLink).toHaveClass('hover:text-primary');
    expect(orgLink).toHaveClass('transition-colors');
  });

  it('applies custom className when provided', () => {
    renderWithProviders(<HRBreadcrumbs currentPage="Applications" className="custom-class" />);
    
    const nav = screen.getByRole('navigation');
    expect(nav).toHaveClass('custom-class');
  });

  it('handles different current page names', () => {
    renderWithProviders(<HRBreadcrumbs currentPage="Performance Reviews" />);
    
    expect(screen.getByText('Performance Reviews')).toBeInTheDocument();
    expect(screen.getByText('Performance Reviews')).toHaveClass('text-primary');
  });

  it('shows fallback organization name when organization is loading', () => {
    vi.spyOn(apiSlice.endpoints.getOrganization, 'useQuery').mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderWithProviders(<HRBreadcrumbs currentPage="Applications" />);
    
    expect(screen.getByText('Organization')).toBeInTheDocument();
  });
});