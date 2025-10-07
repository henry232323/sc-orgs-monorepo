import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import MarkdownValidationFeedback from '../MarkdownValidationFeedback';

describe('MarkdownValidationFeedback', () => {
  const mockOnNavigateToIssue = jest.fn();

  beforeEach(() => {
    mockOnNavigateToIssue.mockClear();
  });

  it('should show loading state when validating', () => {
    render(<MarkdownValidationFeedback isValidating={true} />);
    
    expect(screen.getByText('Validating content...')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument(); // Loading spinner
  });

  it('should show success state when content is valid', () => {
    const validationContext = {
      wordCount: 150,
      estimatedReadingTime: 2,
      contentLength: 1024,
    };

    render(
      <MarkdownValidationFeedback 
        validationContext={validationContext}
      />
    );
    
    expect(screen.getByText('Content is valid')).toBeInTheDocument();
    expect(screen.getByText('150 words • 2 min read')).toBeInTheDocument();
  });

  it('should display validation errors with user-friendly messages', () => {
    const errors = [
      {
        code: 'MARKDOWN_VALIDATION_ERROR',
        message: 'Technical error message',
        line: 5,
        column: 10,
      },
      {
        code: 'UNBALANCED_BRACKETS',
        message: 'Missing closing bracket',
        line: 12,
      },
    ];

    render(
      <MarkdownValidationFeedback 
        errors={errors}
        onNavigateToIssue={mockOnNavigateToIssue}
      />
    );
    
    expect(screen.getByText('2 Errors Found')).toBeInTheDocument();
    expect(screen.getByText('The document contains formatting errors. Please check your markdown syntax.')).toBeInTheDocument();
    expect(screen.getByText('Check for unmatched square brackets [ ] in your links.')).toBeInTheDocument();
    
    // Check for actionable advice
    expect(screen.getByText('Check your markdown syntax for errors')).toBeInTheDocument();
    expect(screen.getByText('Check that every [ has a matching ]')).toBeInTheDocument();
  });

  it('should display validation warnings', () => {
    const warnings = [
      {
        code: 'LONG_LINES',
        message: 'Lines too long',
        line: 8,
      },
      {
        code: 'EXTERNAL_LINKS',
        message: 'External links detected',
      },
    ];

    render(<MarkdownValidationFeedback warnings={warnings} />);
    
    expect(screen.getByText('2 Warnings')).toBeInTheDocument();
    expect(screen.getByText('These issues won\'t prevent saving but may affect the document\'s appearance or performance.')).toBeInTheDocument();
    expect(screen.getByText('Some lines are very long and may affect readability.')).toBeInTheDocument();
    expect(screen.getByText('External links detected. They will open in new tabs for security.')).toBeInTheDocument();
  });

  it('should handle navigation to error lines', () => {
    const errors = [
      {
        code: 'MARKDOWN_VALIDATION_ERROR',
        message: 'Error at line 5',
        line: 5,
        column: 10,
      },
    ];

    render(
      <MarkdownValidationFeedback 
        errors={errors}
        onNavigateToIssue={mockOnNavigateToIssue}
      />
    );
    
    const lineButton = screen.getByText('Line 5');
    fireEvent.click(lineButton);
    
    expect(mockOnNavigateToIssue).toHaveBeenCalledWith(5, 10);
  });

  it('should show technical details when enabled', () => {
    const errors = [
      {
        code: 'MARKDOWN_VALIDATION_ERROR',
        message: 'Technical validation error',
        field: 'content',
        line: 5,
        column: 10,
      },
    ];

    render(
      <MarkdownValidationFeedback 
        errors={errors}
        showTechnicalDetails={true}
      />
    );
    
    // Technical details should be in a collapsible section
    const detailsElement = screen.getByText('Technical Details');
    expect(detailsElement).toBeInTheDocument();
    
    fireEvent.click(detailsElement);
    
    expect(screen.getByText('Code: MARKDOWN_VALIDATION_ERROR')).toBeInTheDocument();
    expect(screen.getByText('Message: Technical validation error')).toBeInTheDocument();
    expect(screen.getByText('Field: content')).toBeInTheDocument();
    expect(screen.getByText('Line: 5')).toBeInTheDocument();
    expect(screen.getByText('Column: 10')).toBeInTheDocument();
  });

  it('should display validation context statistics', () => {
    const errors = [
      {
        code: 'MARKDOWN_VALIDATION_ERROR',
        message: 'Error message',
      },
    ];

    const validationContext = {
      wordCount: 1500,
      estimatedReadingTime: 8,
      contentLength: 10240,
    };

    render(
      <MarkdownValidationFeedback 
        errors={errors}
        validationContext={validationContext}
      />
    );
    
    expect(screen.getByText('Document Statistics')).toBeInTheDocument();
    expect(screen.getByText('1,500 words')).toBeInTheDocument();
    expect(screen.getByText('8 min read')).toBeInTheDocument();
    expect(screen.getByText('10.0 KB')).toBeInTheDocument();
  });

  it('should provide appropriate error messages for different error codes', () => {
    const testCases = [
      {
        code: 'MARKDOWN_CONTENT_TOO_LARGE',
        expectedMessage: 'The document is too large. Please reduce the content size.',
      },
      {
        code: 'MARKDOWN_SECURITY_ERROR',
        expectedMessage: 'The document contains potentially unsafe content that has been flagged.',
      },
      {
        code: 'INVALID_LINK',
        expectedMessage: 'One or more links are invalid or use unsupported protocols.',
      },
      {
        code: 'DEEP_NESTING',
        expectedMessage: 'Lists are nested too deeply. Consider simplifying the structure.',
      },
    ];

    testCases.forEach(({ code, expectedMessage }) => {
      const { unmount } = render(
        <MarkdownValidationFeedback 
          errors={[{ code, message: 'Technical message' }]}
        />
      );
      
      expect(screen.getByText(expectedMessage)).toBeInTheDocument();
      unmount();
    });
  });

  it('should provide actionable advice for different error types', () => {
    const errors = [
      {
        code: 'INVALID_LINK',
        message: 'Invalid link detected',
      },
    ];

    render(<MarkdownValidationFeedback errors={errors} />);
    
    expect(screen.getByText('Check that URLs start with http:// or https://')).toBeInTheDocument();
    expect(screen.getByText('Ensure link text is enclosed in square brackets [text]')).toBeInTheDocument();
    expect(screen.getByText('Verify URLs are enclosed in parentheses (url)')).toBeInTheDocument();
  });

  it('should handle mixed errors and warnings', () => {
    const errors = [
      {
        code: 'MARKDOWN_VALIDATION_ERROR',
        message: 'Validation error',
      },
    ];

    const warnings = [
      {
        code: 'LONG_LINES',
        message: 'Long lines detected',
      },
    ];

    render(
      <MarkdownValidationFeedback 
        errors={errors}
        warnings={warnings}
      />
    );
    
    expect(screen.getByText('1 Error Found')).toBeInTheDocument();
    expect(screen.getByText('1 Warning')).toBeInTheDocument();
  });

  it('should handle empty error and warning arrays', () => {
    render(
      <MarkdownValidationFeedback 
        errors={[]}
        warnings={[]}
      />
    );
    
    expect(screen.getByText('Content is valid')).toBeInTheDocument();
  });

  it('should not show navigation buttons when onNavigateToIssue is not provided', () => {
    const errors = [
      {
        code: 'MARKDOWN_VALIDATION_ERROR',
        message: 'Error at line 5',
        line: 5,
      },
    ];

    render(<MarkdownValidationFeedback errors={errors} />);
    
    expect(screen.queryByText('Line 5')).not.toBeInTheDocument();
  });
});