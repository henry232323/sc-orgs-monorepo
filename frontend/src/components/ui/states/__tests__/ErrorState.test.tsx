import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ErrorState from '../ErrorState';

describe('ErrorState', () => {
  it('renders default error state', () => {
    render(<ErrorState />);
    
    expect(screen.getByText('Something Went Wrong')).toBeInTheDocument();
    expect(screen.getByText('An unexpected error occurred. Please try again or contact support if the problem persists.')).toBeInTheDocument();
  });

  it('renders custom title and description', () => {
    render(
      <ErrorState 
        title="Custom Error" 
        description="This is a custom error message"
      />
    );
    
    expect(screen.getByText('Custom Error')).toBeInTheDocument();
    expect(screen.getByText('This is a custom error message')).toBeInTheDocument();
  });

  it('renders retry button when onRetry is provided', () => {
    const mockRetry = vi.fn();
    render(<ErrorState onRetry={mockRetry} />);
    
    const retryButton = screen.getByText('Try Again');
    expect(retryButton).toBeInTheDocument();
    
    fireEvent.click(retryButton);
    expect(mockRetry).toHaveBeenCalledOnce();
  });

  it('does not render retry button when showRetry is false', () => {
    const mockRetry = vi.fn();
    render(<ErrorState onRetry={mockRetry} showRetry={false} />);
    
    expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
  });

  it('auto-detects network error variant', () => {
    const networkError = { message: 'Failed to fetch' };
    render(<ErrorState error={networkError} />);
    
    expect(screen.getByText('Connection Problem')).toBeInTheDocument();
    expect(screen.getByText('Unable to connect to the server. Please check your internet connection.')).toBeInTheDocument();
  });

  it('auto-detects server error variant', () => {
    const serverError = { status: 500, message: 'Internal server error' };
    render(<ErrorState error={serverError} />);
    
    expect(screen.getByText('Server Error')).toBeInTheDocument();
    // The component shows the actual error message, not the default description
    expect(screen.getByText('Internal server error')).toBeInTheDocument();
  });

  it('auto-detects permission error variant', () => {
    const permissionError = { status: 403, message: 'Forbidden' };
    render(<ErrorState error={permissionError} />);
    
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    // The component shows the actual error message, not the default description
    expect(screen.getByText('Forbidden')).toBeInTheDocument();
  });

  it('renders custom retry text', () => {
    const mockRetry = vi.fn();
    render(<ErrorState onRetry={mockRetry} retryText="Retry Loading" />);
    
    expect(screen.getByText('Retry Loading')).toBeInTheDocument();
  });

  it('renders additional actions', () => {
    const mockRetry = vi.fn();
    const additionalAction = <button>Custom Action</button>;
    
    render(<ErrorState onRetry={mockRetry} actions={additionalAction} />);
    
    expect(screen.getByText('Try Again')).toBeInTheDocument();
    expect(screen.getByText('Custom Action')).toBeInTheDocument();
  });
});