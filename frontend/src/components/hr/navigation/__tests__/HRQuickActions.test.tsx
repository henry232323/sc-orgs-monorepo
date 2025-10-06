import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import HRQuickActions from '../HRQuickActions';

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ spectrumId: 'test-org' }),
  };
});

describe('HRQuickActions', () => {
  const renderWithRouter = (component: React.ReactElement) => {
    return render(
      <BrowserRouter>
        {component}
      </BrowserRouter>
    );
  };

  it('renders quick actions title and description', () => {
    renderWithRouter(<HRQuickActions />);
    
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    expect(screen.getByText('Common HR tasks and shortcuts')).toBeInTheDocument();
  });

  it('renders all quick action items', () => {
    renderWithRouter(<HRQuickActions />);
    
    expect(screen.getByText('New Application')).toBeInTheDocument();
    expect(screen.getByText('Create Review')).toBeInTheDocument();
    expect(screen.getByText('Add Skill')).toBeInTheDocument();
    expect(screen.getByText('Upload Document')).toBeInTheDocument();
  });

  it('displays descriptions for each action', () => {
    renderWithRouter(<HRQuickActions />);
    
    expect(screen.getByText('Review pending applications')).toBeInTheDocument();
    expect(screen.getByText('Start performance review')).toBeInTheDocument();
    expect(screen.getByText('Track new skills')).toBeInTheDocument();
    expect(screen.getByText('Add HR documents')).toBeInTheDocument();
  });

  it('creates correct links with organization context', () => {
    renderWithRouter(<HRQuickActions />);
    
    const applicationLink = screen.getByRole('link', { name: /New Application/ });
    expect(applicationLink).toHaveAttribute('href', '/organizations/test-org/hr/applications');
    
    const reviewLink = screen.getByRole('link', { name: /Create Review/ });
    expect(reviewLink).toHaveAttribute('href', '/organizations/test-org/hr/performance');
    
    const skillLink = screen.getByRole('link', { name: /Add Skill/ });
    expect(skillLink).toHaveAttribute('href', '/organizations/test-org/hr/skills');
    
    const documentLink = screen.getByRole('link', { name: /Upload Document/ });
    expect(documentLink).toHaveAttribute('href', '/organizations/test-org/hr/documents');
  });

  it('displays icons for each action', () => {
    renderWithRouter(<HRQuickActions />);
    
    // Check that each action has an icon (SVG element)
    const actionItems = screen.getAllByRole('link');
    actionItems.forEach(item => {
      expect(item.querySelector('svg')).toBeInTheDocument();
    });
  });

  it('applies hover effects to action items', () => {
    renderWithRouter(<HRQuickActions />);
    
    const actionItems = screen.getAllByRole('link');
    actionItems.forEach(item => {
      const container = item.querySelector('div');
      expect(container).toHaveClass('group');
      expect(container).toHaveClass('hover:bg-glass-hover');
      expect(container).toHaveClass('hover:scale-[var(--scale-button-hover)]');
    });
  });

  it('uses responsive grid layout', () => {
    renderWithRouter(<HRQuickActions />);
    
    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThan(0);
    const gridContainer = links[0]?.parentElement;
    expect(gridContainer).toBeTruthy();
    expect(gridContainer).toHaveClass('grid');
    expect(gridContainer).toHaveClass('grid-cols-1');
    expect(gridContainer).toHaveClass('sm:grid-cols-2');
  });

  it('applies custom className when provided', () => {
    renderWithRouter(<HRQuickActions className="custom-class" />);
    
    const container = screen.getByText('Quick Actions').closest('div')?.parentElement;
    expect(container).toHaveClass('custom-class');
  });

  it('follows design system patterns with glass morphism', () => {
    renderWithRouter(<HRQuickActions />);
    
    const container = screen.getByText('Quick Actions').closest('div')?.parentElement;
    expect(container).toHaveClass('glass');
    
    const actionItems = screen.getAllByRole('link');
    actionItems.forEach(item => {
      const itemContainer = item.querySelector('div');
      expect(itemContainer).toHaveClass('bg-glass-subtle');
      expect(itemContainer).toHaveClass('border-glass');
    });
  });
});