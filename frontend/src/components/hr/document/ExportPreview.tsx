import React, { useState, useEffect } from 'react';
import { EyeIcon } from '@heroicons/react/24/outline';
import Dialog from '../../ui/Dialog';
import Button from '../../ui/Button';
import { DocumentExportService, type DocumentMetadata, type ExportOptions } from '../../../services/DocumentExportService';

interface ExportPreviewProps {
  content: string;
  metadata: DocumentMetadata;
  format: 'html' | 'md';
  options?: ExportOptions;
  className?: string;
}

export const ExportPreview: React.FC<ExportPreviewProps> = ({
  content,
  metadata,
  format,
  options = {},
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      generatePreview();
    }
  }, [isOpen, content, metadata, format, options]);

  const generatePreview = () => {
    try {
      let preview: string;
      
      if (format === 'html') {
        preview = DocumentExportService.exportToHtml(content, metadata, options);
      } else if (format === 'md') {
        preview = DocumentExportService.exportToMarkdown(content, metadata, options);
      } else {
        preview = 'Preview not available for this format';
      }
      
      setPreviewContent(preview);
    } catch (error) {
      console.error('Failed to generate preview:', error);
      setPreviewContent('Failed to generate preview');
    }
  };

  const handleDownload = () => {
    try {
      if (format === 'html') {
        DocumentExportService.downloadFile(
          previewContent,
          DocumentExportService.getExportFilename(metadata.title, 'html'),
          'text/html'
        );
      } else if (format === 'md') {
        DocumentExportService.downloadFile(
          previewContent,
          DocumentExportService.getExportFilename(metadata.title, 'md'),
          'text/markdown'
        );
      }
    } catch (error) {
      console.error('Failed to download:', error);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className={className}
      >
        <EyeIcon className="w-4 h-4" />
        Preview {format.toUpperCase()}
      </Button>

      <Dialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={`Export Preview - ${format.toUpperCase()}`}
        size="xl"
      >
        <div className="flex items-center justify-end mb-4">
          <Button
            variant="primary"
            size="sm"
            onClick={handleDownload}
          >
            Download
          </Button>
        </div>

        <div className="bg-white/5 rounded-[var(--radius-glass-sm)] p-4 max-h-96 overflow-auto">
          {format === 'html' ? (
            <div className="bg-white rounded-[var(--radius-glass-sm)] border p-4">
              <iframe
                srcDoc={previewContent}
                className="w-full h-96 border-0"
                title="HTML Preview"
              />
            </div>
          ) : (
            <pre className="text-sm text-secondary whitespace-pre-wrap font-mono">
              {previewContent}
            </pre>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-glass-border">
          <div className="flex justify-between items-center text-sm text-tertiary">
            <span>
              Document: {metadata.title} (Version {metadata.version})
            </span>
            <span>
              {metadata.word_count} words • {metadata.estimated_reading_time} min read
            </span>
          </div>
        </div>
      </Dialog>
    </>
  );
};