import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { MarkdownEditor, DocumentMetadata } from '../MarkdownEditor';
import { Document } from '../../../../types/hr';

// Mock @uiw/react-md-editor
vi.mock('@uiw/react-md-editor', () => ({
  default: ({ value, onChange, ...props }: any) => (
    <div data-testid="md-editor" {...props}>
      <textarea
        data-testid="md-editor-textarea"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder="Write your markdown here..."
      />
    </div>
  )
}));

// Mock lodash debounce
vi.mock('lodash', () => ({
  debounce: (fn: any) => fn
}));

describe('MarkdownEditor', () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();

  const defaultProps = {
    onSave: mockOnSave,
    onCancel: mockOnCancel
  };

  const mockDocument: Document = {
    id: '1',
    organization_id: 'org-1',
    title: 'Test Document',
    description: 'Test description',
    content: '# Test Content',
    word_count: 2,
    estimated_reading_time: 1,
    folder_path: '/test',
    version: 1,
    requires_acknowledgment: true,
    access_roles: ['admin'],
    created_by: 'user-1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Structure', () => {
    it('should render with initial content', () => {
      render(
        <MarkdownEditor
          {...defaultProps}
          initialContent="# Hello World"
        />
      );

      expect(screen.getByTestId('md-editor')).toBeInTheDocument();
      expect(screen.getByDisplayValue('# Hello World')).toBeInTheDocument();
    });

    it('should render metadata form fields', () => {
      render(<MarkdownEditor {...defaultProps} />);

      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/folder path/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/requires acknowledgment/i)).toBeInTheDocument();
    });

    it('should render action buttons', () => {
      render(<MarkdownEditor {...defaultProps} />);

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create document/i })).toBeInTheDocument();
    });

    it('should show update button when editing existing document', () => {
      render(
        <MarkdownEditor
          {...defaultProps}
          document={mockDocument}
        />
      );

      expect(screen.getByRole('button', { name: /update document/i })).toBeInTheDocument();
    });
  });

  describe('Controlled Component Pattern', () => {
    it('should populate form with document data when editing', () => {
      render(
        <MarkdownEditor
          {...defaultProps}
          document={mockDocument}
          initialContent={mockDocument.content}
        />
      );

      expect(screen.getByDisplayValue('Test Document')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test description')).toBeInTheDocument();
      expect(screen.getByDisplayValue('/test')).toBeInTheDocument();
      expect(screen.getByDisplayValue('# Test Content')).toBeInTheDocument();
      expect(screen.getByRole('checkbox')).toBeChecked();
    });

    it('should handle content changes', async () => {
      const user = userEvent.setup();
      render(<MarkdownEditor {...defaultProps} />);

      const textarea = screen.getByTestId('md-editor-textarea');
      await user.clear(textarea);
      await user.type(textarea, '# New Content');

      expect(textarea).toHaveValue('# New Content');
    });

    it('should handle metadata changes', async () => {
      const user = userEvent.setup();
      render(<MarkdownEditor {...defaultProps} />);

      const titleInput = screen.getByLabelText(/title/i);
      await user.clear(titleInput);
      await user.type(titleInput, 'New Title');

      expect(titleInput).toHaveValue('New Title');
    });
  });

  describe('Responsive Layout', () => {
    it('should apply custom className', () => {
      render(
        <MarkdownEditor
          {...defaultProps}
          className="custom-class"
        />
      );

      expect(document.querySelector('.markdown-editor')).toHaveClass('custom-class');
    });

    it('should have responsive grid layout for metadata form', () => {
      render(<MarkdownEditor {...defaultProps} />);

      const gridContainer = document.querySelector('.grid.grid-cols-1.md\\:grid-cols-2');
      expect(gridContainer).toBeInTheDocument();
    });
  });

  describe('Content Validation', () => {
    it('should show validation error for empty title', async () => {
      const user = userEvent.setup();
      render(<MarkdownEditor {...defaultProps} />);

      const saveButton = screen.getByRole('button', { name: /create document/i });
      await user.click(saveButton);

      expect(screen.getByText(/document title is required/i)).toBeInTheDocument();
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should show validation error for empty content', async () => {
      const user = userEvent.setup();
      render(<MarkdownEditor {...defaultProps} />);

      const titleInput = screen.getByLabelText(/title/i);
      await user.type(titleInput, 'Test Title');

      const saveButton = screen.getByRole('button', { name: /create document/i });
      await user.click(saveButton);

      expect(screen.getByText(/document content cannot be empty/i)).toBeInTheDocument();
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should disable save button when validation errors exist', async () => {
      const user = userEvent.setup();
      render(<MarkdownEditor {...defaultProps} />);

      const saveButton = screen.getByRole('button', { name: /create document/i });
      
      // Trigger validation by trying to save
      await user.click(saveButton);

      expect(saveButton).toBeDisabled();
    });

    it('should show word count and reading time', async () => {
      const user = userEvent.setup();
      render(<MarkdownEditor {...defaultProps} />);

      const textarea = screen.getByTestId('md-editor-textarea');
      await user.type(textarea, 'This is a test document with some words');

      expect(screen.getByText(/8 words/)).toBeInTheDocument();
      expect(screen.getByText(/1 min read/)).toBeInTheDocument();
    });
  });

  describe('Save Functionality', () => {
    it('should call onSave with content and metadata', async () => {
      const user = userEvent.setup();
      render(<MarkdownEditor {...defaultProps} />);

      // Fill in required fields
      const titleInput = screen.getByLabelText(/title/i);
      await user.type(titleInput, 'Test Title');

      const textarea = screen.getByTestId('md-editor-textarea');
      await user.type(textarea, '# Test Content');

      const saveButton = screen.getByRole('button', { name: /create document/i });
      await user.click(saveButton);

      expect(mockOnSave).toHaveBeenCalledWith(
        '# Test Content',
        expect.objectContaining({
          title: 'Test Title',
          folder_path: '/',
          requires_acknowledgment: false,
          access_roles: []
        })
      );
    });

    it('should show saving status', async () => {
      const user = userEvent.setup();
      mockOnSave.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      render(<MarkdownEditor {...defaultProps} />);

      // Fill in required fields
      const titleInput = screen.getByLabelText(/title/i);
      await user.type(titleInput, 'Test Title');

      const textarea = screen.getByTestId('md-editor-textarea');
      await user.type(textarea, '# Test Content');

      const saveButton = screen.getByRole('button', { name: /create document/i });
      await user.click(saveButton);

      expect(screen.getByText(/saving\.\.\./i)).toBeInTheDocument();
    });

    it('should show saved status after successful save', async () => {
      const user = userEvent.setup();
      mockOnSave.mockResolvedValue(undefined);
      
      render(<MarkdownEditor {...defaultProps} />);

      // Fill in required fields
      const titleInput = screen.getByLabelText(/title/i);
      await user.type(titleInput, 'Test Title');

      const textarea = screen.getByTestId('md-editor-textarea');
      await user.type(textarea, '# Test Content');

      const saveButton = screen.getByRole('button', { name: /create document/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/saved/i)).toBeInTheDocument();
      });
    });

    it('should show error status on save failure', async () => {
      const user = userEvent.setup();
      mockOnSave.mockRejectedValue(new Error('Save failed'));
      
      render(<MarkdownEditor {...defaultProps} />);

      // Fill in required fields
      const titleInput = screen.getByLabelText(/title/i);
      await user.type(titleInput, 'Test Title');

      const textarea = screen.getByTestId('md-editor-textarea');
      await user.type(textarea, '# Test Content');

      const saveButton = screen.getByRole('button', { name: /create document/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/save failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Cancel Functionality', () => {
    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<MarkdownEditor {...defaultProps} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('should disable inputs when loading', () => {
      render(
        <MarkdownEditor
          {...defaultProps}
          isLoading={true}
        />
      );

      expect(screen.getByLabelText(/title/i)).toBeDisabled();
      expect(screen.getByLabelText(/description/i)).toBeDisabled();
      expect(screen.getByLabelText(/folder path/i)).toBeDisabled();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /saving\.\.\./i })).toBeDisabled();
    });
  });

  describe('Unsaved Changes Tracking', () => {
    it('should show unsaved changes indicator when content is modified', async () => {
      const user = userEvent.setup();
      render(
        <MarkdownEditor
          {...defaultProps}
          initialContent="# Original"
        />
      );

      const textarea = screen.getByTestId('md-editor-textarea');
      await user.clear(textarea);
      await user.type(textarea, '# Modified');

      expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument();
    });

    it('should show unsaved changes indicator when metadata is modified', async () => {
      const user = userEvent.setup();
      render(<MarkdownEditor {...defaultProps} />);

      const titleInput = screen.getByLabelText(/title/i);
      await user.type(titleInput, 'New Title');

      expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument();
    });
  });
});