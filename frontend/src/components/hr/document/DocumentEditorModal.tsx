import React, { useEffect } from 'react';
import Paper from '../../ui/Paper';
import Button from '../../ui/Button';
import { ComponentTitle } from '../../ui/Typography';
import MarkdownEditor from './MarkdownEditor';
import type { Document } from '../../../types/hr';

interface DocumentEditorModalProps {
  isOpen: boolean;
  editingDocument?: Document | null;
  organizationId: string;
  onClose: () => void;
  onSave: (content: string, metadata: {
    title: string;
    description?: string;
    folder_path: string;
    requires_acknowledgment: boolean;
    access_roles: string[];
  }) => Promise<Document>;
  isLoading: boolean;
}

const DocumentEditorModal: React.FC<DocumentEditorModalProps> = ({
  isOpen,
  editingDocument,
  organizationId,
  onClose,
  onSave,
  isLoading,
}) => {
  // Prevent body scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
      return () => {
        document.body.classList.remove('modal-open');
      };
    }
    return undefined;
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 p-2 sm:p-4 modal-backdrop-scrollable">
      <div className="w-full max-w-6xl modal-min-height my-4 modal-content-scrollable">
        <Paper 
          variant="glass-elevated" 
          className="w-full flex flex-col shadow-[var(--shadow-glass-xl)] border-glass-border glass-mobile-reduced"
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between responsive-padding-x responsive-padding-y border-b border-glass-border flex-shrink-0">
            <ComponentTitle className="responsive-text-lg text-primary">
              {editingDocument ? 'Edit Document' : 'Create New Document'}
            </ComponentTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="touch-friendly text-primary hover:text-secondary hover:bg-glass-hover"
              disabled={isLoading}
              title="Close editor"
            >
              ✕
            </Button>
          </div>
          
          {/* Modal Content */}
          <div className="flex-1 bg-glass rounded-b-[var(--radius-paper)]">
            <MarkdownEditor
              initialContent={editingDocument?.content || ''}
              {...(editingDocument && { document: editingDocument })}
              organizationId={organizationId}
              onSave={onSave}
              onCancel={onClose}
              isLoading={isLoading}
              className="min-h-[600px]"
            />
          </div>
        </Paper>
      </div>
    </div>
  );
};

export default DocumentEditorModal;