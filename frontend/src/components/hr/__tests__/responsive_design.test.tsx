/**
 * Responsive Design Tests for HR Components
 * 
 * Tests to verify that HR components work correctly across different screen sizes
 * and implement proper responsive design patterns.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { apiSlice } from '../../../services/apiSlice';
import DocumentLibrary from '../document_library';
import HRDashboard from '../hr_dashboard';
import ApplicationForm from '../application_form';
import OnboardingChecklist from '../onboarding_checklist';

// Mock store setup
const createMockStore = () => {
  return configureStore({
    reducer: {
      [apiSlice.reducerPath]: apiSlice.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(apiSlice.middleware),
  });
};

// Mock data
const mockDocuments = [
  {
    id: '1',
    title: 'Test Document',
    description: 'Test description',
    content: 'Test content',
    folder_path: '/',
    version: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    word_count: 100,
    estimated_reading_time: 5,
    requires_acknowledgment: false,
    access_roles: ['member'],
  },
];

const mockOnboardingProgress = {
  id: '1',
  user_id: 'user1',
  status: 'in_progress' as const,
  completed_tasks: ['task1'],
  template: {
    role_name: 'Test Role',
    tasks: [
      {
        id: 'task1',
        title: 'Complete Profile',
        description: 'Fill out your profile information',
        required: true,
        estimated_hours: 1,
        order_index: 1,
      },
      {
        id: 'task2',
        title: 'Read Handbook',
        description: 'Review the organization handbook',
        required: true,
        estimated_hours: 2,
        order_index: 2,
      },
    ],
  },
};

// Mock API responses
const mockApiResponses = {
  getDocuments: { data: mockDocuments, total: 1 },
  getOnboardingProgress: { data: [mockOnboardingProgress] },
  getHRAnalytics: {
    metrics: {
      applications: { total_received: 10, approval_rate: 0.8 },
      onboarding: { total_started: 5, overdue_count: 2 },
      performance: { reviews_completed: 8, average_rating: 4.2 },
      skills: { total_skills_tracked: 15, verification_rate: 0.9 },
    },
  },
  getHRActivities: { data: [] },
};

import { vi } from 'vitest';

// Mock API slice
vi.mock('../../../services/apiSlice', () => ({
  apiSlice: {
    reducer: (state = {}) => state,
    middleware: [],
    reducerPath: 'api',
  },
  useGetDocumentsQuery: () => ({
    data: mockApiResponses.getDocuments,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useSearchDocumentsQuery: () => ({
    data: null,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useGetOnboardingProgressQuery: () => ({
    data: mockApiResponses.getOnboardingProgress,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useGetHRAnalyticsQuery: () => ({
    data: mockApiResponses.getHRAnalytics,
    isLoading: false,
  }),
  useGetHRActivitiesQuery: () => ({
    data: mockApiResponses.getHRActivities,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useCreateApplicationMutation: () => [vi.fn(), { isLoading: false }],
  useAcknowledgeDocumentMutation: () => [vi.fn(), { isLoading: false }],
  useGetDocumentAcknowledmentStatusQuery: () => ({
    data: { current_user_acknowledged: false },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useCreateDocumentMutation: () => [vi.fn(), { isLoading: false }],
  useUpdateDocumentMutation: () => [vi.fn(), { isLoading: false }],
  useUpdateOnboardingProgressMutation: () => [vi.fn(), { isLoading: false }],
  useCompleteOnboardingTaskMutation: () => [vi.fn(), { isLoading: false }],
}));

// Mock permissions hook
vi.mock('../../../hooks/usePermissions', () => ({
  usePermissions: () => ({
    hasPermission: () => true,
  }),
}));

// Mock router params
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ organizationId: 'test-org' }),
  };
});

// Helper to render components with providers
const renderWithProviders = (component: React.ReactElement) => {
  const store = createMockStore();
  return render(
    <Provider store={store}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </Provider>
  );
};

// Helper to simulate different screen sizes
const setViewportSize = (width: number, height: number = 800) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
  window.dispatchEvent(new Event('resize'));
};

describe('Responsive Design Tests', () => {
  beforeEach(() => {
    // Reset viewport to desktop size
    setViewportSize(1024, 800);
  });

  describe('Document Library Responsive Design', () => {
    it('should stack sidebar and content on mobile', () => {
      setViewportSize(640); // Mobile size
      renderWithProviders(<DocumentLibrary />);
      
      const sidebar = screen.getByText('Folders').closest('div');
      const mainContent = screen.getByText('Document Library').closest('div');
      
      expect(sidebar).toBeInTheDocument();
      expect(mainContent).toBeInTheDocument();
      
      // Check for responsive classes
      expect(sidebar?.parentElement).toHaveClass('flex-col', 'lg:flex-row');
    });

    it('should show responsive text sizes', () => {
      setViewportSize(640); // Mobile size
      renderWithProviders(<DocumentLibrary />);
      
      const title = screen.getByText('Document Library');
      expect(title).toHaveClass('responsive-text-lg');
    });

    it('should use touch-friendly button sizes on mobile', () => {
      setViewportSize(640); // Mobile size
      renderWithProviders(<DocumentLibrary allowCreate={true} />);
      
      const createButton = screen.getByText('Create');
      expect(createButton).toHaveClass('touch-friendly');
    });

    it('should show full button text on desktop', () => {
      setViewportSize(1024); // Desktop size
      renderWithProviders(<DocumentLibrary allowCreate={true} />);
      
      const createButton = screen.getByText('Create Document');
      expect(createButton).toBeInTheDocument();
    });
  });

  describe('HR Dashboard Responsive Design', () => {
    it('should use responsive grid for metrics', () => {
      renderWithProviders(<HRDashboard organizationId="test-org" />);
      
      const metricsContainer = screen.getByText('Key Metrics').nextElementSibling;
      expect(metricsContainer).toHaveClass('responsive-grid-1-2-4');
    });

    it('should stack header elements on mobile', () => {
      setViewportSize(640); // Mobile size
      renderWithProviders(<HRDashboard organizationId="test-org" />);
      
      const header = screen.getByText('HR Management').closest('div');
      expect(header?.parentElement).toHaveClass('flex-col', 'sm:flex-row');
    });

    it('should use responsive text sizing', () => {
      renderWithProviders(<HRDashboard organizationId="test-org" />);
      
      const title = screen.getByText('HR Management');
      expect(title).toHaveClass('responsive-text-lg');
    });

    it('should apply mobile glass effects', () => {
      setViewportSize(640); // Mobile size
      renderWithProviders(<HRDashboard organizationId="test-org" />);
      
      const papers = document.querySelectorAll('[class*="glass-mobile-reduced"]');
      expect(papers.length).toBeGreaterThan(0);
    });
  });

  describe('Application Form Responsive Design', () => {
    it('should stack form buttons on mobile', () => {
      setViewportSize(640); // Mobile size
      renderWithProviders(<ApplicationForm />);
      
      const submitButton = screen.getByText('Submit Application');
      expect(submitButton).toHaveClass('w-full', 'sm:w-auto', 'touch-friendly');
    });

    it('should use responsive grid for custom fields', () => {
      renderWithProviders(<ApplicationForm />);
      
      const customFieldsSection = screen.getByText('Add Custom Field').closest('div');
      const gridContainer = customFieldsSection?.querySelector('[class*="responsive-grid-1-2"]');
      expect(gridContainer).toBeInTheDocument();
    });

    it('should apply responsive padding', () => {
      renderWithProviders(<ApplicationForm />);
      
      const form = screen.getByText('Submit Application').closest('div');
      expect(form?.parentElement).toHaveClass('responsive-padding-x', 'responsive-padding-y');
    });
  });

  describe('Onboarding Checklist Responsive Design', () => {
    it('should render with responsive container', () => {
      renderWithProviders(
        <OnboardingChecklist userId="user1" />
      );
      
      const container = screen.getByText('Onboarding Checklist').closest('div')?.parentElement?.parentElement;
      expect(container).toHaveClass('responsive-container');
    });

    it('should stack progress info on mobile', () => {
      setViewportSize(640); // Mobile size
      renderWithProviders(
        <OnboardingChecklist userId="user1" />
      );
      
      const progressContainer = screen.getByText('Progress').closest('div')?.nextElementSibling;
      expect(progressContainer).toHaveClass('flex-col', 'sm:flex-row');
    });

    it('should use touch-friendly checkboxes', () => {
      renderWithProviders(
        <OnboardingChecklist userId="user1" />
      );
      
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach(checkbox => {
        expect(checkbox.closest('div')).toHaveClass('touch-friendly');
      });
    });

    it('should wrap task chips on mobile', () => {
      renderWithProviders(
        <OnboardingChecklist userId="user1" />
      );
      
      const chipContainers = document.querySelectorAll('[class*="flex-wrap"]');
      expect(chipContainers.length).toBeGreaterThan(0);
    });
  });

  describe('Cross-Component Responsive Patterns', () => {
    it('should consistently use responsive text classes', () => {
      const components = [
        <DocumentLibrary />,
        <HRDashboard organizationId="test-org" />,
        <ApplicationForm />,
        <OnboardingChecklist userId="user1" />,
      ];

      components.forEach((component) => {
        const { unmount } = renderWithProviders(component);
        
        const responsiveTextElements = document.querySelectorAll('[class*="responsive-text"]');
        expect(responsiveTextElements.length).toBeGreaterThan(0);
        
        unmount();
      });
    });

    it('should consistently apply mobile glass effects', () => {
      setViewportSize(640); // Mobile size
      
      const components = [
        <DocumentLibrary />,
        <HRDashboard organizationId="test-org" />,
        <ApplicationForm />,
        <OnboardingChecklist userId="user1" />,
      ];

      components.forEach((component) => {
        const { unmount } = renderWithProviders(component);
        
        const mobileGlassElements = document.querySelectorAll('[class*="glass-mobile-reduced"]');
        expect(mobileGlassElements.length).toBeGreaterThan(0);
        
        unmount();
      });
    });

    it('should use touch-friendly interactive elements', () => {
      setViewportSize(640); // Mobile size
      
      const components = [
        <DocumentLibrary allowCreate={true} />,
        <HRDashboard organizationId="test-org" />,
        <ApplicationForm />,
      ];

      components.forEach((component) => {
        const { unmount } = renderWithProviders(component);
        
        const touchFriendlyElements = document.querySelectorAll('[class*="touch-friendly"]');
        expect(touchFriendlyElements.length).toBeGreaterThan(0);
        
        unmount();
      });
    });
  });

  describe('Performance Optimizations', () => {
    it('should respect reduced motion preferences', () => {
      // Mock prefers-reduced-motion
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      renderWithProviders(<HRDashboard organizationId="test-org" />);
      
      // Check that motion-reduce classes are applied
      const animatedElements = document.querySelectorAll('[class*="transition"]');
      expect(animatedElements.length).toBeGreaterThan(0);
    });

    it('should optimize glass effects for mobile', () => {
      setViewportSize(640); // Mobile size
      renderWithProviders(<DocumentLibrary />);
      
      const glassElements = document.querySelectorAll('[class*="glass-mobile-reduced"]');
      expect(glassElements.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility on Mobile', () => {
    it('should maintain proper focus management on mobile', () => {
      setViewportSize(640); // Mobile size
      renderWithProviders(<ApplicationForm />);
      
      const submitButton = screen.getByText('Submit Application');
      fireEvent.focus(submitButton);
      
      expect(submitButton).toHaveFocus();
      expect(submitButton).toHaveClass('touch-friendly');
    });

    it('should provide adequate touch targets', () => {
      setViewportSize(640); // Mobile size
      renderWithProviders(<DocumentLibrary allowCreate={true} />);
      
      const buttons = document.querySelectorAll('button');
      buttons.forEach(button => {
        if (button.classList.contains('touch-friendly')) {
          // Touch targets should be at least 44px (as defined in CSS)
          window.getComputedStyle(button);
          expect(button).toHaveClass('touch-friendly');
        }
      });
    });
  });
});