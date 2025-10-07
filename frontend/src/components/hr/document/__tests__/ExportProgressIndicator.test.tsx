
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ExportProgressIndicator } from '../ExportProgressIndicator';

describe('ExportProgressIndicator', () => {
  it('should render progress information', () => {
    render(
      <ExportProgressIndicator
        format="PDF"
        progress={50}
        status="Processing content..."
      />
    );

    expect(screen.getByText('Exporting PDF')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('Processing content...')).toBeInTheDocument();
  });

  it('should show loading spinner when in progress', () => {
    render(
      <ExportProgressIndicator
        format="HTML"
        progress={25}
        status="Generating file..."
      />
    );

    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('should show success icon when complete', () => {
    render(
      <ExportProgressIndicator
        format="PDF"
        progress={100}
        status="Download started!"
      />
    );

    // Check for success styling
    expect(screen.getByText('Download started!')).toHaveClass('text-green-600');
  });

  it('should show error icon when failed', () => {
    render(
      <ExportProgressIndicator
        format="PDF"
        progress={0}
        status="Export failed: Network error"
      />
    );

    // Check for error styling
    expect(screen.getByText('Export failed: Network error')).toHaveClass('text-red-600');
  });

  it('should update progress bar width', () => {
    render(
      <ExportProgressIndicator
        format="HTML"
        progress={75}
        status="Almost done..."
      />
    );

    const progressBar = document.querySelector('.bg-blue-500');
    expect(progressBar).toHaveStyle({ width: '75%' });
  });

  it('should apply custom className', () => {
    const { container } = render(
      <ExportProgressIndicator
        format="PDF"
        progress={50}
        status="Processing..."
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });
});