import React, { useState, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  CheckCircleIcon,
  ClockIcon,
  PencilIcon,
  ArrowDownTrayIcon,
  PrinterIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import Paper from '../../ui/Paper';
import Button from '../../ui/Button';
import Chip from '../../ui/Chip';
import { ComponentTitle, ComponentSubtitle, Caption } from '../../ui/Typography';
import MarkdownDocumentErrorBoundary from './MarkdownDocumentErrorBoundary';
import { DocumentExportService, type DocumentMetadata } from '../../../services/DocumentExportService';
import type { Document } from '../../../types/hr';
import './DocumentViewer.css';

interface DocumentViewerProps {
  document: Document;
  onEdit?: () => void;
  onAcknowledge?: () => void;
  showAcknowledgmentStatus?: boolean;
  isAcknowledging?: boolean;
  acknowledgmentStatus?: {
    current_user_acknowledged: boolean;
    current_user_acknowledged_at?: string;
  };
}

interface DocumentViewerState {
  renderError: Error | null;
  isExporting: boolean;
  exportFormat: 'html' | 'pdf' | 'markdown' | null;
  showExportMenu: boolean;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({
  document,
  onEdit,
  onAcknowledge,
  showAcknowledgmentStatus = true,
  isAcknowledging = false,
  acknowledgmentStatus,
}) => {
  const [state, setState] = useState<DocumentViewerState>({
    renderError: null,
    isExporting: false,
    exportFormat: null,
    showExportMenu: false,
  });

  // Document type detection - for now all documents are markdown-based
  const isMarkdownDocument = useMemo(() => {
    return Boolean(document.content);
  }, [document.content]);

  // Legacy file document detection (for backward compatibility)
  const isFileDocument = useMemo(() => {
    return !document.content && Boolean((document as any).file_path);
  }, [document.content]);

  // Handle rendering errors
  const handleRenderError = useCallback((error: Error) => {
    console.error('Document rendering error:', error);
    setState(prev => ({ ...prev, renderError: error }));
  }, []);

  // Clear render error when document changes
  React.useEffect(() => {
    setState(prev => ({ ...prev, renderError: null }));
  }, [document.id]);

  // Format reading time
  const formatReadingTime = useCallback((minutes: number): string => {
    if (minutes < 1) return 'Less than 1 min read';
    if (minutes === 1) return '1 min read';
    return `${Math.round(minutes)} min read`;
  }, []);

  // Format word count
  const formatWordCount = useCallback((count: number): string => {
    if (count < 1000) return `${count} words`;
    return `${(count / 1000).toFixed(1)}k words`;
  }, []);

  // Get acknowledgment status display
  const getAcknowledgmentStatusDisplay = useCallback(() => {
    if (!document.requires_acknowledgment || !showAcknowledgmentStatus) {
      return null;
    }

    if (!acknowledgmentStatus) {
      return (
        <Chip variant="default" size="sm" className="text-tertiary">
          <ClockIcon className="w-3 h-3 animate-spin" />
          Loading...
        </Chip>
      );
    }

    return acknowledgmentStatus.current_user_acknowledged ? (
      <Chip variant="status" size="sm" className="text-success">
        <CheckCircleIcon className="w-3 h-3" />
        Acknowledged
        {acknowledgmentStatus.current_user_acknowledged_at && (
          <span className="ml-1 text-xs opacity-75">
            {new Date(acknowledgmentStatus.current_user_acknowledged_at).toLocaleDateString('en-US', {
              month: 'numeric',
              day: 'numeric',
              year: 'numeric'
            })}
          </span>
        )}
      </Chip>
    ) : (
      <Chip variant="default" size="sm" className="text-warning">
        <ClockIcon className="w-3 h-3" />
        Pending Acknowledgment
      </Chip>
    );
  }, [document.requires_acknowledgment, showAcknowledgmentStatus, acknowledgmentStatus]);

  // Handle print
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // Convert document to metadata format for export
  const getDocumentMetadata = useCallback((): DocumentMetadata => ({
    title: document.title,
    description: document.description || '',
    version: document.version,
    created_at: document.created_at,
    updated_at: document.updated_at,
    word_count: document.word_count,
    estimated_reading_time: document.estimated_reading_time,
    folder_path: document.folder_path,
    requires_acknowledgment: document.requires_acknowledgment,
    access_roles: document.access_roles,
  }), [document]);

  // Handle export functionality
  const handleExport = useCallback(async (format: 'html' | 'pdf' | 'markdown') => {
    if (!isMarkdownDocument) return;

    setState(prev => ({ ...prev, isExporting: true, exportFormat: format, showExportMenu: false }));

    try {
      const metadata = getDocumentMetadata();
      const filename = DocumentExportService.getExportFilename(document.title, format === 'markdown' ? 'md' : format);

      switch (format) {
        case 'html':
          const htmlContent = DocumentExportService.exportToHtml(document.content, metadata, {
            includeMetadata: true,
            includeTableOfContents: true,
          });
          DocumentExportService.downloadFile(htmlContent, filename, 'text/html');
          break;

        case 'pdf':
          await DocumentExportService.exportToPdf(document.content, metadata, {
            includeMetadata: true,
            pageFormat: 'A4',
          });
          break;

        case 'markdown':
          const markdownContent = DocumentExportService.exportToMarkdown(document.content, metadata, {
            includeMetadata: true,
          });
          const mdFilename = DocumentExportService.getExportFilename(document.title, 'md');
          DocumentExportService.downloadFile(markdownContent, mdFilename, 'text/markdown');
          break;
      }
    } catch (error) {
      console.error(`Failed to export document as ${format}:`, error);
      // TODO: Show user-friendly error message
    } finally {
      setState(prev => ({ ...prev, isExporting: false, exportFormat: null }));
    }
  }, [isMarkdownDocument, document, getDocumentMetadata]);

  // Toggle export menu
  const toggleExportMenu = useCallback(() => {
    setState(prev => ({ ...prev, showExportMenu: !prev.showExportMenu }));
  }, []);

  // Close export menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.export-menu-container')) {
        setState(prev => ({ ...prev, showExportMenu: false }));
      }
    };

    if (state.showExportMenu) {
      window.document.addEventListener('mousedown', handleClickOutside);
      return () => window.document.removeEventListener('mousedown', handleClickOutside);
    }
    return undefined;
  }, [state.showExportMenu]);

  // Render error fallback
  const renderErrorFallback = useCallback(() => (
    <Paper variant="glass-elevated" className="p-6 border-l-4 border-error">
      <div className="flex items-start gap-3">
        <ExclamationTriangleIcon className="w-6 h-6 text-error flex-shrink-0 mt-1" />
        <div>
          <h3 className="font-semibold text-error mb-2">Document Rendering Error</h3>
          <p className="text-secondary mb-4">
            There was an error rendering this document. This could be due to invalid markdown syntax
            or corrupted content.
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setState(prev => ({ ...prev, renderError: null }))}
            >
              Try Again
            </Button>
            {onEdit && (
              <Button
                variant="primary"
                size="sm"
                onClick={onEdit}
              >
                <PencilIcon className="w-4 h-4" />
                Edit Document
              </Button>
            )}
          </div>
        </div>
      </div>
    </Paper>
  ), [onEdit]);

  // Render legacy file document
  const renderFileDocument = useCallback(() => (
    <Paper variant="glass-elevated" className="p-6">
      <div className="text-center">
        <div className="text-4xl mb-4">📄</div>
        <ComponentTitle className="mb-2">File Document</ComponentTitle>
        <ComponentSubtitle className="mb-4">
          This is a legacy file-based document. Click below to download and view.
        </ComponentSubtitle>
        <Button
          variant="primary"
          onClick={() => {
            const fileDocument = document as any;
            if (fileDocument.file_path) {
              window.open(`/api/documents/${document.id}/download`, '_blank');
            }
          }}
        >
          <ArrowDownTrayIcon className="w-4 h-4" />
          Download File
        </Button>
      </div>
    </Paper>
  ), [document]);

  // Simple syntax highlighting for code blocks
  const highlightCode = useCallback((code: string, language?: string) => {
    // Basic syntax highlighting for common languages
    if (!language) return code;

    const keywords: Record<string, string[]> = {
      javascript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export'],
      typescript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'interface', 'type'],
      python: ['def', 'class', 'import', 'from', 'return', 'if', 'else', 'elif', 'for', 'while', 'try', 'except'],
      java: ['public', 'private', 'class', 'interface', 'return', 'if', 'else', 'for', 'while', 'try', 'catch'],
      sql: ['SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'TABLE', 'INDEX'],
    };

    const langKeywords = keywords[language.toLowerCase()];
    if (!langKeywords) return code;

    let highlightedCode = code;
    langKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      highlightedCode = highlightedCode.replace(regex, `<span class="text-brand-secondary font-semibold">${keyword}</span>`);
    });

    return highlightedCode;
  }, []);

  // Render markdown content
  const renderMarkdownContent = useCallback(() => {
    if (state.renderError) {
      return renderErrorFallback();
    }

    return (
      <MarkdownDocumentErrorBoundary
        onError={handleRenderError}
        documentId={document.id}
        organizationId={document.organization_id}
        operation="view"
        enableRetry={true}
      >
        <div className="prose prose-slate max-w-none dark:prose-invert print:prose-print">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              // Enhanced heading components with better styling
              h1: ({ children }) => (
                <h1 className="text-3xl font-bold text-primary mb-6 pb-3 border-b-2 border-glass-border">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-2xl font-semibold text-primary mt-8 mb-4 pb-2 border-b border-glass-border">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-xl font-semibold text-primary mt-6 mb-3">
                  {children}
                </h3>
              ),
              h4: ({ children }) => (
                <h4 className="text-lg font-semibold text-primary mt-4 mb-2">
                  {children}
                </h4>
              ),
              h5: ({ children }) => (
                <h5 className="text-base font-semibold text-primary mt-3 mb-2">
                  {children}
                </h5>
              ),
              h6: ({ children }) => (
                <h6 className="text-sm font-semibold text-primary mt-2 mb-1">
                  {children}
                </h6>
              ),
              
              // Enhanced paragraph styling
              p: ({ children }) => (
                <p className="text-secondary leading-relaxed mb-4 text-justify">
                  {children}
                </p>
              ),
              
              // Enhanced blockquote with better styling
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-brand-secondary pl-6 py-3 my-6 bg-glass-subtle rounded-r-lg italic">
                  <div className="text-secondary">
                    {children}
                  </div>
                </blockquote>
              ),
              
              // Enhanced code components with syntax highlighting
              code: ({ className, children, ...props }) => {
                const inline = (props as any).inline;
                const match = /language-(\w+)/.exec(className || '');
                const language = match ? match[1] : undefined;
                const codeString = String(children).replace(/\n$/, '');
                
                if (inline) {
                  return (
                    <code className="bg-glass-elevated px-2 py-1 rounded text-sm font-mono text-brand-secondary border border-glass-border">
                      {children}
                    </code>
                  );
                }
                
                return (
                  <div className="relative my-4">
                    {language && (
                      <div className="absolute top-0 right-0 bg-glass-elevated px-3 py-1 rounded-bl-lg text-xs text-tertiary font-mono border-l border-b border-glass-border">
                        {language}
                      </div>
                    )}
                    <pre className="bg-glass-elevated p-4 rounded-lg overflow-x-auto border border-glass-border">
                      <code 
                        className="text-sm font-mono text-secondary"
                        dangerouslySetInnerHTML={{ 
                          __html: language ? highlightCode(codeString, language) : codeString 
                        }}
                      />
                    </pre>
                  </div>
                );
              },
              
              // Enhanced table styling
              table: ({ children }) => (
                <div className="overflow-x-auto my-6 rounded-lg border border-glass-border">
                  <table className="min-w-full border-collapse">
                    {children}
                  </table>
                </div>
              ),
              thead: ({ children }) => (
                <thead className="bg-glass-elevated">
                  {children}
                </thead>
              ),
              th: ({ children }) => (
                <th className="border-b border-glass-border px-4 py-3 text-left font-semibold text-primary">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="border-b border-glass-border px-4 py-3 text-secondary">
                  {children}
                </td>
              ),
              
              // Enhanced list styling
              ul: ({ children }) => (
                <ul className="list-disc list-outside ml-6 space-y-2 mb-4 text-secondary">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal list-outside ml-6 space-y-2 mb-4 text-secondary">
                  {children}
                </ol>
              ),
              li: ({ children, className }) => {
                // Handle GFM task lists
                const isTaskList = className?.includes('task-list-item');
                if (isTaskList) {
                  return (
                    <li className="flex items-start gap-2 leading-relaxed list-none ml-0">
                      {children}
                    </li>
                  );
                }
                return (
                  <li className="leading-relaxed">
                    {children}
                  </li>
                );
              },
              
              // Enhanced task list checkbox styling
              input: ({ type, checked, disabled }) => {
                if (type === 'checkbox') {
                  return (
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      className="mr-2 mt-1 rounded border-glass-border focus:ring-brand-secondary"
                      readOnly
                    />
                  );
                }
                return <input type={type} checked={checked} disabled={disabled} />;
              },
              
              // Enhanced link styling
              a: ({ href, children }) => (
                <a
                  href={href}
                  className="text-brand-secondary hover:text-brand-primary underline decoration-brand-secondary/50 hover:decoration-brand-primary transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {children}
                </a>
              ),
              
              // Enhanced image styling
              img: ({ src, alt }) => (
                <img
                  src={src}
                  alt={alt}
                  className="max-w-full h-auto rounded-lg border border-glass-border my-4 shadow-glass-sm"
                />
              ),
              
              // Horizontal rule styling
              hr: () => (
                <hr className="my-8 border-0 h-px bg-gradient-to-r from-transparent via-glass-border to-transparent" />
              ),
              
              // Enhanced emphasis styling
              em: ({ children }) => (
                <em className="italic text-primary">
                  {children}
                </em>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-primary">
                  {children}
                </strong>
              ),
              
              // Strikethrough styling (GFM)
              del: ({ children }) => (
                <del className="line-through text-tertiary">
                  {children}
                </del>
              ),
            }}
          >
            {document.content}
          </ReactMarkdown>
        </div>
      </MarkdownDocumentErrorBoundary>
    );
  }, [document.content, state.renderError, handleRenderError, renderErrorFallback, highlightCode]);

  return (
    <div className="space-y-6">
      {/* Document Header */}
      <Paper variant="glass" className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 min-w-0">
            <ComponentTitle className="mb-2 truncate">
              {document.title}
            </ComponentTitle>
            {document.description && (
              <ComponentSubtitle className="mb-3">
                {document.description}
              </ComponentSubtitle>
            )}
            
            {/* Document Metadata */}
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <Caption>
                Version {document.version}
              </Caption>
              <Caption>
                Created {new Date(document.created_at).toLocaleDateString()}
              </Caption>
              <Caption>
                Updated {new Date(document.updated_at).toLocaleDateString()}
              </Caption>
              {isMarkdownDocument && (
                <>
                  <Caption>
                    {formatWordCount(document.word_count)}
                  </Caption>
                  <Caption>
                    {formatReadingTime(document.estimated_reading_time)}
                  </Caption>
                </>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0 document-viewer-actions">
            {showAcknowledgmentStatus && getAcknowledgmentStatusDisplay()}
            
            {showAcknowledgmentStatus &&
             document.requires_acknowledgment && 
             acknowledgmentStatus && 
             !acknowledgmentStatus.current_user_acknowledged && 
             onAcknowledge && (
              <Button
                variant="primary"
                size="sm"
                onClick={onAcknowledge}
                disabled={isAcknowledging}
              >
                <CheckCircleIcon className="w-4 h-4" />
                {isAcknowledging ? 'Acknowledging...' : 'Acknowledge'}
              </Button>
            )}
            
            {onEdit && isMarkdownDocument && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onEdit}
              >
                <PencilIcon className="w-4 h-4" />
                Edit
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrint}
              aria-label="Print Document"
            >
              <PrinterIcon className="w-4 h-4" />
            </Button>
            
            {isMarkdownDocument && (
              <div className="relative export-menu-container">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleExportMenu}
                  aria-label="Export Document"
                  disabled={state.isExporting}
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  <ChevronDownIcon className="w-3 h-3 ml-1" />
                </Button>
                
                {state.showExportMenu && (
                  <div className="absolute right-0 top-full mt-1 bg-glass-elevated border border-glass-border rounded-lg shadow-glass-lg z-50 min-w-[160px]">
                    <div className="py-1">
                      <button
                        onClick={() => handleExport('html')}
                        disabled={state.isExporting}
                        className="w-full px-4 py-2 text-left text-sm text-secondary hover:bg-glass-hover hover:text-primary transition-colors disabled:opacity-50"
                      >
                        Export as HTML
                      </button>
                      <button
                        onClick={() => handleExport('pdf')}
                        disabled={state.isExporting}
                        className="w-full px-4 py-2 text-left text-sm text-secondary hover:bg-glass-hover hover:text-primary transition-colors disabled:opacity-50"
                      >
                        Export as PDF
                      </button>
                      <button
                        onClick={() => handleExport('markdown')}
                        disabled={state.isExporting}
                        className="w-full px-4 py-2 text-left text-sm text-secondary hover:bg-glass-hover hover:text-primary transition-colors disabled:opacity-50"
                      >
                        Export as Markdown
                      </button>
                    </div>
                  </div>
                )}
                
                {state.isExporting && (
                  <div className="absolute right-0 top-full mt-1 bg-glass-elevated border border-glass-border rounded-lg shadow-glass-lg z-50 px-4 py-2">
                    <div className="flex items-center gap-2 text-sm text-secondary">
                      <div className="w-4 h-4 border-2 border-brand-secondary border-t-transparent rounded-full animate-spin"></div>
                      Exporting as {state.exportFormat?.toUpperCase()}...
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Paper>

      {/* Document Content */}
      <Paper variant="glass-subtle" className="p-8 print:shadow-none print:border-none">
        <div className="document-viewer-content">
          {isFileDocument ? renderFileDocument() : renderMarkdownContent()}
        </div>
      </Paper>
    </div>
  );
};

export default DocumentViewer;