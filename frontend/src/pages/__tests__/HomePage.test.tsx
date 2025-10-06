
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import HomePage from '../HomePage';

describe('HomePage', () => {
  it('renders welcome message', () => {
    render(<HomePage />);
    
    expect(screen.getByText('Welcome to SC-Orgs')).toBeInTheDocument();
    expect(screen.getByText(/Discover, join, and manage Star Citizen organizations/)).toBeInTheDocument();
  });

  it('renders organization and event cards', () => {
    render(<HomePage />);
    
    expect(screen.getByText('Find Organizations')).toBeInTheDocument();
    expect(screen.getByText('Join Events')).toBeInTheDocument();
  });

  it('renders action buttons', () => {
    render(<HomePage />);
    
    expect(screen.getByText('Browse Organizations')).toBeInTheDocument();
    expect(screen.getByText('View Events')).toBeInTheDocument();
  });
});
