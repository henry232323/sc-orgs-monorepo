import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import HRNavigationTabs from '../HRNavigationTabs';

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ spectrumId: 'test-org' }),
    useLocation: () => ({ pathname: '/organizations/test-org/hr/dashboard' }),
  };
});

describe('HRNavigationTabs', () => {
  const renderWithRouter = (component: React.ReactElement) => {
    return render(
      <BrowserRouter>
        {component}
      </BrowserRouter>
    );
  };

  it('renders all HR navigation tabs', () => {
    renderWithRouter(<HRNavigationTabs />);
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Applications')).toBeInTheDocument();
    expect(screen.getByText('Performance')).toBeInTheDocument();
    expect(screen.getByText('Skills')).toBeInTheDocument();
    expect(screen.getByText('Documents')).toBeInTheDocument();
  });

  it('displays correct icons for each tab', () => {
    renderWithRouter(<HRNavigationTabs />);
    
    // Check that each tab has an icon (SVG element)
    const tabs = screen.getAllByRole('link');
    tabs.forEach(tab => {
      expect(tab.querySelector('svg')).toBeInTheDocument();
    });
  });

  it('generates correct URLs with organization context', () => {
    renderWithRouter(<HRNavigationTabs />);
    
    expect(screen.getByRole('link', { name: /Dashboard/ })).toHaveAttribute(
      'href', 
      '/organizations/test-org/hr/dashboard'
    );
    expect(screen.getByRole('link', { name: /Applications/ })).toHaveAttribute(
      'href', 
      '/organizations/test-org/hr/applications'
    );
    expect(screen.getByRole('link', { name: /Performance/ })).toHaveAttribute(
      'href', 
      '/organizations/test-org/hr/performance'
    );
    expect(screen.getByRole('link', { name: /Skills/ })).toHaveAttribute(
      'href', 
      '/organizations/test-org/hr/skills'
    );
    expect(screen.getByRole('link', { name: /Documents/ })).toHaveAttribute(
      'href', 
      '/organizations/test-org/hr/documents'
    );
  });

  it('highlights active tab correctly', () => {
    renderWithRouter(<HRNavigationTabs />);
    
    const dashboardTab = screen.getByRole('link', { name: /Dashboard/ });
    expect(dashboardTab).toHaveClass('border-[var(--color-accent-blue)]');
    expect(dashboardTab).toHaveClass('text-[var(--color-accent-blue)]');
  });

  it('applies hover styles to inactive tabs', () => {
    renderWithRouter(<HRNavigationTabs />);
    
    const applicationsTab = screen.getByRole('link', { name: /Applications/ });
    expect(applicationsTab).toHaveClass('border-transparent');
    expect(applicationsTab).toHaveClass('text-tertiary');
    expect(applicationsTab).toHaveClass('hover:text-primary');
    expect(applicationsTab).toHaveClass('hover:border-glass-hover');
  });

  it('applies custom className when provided', () => {
    renderWithRouter(<HRNavigationTabs className="custom-class" />);
    
    const container = screen.getByRole('navigation').parentElement;
    expect(container).toHaveClass('custom-class');
  });
});