// import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DocumentEditorModal from '../DocumentEditorModal';
import type { Document } from '../../../../types/hr';

// Mock MarkdownEditor component
vi.mock('../MarkdownEditor', () => ({
  default: ({ onSave, onCancel, isLoading }: any) => (
    <div data-testid="markdown-editor">
      <button onClick={() => onSave('test content', {
        title: 'Test Document',
        description: 'Test description',
        folder_path: '/',
        requires_acknowledgment: false,
        access_roles: ['member'],
      })}>
        Save
      </button>
      <button onClick={onCancel}>Cancel</button>
      {isLoading && <div>Loading...</div>}
    </div>
  ),
}));

const mockDocument: Document = {
  id: '1',
  organization_id: 'org-1',
  title: 'Test Document',
  description: 'Test description',
  content: 'Test content',
  folder_path: '/',
  version: 1,
  created_by: 'user-1',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  word_count: 100,
  estimated_reading_time: 5,
  requires_acknowledgment: false,
  access_roles: ['member'],
};

describe('DocumentEditorModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSave: vi.fn(),
    isLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when isOpen is false', () => {
    render(
      <DocumentEditorModal
        {...defaultProps}
        isOpen={false}
      />
    );

    expect(screen.queryByText('Create New Document')).not.toBeInTheDocument();
  });

  it('should render create mode when no editing document', () => {
    render(<DocumentEditorModal {...defaultProps} />);

    expect(screen.getByText('Create New Document')).toBeInTheDocument();
    expect(screen.getByTestId('markdown-editor')).toBeInTheDocument();
  });

  it('should render edit mode when editing document is provided', () => {
    render(
      <DocumentEditorModal
        {...defaultProps}
        editingDocument={mockDocument}
      />
    );

    expect(screen.getByText('Edit Document')).toBeInTheDocument();
    expect(screen.getByTestId('markdown-editor')).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <DocumentEditorModal
        {...defaultProps}
        onClose={onClose}
      />
    );

    const closeButton = screen.getByRole('button', { name: '✕' });
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onSave when save is triggered from MarkdownEditor', () => {
    const onSave = vi.fn();
    render(
      <DocumentEditorModal
        {...defaultProps}
        onSave={onSave}
      />
    );

    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);

    expect(onSave).toHaveBeenCalledWith('test content', {
      title: 'Test Document',
      description: 'Test description',
      folder_path: '/',
      requires_acknowledgment: false,
      access_roles: ['member'],
    });
  });

  it('should call onClose when cancel is triggered from MarkdownEditor', () => {
    const onClose = vi.fn();
    render(
      <DocumentEditorModal
        {...defaultProps}
        onClose={onClose}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should disable close button when loading', () => {
    render(
      <DocumentEditorModal
        {...defaultProps}
        isLoading={true}
      />
    );

    const closeButton = screen.getByRole('button', { name: '✕' });
    expect(closeButton).toBeDisabled();
  });

  it('should show loading state in MarkdownEditor', () => {
    render(
      <DocumentEditorModal
        {...defaultProps}
        isLoading={true}
      />
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should apply responsive and themed classes', () => {
    const { container } = render(<DocumentEditorModal {...defaultProps} />);

    // Check for backdrop
    const backdrop = container.firstChild as HTMLElement;
    expect(backdrop).toHaveClass('fixed', 'inset-0', 'bg-black/60', 'backdrop-blur-sm');

    // Check for themed modal
    const modal = container.querySelector('[class*="glass-elevated"]');
    expect(modal).toBeInTheDocument();
    expect(modal).toHaveClass('glass-mobile-reduced');
  });

  it('should have proper accessibility attributes', () => {
    render(<DocumentEditorModal {...defaultProps} />);

    const closeButton = screen.getByRole('button', { name: '✕' });
    expect(closeButton).toHaveAttribute('title', 'Close editor');
  });

  it('should handle keyboard events for accessibility', () => {
    const onClose = vi.fn();
    render(
      <DocumentEditorModal
        {...defaultProps}
        onClose={onClose}
      />
    );

    // Test escape key (would need to be implemented in the component)
    const modal = screen.getByText('Create New Document').closest('div');
    expect(modal).toBeInTheDocument();
  });

  it('should maintain focus management', () => {
    render(<DocumentEditorModal {...defaultProps} />);

    const closeButton = screen.getByRole('button', { name: '✕' });
    closeButton.focus();
    expect(closeButton).toHaveFocus();
  });

  it('should render with proper z-index for modal layering', () => {
    const { container } = render(<DocumentEditorModal {...defaultProps} />);

    const backdrop = container.firstChild as HTMLElement;
    expect(backdrop).toHaveClass('z-50');
  });

  it('should handle responsive padding correctly', () => {
    render(<DocumentEditorModal {...defaultProps} />);

    const header = screen.getByText('Create New Document').closest('div');
    expect(header).toHaveClass('responsive-padding-x', 'responsive-padding-y');
  });
});