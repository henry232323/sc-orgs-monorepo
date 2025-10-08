import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { BrowserRouter } from 'react-router-dom';
import { apiSlice } from '../../../services/apiSlice';
import ApplicationForm from '../application_form';

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

describe('ApplicationForm', () => {
  let store: ReturnType<typeof createMockStore>;
  let mockCreateApplication: ReturnType<typeof vi.fn>;
  let mockOnSuccess: ReturnType<typeof vi.fn>;
  let mockOnCancel: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    store = createMockStore();
    mockCreateApplication = vi.fn();
    mockOnSuccess = vi.fn();
    mockOnCancel = vi.fn();
    
    // Mock the RTK Query mutation
    vi.spyOn(apiSlice.endpoints.createApplication, 'useMutation').mockReturnValue([
      mockCreateApplication,
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

  it('renders application form with all required fields', () => {
    renderWithProvider(<ApplicationForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);
    
    expect(screen.getByText('Submit Application')).toBeInTheDocument();
    expect(screen.getByLabelText(/Cover Letter/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Star Citizen Experience/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Availability/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Submit Application/ })).toBeInTheDocument();
  });

  it('validates required fields before submission', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ApplicationForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);
    
    const submitButton = screen.getByRole('button', { name: /Submit Application/ });
    await user.click(submitButton);
    
    expect(screen.getByText('Cover letter is required')).toBeInTheDocument();
    expect(screen.getByText('Experience description is required')).toBeInTheDocument();
    expect(screen.getByText('Availability information is required')).toBeInTheDocument();
    expect(mockCreateApplication).not.toHaveBeenCalled();
  });

  it('validates minimum character requirements', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ApplicationForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);
    
    const coverLetterField = screen.getByLabelText(/Cover Letter/);
    const experienceField = screen.getByLabelText(/Star Citizen Experience/);
    
    await user.type(coverLetterField, 'Short');
    await user.type(experienceField, 'Too short');
    
    const submitButton = screen.getByRole('button', { name: /Submit Application/ });
    await user.click(submitButton);
    
    expect(screen.getByText('Cover letter must be at least 50 characters')).toBeInTheDocument();
    expect(screen.getByText('Experience description must be at least 20 characters')).toBeInTheDocument();
  });

  it('allows adding and removing custom fields', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ApplicationForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);
    
    const fieldNameInput = screen.getByLabelText(/Field Name/);
    const fieldValueInput = screen.getByLabelText(/Field Value/);
    const addButton = screen.getByRole('button', { name: /Add Field/ });
    
    await user.type(fieldNameInput, 'Discord Username');
    await user.type(fieldValueInput, 'TestUser#1234');
    await user.click(addButton);
    
    expect(screen.getByText('Discord Username:')).toBeInTheDocument();
    expect(screen.getByText('TestUser#1234')).toBeInTheDocument();
    
    // Remove the field
    const removeButton = screen.getByRole('button', { name: /Remove/ });
    await user.click(removeButton);
    
    expect(screen.queryByText('Discord Username:')).not.toBeInTheDocument();
  });

  it('submits form with valid data', async () => {
    const user = userEvent.setup();
    mockCreateApplication.mockResolvedValue({ unwrap: () => Promise.resolve({ id: 'test-app' }) });
    
    renderWithProvider(<ApplicationForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);
    
    const coverLetterField = screen.getByLabelText(/Cover Letter/);
    const experienceField = screen.getByLabelText(/Star Citizen Experience/);
    const availabilityField = screen.getByLabelText(/Availability/);
    
    await user.type(coverLetterField, 'This is a comprehensive cover letter that meets the minimum character requirement for submission.');
    await user.type(experienceField, 'I have extensive experience in Star Citizen with multiple ships and combat experience.');
    await user.type(availabilityField, 'Available weekends and evenings EST timezone.');
    
    const submitButton = screen.getByRole('button', { name: /Submit Application/ });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockCreateApplication).toHaveBeenCalledWith({
        organizationId: 'test-org',
        data: {
          cover_letter: 'This is a comprehensive cover letter that meets the minimum character requirement for submission.',
          experience: 'I have extensive experience in Star Citizen with multiple ships and combat experience.',
          availability: 'Available weekends and evenings EST timezone.',
          custom_fields: {},
        },
      });
    });
    
    expect(mockOnSuccess).toHaveBeenCalled();
  });

  it('handles submission errors gracefully', async () => {
    const user = userEvent.setup();
    mockCreateApplication.mockRejectedValue({
      data: { message: 'Application submission failed' }
    });
    
    renderWithProvider(<ApplicationForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);
    
    const coverLetterField = screen.getByLabelText(/Cover Letter/);
    const experienceField = screen.getByLabelText(/Star Citizen Experience/);
    const availabilityField = screen.getByLabelText(/Availability/);
    
    await user.type(coverLetterField, 'This is a comprehensive cover letter that meets the minimum character requirement for submission.');
    await user.type(experienceField, 'I have extensive experience in Star Citizen with multiple ships and combat experience.');
    await user.type(availabilityField, 'Available weekends and evenings EST timezone.');
    
    const submitButton = screen.getByRole('button', { name: /Submit Application/ });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Application submission failed')).toBeInTheDocument();
    });
    
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ApplicationForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);
    
    const cancelButton = screen.getByRole('button', { name: /Cancel/ });
    await user.click(cancelButton);
    
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('shows loading state during submission', async () => {
    vi.spyOn(apiSlice.endpoints.createApplication, 'useMutation').mockReturnValue([
      mockCreateApplication,
      { isLoading: true }
    ] as any);
    
    renderWithProvider(<ApplicationForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);
    
    expect(screen.getByText('Submitting Application...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Submitting Application.../ })).toBeDisabled();
  });
});