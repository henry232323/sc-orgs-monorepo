import React from 'react';
import Paper from '../../ui/Paper';
import Button from '../../ui/Button';
import { ComponentTitle } from '../../ui/Typography';
import MarkdownEditor from './MarkdownEditor';
import type { Document } from '../../../types/hr';

interface DocumentEditorModalProps {
  isOpen: boolean;
  editingDocument?: Document | null;
  onClose: () => void;
  onSave: (content: string, metadata: {
    title: string;
    description?: string;
    folder_path: string;
    requires_acknowledgment: boolean;
    access_roles: string[];
  }) => Promise<void>;
  isLoading: boolean;
}

const DocumentEditorModal: React.FC<DocumentEditorModalProps> = ({
  isOpen,
  editingDocument,
  onClose,
  onSave,
  isLoading,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <Paper 
        variant="glass-elevated" 
        className="w-full max-w-6xl h-[95vh] sm:h-[90vh] flex flex-col shadow-[var(--shadow-glass-xl)] border-glass-border glass-mobile-reduced"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between responsive-padding-x responsive-padding-y border-b border-glass-border">
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
        <div className="flex-1 min-h-0 overflow-hidden bg-glass rounded-b-[var(--radius-paper)]">
          <MarkdownEditor
            initialContent={editingDocument?.content || ''}
            {...(editingDocument && { document: editingDocument })}
            onSave={onSave}
            onCancel={onClose}
            isLoading={isLoading}
            className="h-full"
          />
        </div>
      </Paper>
    </div>
  );
};

export default DocumentEditorModal;