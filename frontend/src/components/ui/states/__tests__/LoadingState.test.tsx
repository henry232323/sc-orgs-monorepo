import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import LoadingState from '../LoadingState';

describe('LoadingState', () => {
  it('renders default loading state', () => {
    render(<LoadingState />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders custom title and description', () => {
    render(
      <LoadingState 
        title="Custom Loading" 
        description="Please wait while we fetch your data"
      />
    );
    
    expect(screen.getByText('Custom Loading')).toBeInTheDocument();
    expect(screen.getByText('Please wait while we fetch your data')).toBeInTheDocument();
  });

  it('renders minimal variant', () => {
    render(<LoadingState variant="minimal" />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders card variant with skeleton items', () => {
    render(<LoadingState variant="card" skeletonCount={2} />);
    
    // Should render skeleton cards
    const skeletonCards = screen.getAllByRole('generic');
    expect(skeletonCards.length).toBeGreaterThan(0);
  });

  it('renders list variant with skeleton items', () => {
    render(<LoadingState variant="list" skeletonCount={3} />);
    
    // Should render skeleton list items
    const skeletonItems = screen.getAllByRole('generic');
    expect(skeletonItems.length).toBeGreaterThan(0);
  });
});