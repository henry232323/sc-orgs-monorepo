import React from 'react';
import { ComponentSubtitle } from '../../ui/Typography';

interface ValidationError {
  code: string;
  message: string;
  field?: string;
  line?: number;
  column?: number;
}

interface ValidationWarning {
  code: string;
  message: string;
  field?: string;
  line?: number;
  column?: number;
}

interface MarkdownValidationFeedbackProps {
  /**
   * Validation errors that prevent saving
   */
  errors?: ValidationError[];
  /**
   * Validation warnings that don't prevent saving
   */
  warnings?: ValidationWarning[];
  /**
   * Whether to show detailed technical information
   */
  showTechnicalDetails?: boolean;
  /**
   * Whether the validation is currently running
   */
  isValidating?: boolean;
  /**
   * Callback when user clicks on an error/warning to navigate to it
   */
  onNavigateToIssue?: (line?: number, column?: number) => void;
  /**
   * Additional context about the validation
   */
  validationContext?: {
    wordCount?: number;
    estimatedReadingTime?: number;
    contentLength?: number;
  };
}

/**
 * Component for displaying markdown validation feedback
 * Shows user-friendly error messages and warnings with actionable guidance
 */
const MarkdownValidationFeedback: React.FC<MarkdownValidationFeedbackProps> = ({
  errors = [],
  warnings = [],
  showTechnicalDetails = false,
  isValidating = false,
  onNavigateToIssue,
  validationContext,
}) => {
  const hasErrors = errors.length > 0;
  const hasWarnings = warnings.length > 0;
  const hasIssues = hasErrors || hasWarnings;

  if (isValidating) {
    return (
      <div className="p-3 bg-white/5 rounded-lg border border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-accent-blue border-t-transparent rounded-full animate-spin"></div>
          <ComponentSubtitle className="text-secondary text-sm">
            Validating content...
          </ComponentSubtitle>
        </div>
      </div>
    );
  }

  if (!hasIssues) {
    return (
      <div className="p-3 bg-success/10 rounded-lg border border-success/20">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <ComponentSubtitle className="text-success text-sm">
            Content is valid
          </ComponentSubtitle>
          {validationContext && (
            <span className="text-xs text-tertiary ml-auto">
              {validationContext.wordCount} words • {validationContext.estimatedReadingTime} min read
            </span>
          )}
        </div>
      </div>
    );
  }

  const getUserFriendlyMessage = (code: string, message: string): string => {
    switch (code) {
      case 'MARKDOWN_VALIDATION_ERROR':
        return 'The document contains formatting errors. Please check your markdown syntax.';
      case 'MARKDOWN_CONTENT_TOO_LARGE':
        return 'The document is too large. Please reduce the content size.';
      case 'MARKDOWN_SECURITY_ERROR':
        return 'The document contains potentially unsafe content that has been flagged.';
      case 'INVALID_LINK':
        return 'One or more links are invalid or use unsupported protocols.';
      case 'INVALID_IMAGE':
        return 'One or more images are invalid or too large.';
      case 'UNBALANCED_BRACKETS':
        return 'Check for unmatched square brackets [ ] in your links.';
      case 'UNBALANCED_PARENTHESES':
        return 'Check for unmatched parentheses ( ) in your links.';
      case 'LONG_LINES':
        return 'Some lines are very long and may affect readability.';
      case 'DEEP_NESTING':
        return 'Lists are nested too deeply. Consider simplifying the structure.';
      case 'LARGE_TABLE':
        return 'Tables are very large and may affect performance.';
      case 'EXTERNAL_LINKS':
        return 'External links detected. They will open in new tabs for security.';
      case 'DATA_URLS':
        return 'Embedded images detected. Large images may affect performance.';
      case 'SUSPICIOUS_DOMAIN':
        return 'Links to potentially suspicious domains have been flagged.';
      default:
        return message;
    }
  };

  const getActionableAdvice = (code: string): string[] => {
    switch (code) {
      case 'MARKDOWN_VALIDATION_ERROR':
        return [
          'Check for proper markdown syntax',
          'Ensure headers use # symbols correctly',
          'Verify list formatting with - or * symbols',
          'Check that code blocks use ``` properly',
        ];
      case 'MARKDOWN_CONTENT_TOO_LARGE':
        return [
          'Split the document into smaller sections',
          'Remove unnecessary content or images',
          'Use links to reference external content',
          'Consider creating multiple related documents',
        ];
      case 'INVALID_LINK':
        return [
          'Check that URLs start with http:// or https://',
          'Ensure link text is enclosed in square brackets [text]',
          'Verify URLs are enclosed in parentheses (url)',
          'Remove any special characters from URLs',
        ];
      case 'INVALID_IMAGE':
        return [
          'Check that image URLs are valid and accessible',
          'Reduce image file sizes if they\'re too large',
          'Use supported image formats (PNG, JPG, GIF, SVG)',
          'Consider using external image hosting',
        ];
      case 'UNBALANCED_BRACKETS':
        return [
          'Check that every [ has a matching ]',
          'Look for missing closing brackets in links',
          'Ensure link text is properly enclosed',
        ];
      case 'LONG_LINES':
        return [
          'Break long lines into shorter paragraphs',
          'Use line breaks for better readability',
          'Consider using lists for long content',
        ];
      case 'DEEP_NESTING':
        return [
          'Reduce list nesting to 3 levels or fewer',
          'Consider using separate sections instead',
          'Use headers to organize complex content',
        ];
      default:
        return ['Review the flagged content and make necessary adjustments'];
    }
  };

  return (
    <div className="space-y-3">
      {/* Errors */}
      {hasErrors && (
        <div className="p-4 bg-error/10 rounded-lg border border-error/20">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-error mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div className="flex-1">
              <ComponentSubtitle className="text-error font-medium mb-2">
                {errors.length === 1 ? '1 Error Found' : `${errors.length} Errors Found`}
              </ComponentSubtitle>
              <div className="space-y-3">
                {errors.map((error, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-error">
                        {getUserFriendlyMessage(error.code, error.message)}
                      </p>
                      {(error.line || error.column) && onNavigateToIssue && (
                        <button
                          onClick={() => onNavigateToIssue(error.line, error.column)}
                          className="text-xs text-error hover:text-error/80 underline flex-shrink-0"
                        >
                          Line {error.line}
                        </button>
                      )}
                    </div>
                    
                    {/* Actionable advice */}
                    <div className="ml-4 space-y-1">
                      {getActionableAdvice(error.code).map((advice, adviceIndex) => (
                        <div key={adviceIndex} className="flex items-start gap-2 text-xs text-error/80">
                          <span className="mt-1">•</span>
                          <span>{advice}</span>
                        </div>
                      ))}
                    </div>

                    {/* Technical details */}
                    {showTechnicalDetails && (
                      <details className="ml-4">
                        <summary className="text-xs text-error/60 cursor-pointer hover:text-error/80">
                          Technical Details
                        </summary>
                        <div className="mt-1 p-2 bg-error/5 rounded text-xs font-mono text-error/80">
                          <div><strong>Code:</strong> {error.code}</div>
                          <div><strong>Message:</strong> {error.message}</div>
                          {error.field && <div><strong>Field:</strong> {error.field}</div>}
                          {error.line && <div><strong>Line:</strong> {error.line}</div>}
                          {error.column && <div><strong>Column:</strong> {error.column}</div>}
                        </div>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Warnings */}
      {hasWarnings && (
        <div className="p-4 bg-warning/10 rounded-lg border border-warning/20">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-warning mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div className="flex-1">
              <ComponentSubtitle className="text-warning font-medium mb-2">
                {warnings.length === 1 ? '1 Warning' : `${warnings.length} Warnings`}
              </ComponentSubtitle>
              <p className="text-xs text-warning/80 mb-3">
                These issues won't prevent saving but may affect the document's appearance or performance.
              </p>
              <div className="space-y-3">
                {warnings.map((warning, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-warning">
                        {getUserFriendlyMessage(warning.code, warning.message)}
                      </p>
                      {(warning.line || warning.column) && onNavigateToIssue && (
                        <button
                          onClick={() => onNavigateToIssue(warning.line, warning.column)}
                          className="text-xs text-warning hover:text-warning/80 underline flex-shrink-0"
                        >
                          Line {warning.line}
                        </button>
                      )}
                    </div>
                    
                    {/* Actionable advice for warnings */}
                    <div className="ml-4 space-y-1">
                      {getActionableAdvice(warning.code).slice(0, 2).map((advice, adviceIndex) => (
                        <div key={adviceIndex} className="flex items-start gap-2 text-xs text-warning/80">
                          <span className="mt-1">•</span>
                          <span>{advice}</span>
                        </div>
                      ))}
                    </div>

                    {/* Technical details */}
                    {showTechnicalDetails && (
                      <details className="ml-4">
                        <summary className="text-xs text-warning/60 cursor-pointer hover:text-warning/80">
                          Technical Details
                        </summary>
                        <div className="mt-1 p-2 bg-warning/5 rounded text-xs font-mono text-warning/80">
                          <div><strong>Code:</strong> {warning.code}</div>
                          <div><strong>Message:</strong> {warning.message}</div>
                          {warning.field && <div><strong>Field:</strong> {warning.field}</div>}
                          {warning.line && <div><strong>Line:</strong> {warning.line}</div>}
                          {warning.column && <div><strong>Column:</strong> {warning.column}</div>}
                        </div>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Validation context */}
      {validationContext && hasIssues && (
        <div className="p-3 bg-white/5 rounded-lg border border-white/10">
          <div className="flex items-center justify-between text-xs text-tertiary">
            <span>Document Statistics</span>
            <div className="flex items-center gap-4">
              {validationContext.wordCount && (
                <span>{validationContext.wordCount.toLocaleString()} words</span>
              )}
              {validationContext.estimatedReadingTime && (
                <span>{validationContext.estimatedReadingTime} min read</span>
              )}
              {validationContext.contentLength && (
                <span>{(validationContext.contentLength / 1024).toFixed(1)} KB</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarkdownValidationFeedback;