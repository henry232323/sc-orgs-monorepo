import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { BrowserRouter } from 'react-router-dom';
import { apiSlice } from '../../../services/apiSlice';
import OnboardingChecklist from '../onboarding_checklist';
import type { OnboardingProgress } from '../../../types/hr';

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

// Mock onboarding progress data
const mockOnboardingProgress: OnboardingProgress = {
  id: 'progress-1',
  organization_id: 'test-org',
  user_id: 'test-user',
  template_id: 'template-1',
  status: 'in_progress',
  completed_tasks: ['task-1'],
  completion_percentage: 33,
  started_at: '2024-01-01T00:00:00Z',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  template: {
    id: 'template-1',
    organization_id: 'test-org',
    role_name: 'Pilot',
    estimated_duration_days: 7,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    tasks: [
      {
        id: 'task-1',
        title: 'Complete Basic Training',
        description: 'Complete the basic pilot training course',
        required: true,
        estimated_hours: 2,
        order_index: 1,
      },
      {
        id: 'task-2',
        title: 'Ship Familiarization',
        description: 'Learn about different ship types',
        required: true,
        estimated_hours: 3,
        order_index: 2,
      },
      {
        id: 'task-3',
        title: 'Combat Training',
        description: 'Optional combat training session',
        required: false,
        estimated_hours: 4,
        order_index: 3,
      },
    ],
  },
};

describe('OnboardingChecklist', () => {
  let store: ReturnType<typeof createMockStore>;
  let mockUpdateProgress: ReturnType<typeof vi.fn>;
  let mockCompleteTask: ReturnType<typeof vi.fn>;
  let mockRefetch: ReturnType<typeof vi.fn>;
  let mockOnProgressUpdate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    store = createMockStore();
    mockUpdateProgress = vi.fn();
    mockCompleteTask = vi.fn();
    mockRefetch = vi.fn();
    mockOnProgressUpdate = vi.fn();
    
    // Mock the RTK Query hooks
    vi.spyOn(apiSlice.endpoints.getOnboardingProgress, 'useQuery').mockReturnValue({
      data: mockOnboardingProgress,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    } as any);
    
    vi.spyOn(apiSlice.endpoints.updateOnboardingProgress, 'useMutation').mockReturnValue([
      mockUpdateProgress,
      { isLoading: false }
    ] as any);
    
    vi.spyOn(apiSlice.endpoints.completeOnboardingTask, 'useMutation').mockReturnValue([
      mockCompleteTask,
      { isLoading: false }
    ] as any);
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

  it('renders onboarding checklist with progress information', () => {
    renderWithProvider(
      <OnboardingChecklist userId="test-user" onProgressUpdate={mockOnProgressUpdate} />
    );
    
    expect(screen.getByText('Onboarding Checklist')).toBeInTheDocument();
    expect(screen.getByText('Role: Pilot')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('33%')).toBeInTheDocument();
    expect(screen.getByText('1 of 3 tasks completed')).toBeInTheDocument();
  });

  it('displays all onboarding tasks with correct completion status', () => {
    renderWithProvider(
      <OnboardingChecklist userId="test-user" onProgressUpdate={mockOnProgressUpdate} />
    );
    
    expect(screen.getByText('Complete Basic Training')).toBeInTheDocument();
    expect(screen.getByText('Ship Familiarization')).toBeInTheDocument();
    expect(screen.getByText('Combat Training')).toBeInTheDocument();
    
    // Check that first task is completed
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes[0]).toBeChecked();
    expect(checkboxes[1]).not.toBeChecked();
    expect(checkboxes[2]).not.toBeChecked();
  });

  it('shows required and optional task indicators', () => {
    renderWithProvider(
      <OnboardingChecklist userId="test-user" onProgressUpdate={mockOnProgressUpdate} />
    );
    
    const requiredChips = screen.getAllByText('Required');
    expect(requiredChips).toHaveLength(2); // First two tasks are required
    
    const hourChips = screen.getAllByText(/\d+h/);
    expect(hourChips).toHaveLength(3); // All tasks have hour estimates
  });

  it('handles task completion', async () => {
    const user = userEvent.setup();
    mockCompleteTask.mockResolvedValue({ unwrap: () => Promise.resolve() });
    
    renderWithProvider(
      <OnboardingChecklist userId="test-user" onProgressUpdate={mockOnProgressUpdate} />
    );
    
    const checkboxes = screen.getAllByRole('checkbox');
    const secondTaskCheckbox = checkboxes[1]; // Ship Familiarization task
    
    await user.click(secondTaskCheckbox);
    
    await waitFor(() => {
      expect(mockCompleteTask).toHaveBeenCalledWith({
        organizationId: 'test-org',
        taskId: 'task-2',
        userId: 'test-user',
      });
    });
    
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('handles task unchecking', async () => {
    const user = userEvent.setup();
    mockUpdateProgress.mockResolvedValue({ unwrap: () => Promise.resolve() });
    
    renderWithProvider(
      <OnboardingChecklist userId="test-user" onProgressUpdate={mockOnProgressUpdate} />
    );
    
    const checkboxes = screen.getAllByRole('checkbox');
    const firstTaskCheckbox = checkboxes[0]; // Already completed task
    
    await user.click(firstTaskCheckbox);
    
    await waitFor(() => {
      expect(mockUpdateProgress).toHaveBeenCalledWith({
        organizationId: 'test-org',
        userId: 'test-user',
        data: { completed_tasks: [] }, // Remove task-1 from completed tasks
      });
    });
    
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('shows completion celebration when all tasks are done', () => {
    const completedProgress = {
      ...mockOnboardingProgress,
      status: 'completed' as const,
      completed_tasks: ['task-1', 'task-2', 'task-3'],
      completion_percentage: 100,
      completed_at: '2024-01-08T00:00:00Z',
    };
    
    vi.spyOn(apiSlice.endpoints.getOnboardingProgress, 'useQuery').mockReturnValue({
      data: completedProgress,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    } as any);
    
    renderWithProvider(
      <OnboardingChecklist userId="test-user" onProgressUpdate={mockOnProgressUpdate} />
    );
    
    expect(screen.getByText('🎉')).toBeInTheDocument();
    expect(screen.getByText('Onboarding Complete!')).toBeInTheDocument();
    expect(screen.getByText(/Completed on/)).toBeInTheDocument();
  });

  it('shows loading state while fetching data', () => {
    vi.spyOn(apiSlice.endpoints.getOnboardingProgress, 'useQuery').mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: mockRefetch,
    } as any);
    
    renderWithProvider(
      <OnboardingChecklist userId="test-user" onProgressUpdate={mockOnProgressUpdate} />
    );
    
    expect(screen.getByTestId('loading-skeleton') || screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows error state when data fails to load', () => {
    vi.spyOn(apiSlice.endpoints.getOnboardingProgress, 'useQuery').mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { message: 'Failed to load' },
      refetch: mockRefetch,
    } as any);
    
    renderWithProvider(
      <OnboardingChecklist userId="test-user" onProgressUpdate={mockOnProgressUpdate} />
    );
    
    expect(screen.getByText('Failed to load onboarding checklist')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retry/ })).toBeInTheDocument();
  });

  it('calls onProgressUpdate when progress changes', () => {
    renderWithProvider(
      <OnboardingChecklist userId="test-user" onProgressUpdate={mockOnProgressUpdate} />
    );
    
    expect(mockOnProgressUpdate).toHaveBeenCalledWith(mockOnboardingProgress);
  });

  it('calculates estimated time remaining correctly', () => {
    renderWithProvider(
      <OnboardingChecklist userId="test-user" onProgressUpdate={mockOnProgressUpdate} />
    );
    
    // Should show 7h remaining (3h + 4h for uncompleted tasks)
    expect(screen.getByText('~7h remaining')).toBeInTheDocument();
  });

  it('handles optimistic updates correctly', async () => {
    const user = userEvent.setup();
    mockCompleteTask.mockRejectedValue(new Error('Network error'));
    
    renderWithProvider(
      <OnboardingChecklist userId="test-user" onProgressUpdate={mockOnProgressUpdate} />
    );
    
    const checkboxes = screen.getAllByRole('checkbox');
    const secondTaskCheckbox = checkboxes[1];
    
    // Should optimistically check the box
    await user.click(secondTaskCheckbox);
    expect(secondTaskCheckbox).toBeChecked();
    
    // Should revert on error
    await waitFor(() => {
      expect(secondTaskCheckbox).not.toBeChecked();
    });
  });
});