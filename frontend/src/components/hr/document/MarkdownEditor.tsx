import React, { useState, useCallback, useEffect, useMemo } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { Document } from '../../../types/hr';
import { debounce } from 'lodash';
import Input from '../../ui/Input';
import Textarea from '../../ui/Textarea';
import Checkbox from '../../ui/Checkbox';
import Button from '../../ui/Button';
import Select, { SelectOption } from '../../ui/Select';

// Document metadata interface for the editor
export interface DocumentMetadata {
  title: string;
  description?: string;
  folder_path: string;
  requires_acknowledgment: boolean;
  access_roles: string[];
}

// Props interface for the MarkdownEditor component
export interface MarkdownEditorProps {
  initialContent?: string;
  onSave: (content: string, metadata: DocumentMetadata) => Promise<void>;
  onCancel: () => void;
  document?: Document; // For editing existing documents
  isLoading?: boolean;
  className?: string;
}

// Save status type for user feedback
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  initialContent = '',
  onSave,
  onCancel,
  document,
  isLoading = false,
  className = ''
}) => {
  // Content state
  const [content, setContent] = useState<string>(initialContent);
  const [metadata, setMetadata] = useState<DocumentMetadata>({
    title: document?.title || '',
    description: document?.description || '',
    folder_path: document?.folder_path || '/',
    requires_acknowledgment: document?.requires_acknowledgment || false,
    access_roles: document?.access_roles || []
  });

  // UI state
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [showHelpPanel, setShowHelpPanel] = useState(false);

  // Update content when initialContent changes
  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  // Track unsaved changes
  useEffect(() => {
    const hasContentChanges = content !== initialContent;
    const hasMetadataChanges = document ? (
      metadata.title !== document.title ||
      metadata.description !== document.description ||
      metadata.folder_path !== document.folder_path ||
      metadata.requires_acknowledgment !== document.requires_acknowledgment ||
      JSON.stringify(metadata.access_roles) !== JSON.stringify(document.access_roles)
    ) : (
      metadata.title !== '' ||
      metadata.description !== '' ||
      metadata.folder_path !== '/' ||
      metadata.requires_acknowledgment !== false ||
      metadata.access_roles.length > 0
    );
    
    setHasUnsavedChanges(hasContentChanges || hasMetadataChanges);
  }, [content, metadata, initialContent, document]);

  // Enhanced content validation with field-specific errors
  const validateContent = useCallback((content: string, metadata: DocumentMetadata): { [key: string]: string } => {
    const errors: { [key: string]: string } = {};
    
    // Title validation
    if (!metadata.title.trim()) {
      errors.title = 'Document title is required';
    } else if (metadata.title.length > 200) {
      errors.title = 'Document title is too long (maximum 200 characters)';
    } else if (metadata.title.length < 3) {
      errors.title = 'Document title must be at least 3 characters';
    }
    
    // Content validation
    if (!content.trim()) {
      errors.content = 'Document content cannot be empty';
    } else if (content.length > 100000) {
      errors.content = 'Document content is too long (maximum 100,000 characters)';
    } else if (content.length < 10) {
      errors.content = 'Document content must be at least 10 characters';
    }
    
    // Description validation
    if (metadata.description && metadata.description.length > 500) {
      errors.description = 'Description is too long (maximum 500 characters)';
    }
    
    // Folder path validation
    if (metadata.folder_path && !metadata.folder_path.startsWith('/')) {
      errors.folder_path = 'Folder path must start with "/"';
    }
    
    // Access roles validation
    if (metadata.access_roles.length === 0) {
      errors.access_roles = 'At least one access role must be selected';
    }
    
    return errors;
  }, []);

  // Handle content change
  const handleContentChange = useCallback((value?: string) => {
    const newContent = value || '';
    setContent(newContent);
    
    // Validate content
    const errors = validateContent(newContent, metadata);
    setValidationErrors(errors);
  }, [metadata, validateContent]);

  // Handle metadata change
  const handleMetadataChange = useCallback((field: keyof DocumentMetadata, value: any) => {
    const newMetadata = { ...metadata, [field]: value };
    setMetadata(newMetadata);
    
    // Validate content with new metadata
    const errors = validateContent(content, newMetadata);
    setValidationErrors(errors);
  }, [content, metadata, validateContent]);

  // Insert markdown syntax at cursor position
  const insertMarkdownSyntax = useCallback((before: string, after: string, placeholder: string) => {
    // This is a simplified version - in a real implementation, you'd need to:
    // 1. Get the current cursor position in the textarea
    // 2. Insert the markdown syntax at that position
    // 3. Update the content state
    // 4. Set the cursor position appropriately
    
    // For now, we'll append to the content as a demonstration
    const newContent = content + (content ? '\n\n' : '') + before + placeholder + after;
    setContent(newContent);
    
    // Validate the new content
    const errors = validateContent(newContent, metadata);
    setValidationErrors(errors);
  }, [content, metadata, validateContent]);

  // Handle cancel with unsaved changes check
  const handleCancel = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowUnsavedWarning(true);
    } else {
      onCancel();
    }
  }, [hasUnsavedChanges, onCancel]);

  // Confirm cancel without saving
  const confirmCancel = useCallback(() => {
    setShowUnsavedWarning(false);
    onCancel();
  }, [onCancel]);

  // Cancel the cancel action
  const cancelCancel = useCallback(() => {
    setShowUnsavedWarning(false);
  }, []);

  // Handle drag and drop for images and links
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const files = Array.from(event.dataTransfer.files);
    const text = event.dataTransfer.getData('text/plain');
    const url = event.dataTransfer.getData('text/uri-list');

    if (files.length > 0) {
      // Handle file drops (images)
      files.forEach(file => {
        if (file.type.startsWith('image/')) {
          const imageName = file.name;
          insertMarkdownSyntax('![', `](${imageName})`, `Alt text for ${imageName}`);
        }
      });
    } else if (url) {
      // Handle URL drops
      const linkText = text || 'Link';
      insertMarkdownSyntax('[', `](${url})`, linkText);
    } else if (text) {
      // Handle plain text drops
      if (text.startsWith('http://') || text.startsWith('https://')) {
        insertMarkdownSyntax('[', `](${text})`, 'Link');
      } else {
        // Just insert the text
        const newContent = content + (content ? '\n\n' : '') + text;
        setContent(newContent);
      }
    }
  }, [content, insertMarkdownSyntax]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (Object.keys(validationErrors).length > 0) {
      return;
    }
    
    setSaveStatus('saving');
    
    try {
      await onSave(content, metadata);
      setSaveStatus('saved');
      setHasUnsavedChanges(false);
      
      // Reset save status after 2 seconds
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to save document:', error);
      setSaveStatus('error');
      
      // Reset error status after 3 seconds
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }, [content, metadata, onSave, validationErrors]);

  // Debounced auto-save functionality
  const debouncedAutoSave = useMemo(
    () => debounce(async () => {
      if (hasUnsavedChanges && Object.keys(validationErrors).length === 0 && metadata.title.trim()) {
        try {
          await onSave(content, metadata);
          setSaveStatus('saved');
          setHasUnsavedChanges(false);
          
          // Reset save status after 2 seconds
          setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (error) {
          console.error('Auto-save failed:', error);
          // Don't show error for auto-save failures to avoid interrupting user
        }
      }
    }, 3000), // 3 second delay for auto-save
    [hasUnsavedChanges, validationErrors, metadata.title, content, metadata, onSave]
  );

  // Trigger auto-save when content or metadata changes
  useEffect(() => {
    if (hasUnsavedChanges && Object.keys(validationErrors).length === 0 && metadata.title.trim()) {
      debouncedAutoSave();
    }
    
    // Cleanup debounced function on unmount
    return () => {
      debouncedAutoSave.cancel();
    };
  }, [hasUnsavedChanges, validationErrors, metadata.title, debouncedAutoSave]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Save shortcut (Ctrl/Cmd + S)
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      handleSave();
      return;
    }

    // Bold shortcut (Ctrl/Cmd + B)
    if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
      event.preventDefault();
      insertMarkdownSyntax('**', '**', 'bold text');
      return;
    }

    // Italic shortcut (Ctrl/Cmd + I)
    if ((event.ctrlKey || event.metaKey) && event.key === 'i') {
      event.preventDefault();
      insertMarkdownSyntax('*', '*', 'italic text');
      return;
    }

    // Code shortcut (Ctrl/Cmd + `)
    if ((event.ctrlKey || event.metaKey) && event.key === '`') {
      event.preventDefault();
      insertMarkdownSyntax('`', '`', 'code');
      return;
    }

    // Link shortcut (Ctrl/Cmd + K)
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
      event.preventDefault();
      insertMarkdownSyntax('[', '](https://example.com)', 'link text');
      return;
    }

    // Heading shortcut (Ctrl/Cmd + H)
    if ((event.ctrlKey || event.metaKey) && event.key === 'h') {
      event.preventDefault();
      insertMarkdownSyntax('## ', '', 'Heading');
      return;
    }
  }, [handleSave]);

  // Add keyboard event listener
  useEffect(() => {
    if (typeof window !== 'undefined' && window.document) {
      window.document.addEventListener('keydown', handleKeyDown);
      return () => window.document.removeEventListener('keydown', handleKeyDown);
    }
    return undefined;
  }, [handleKeyDown]);

  // Warn about unsaved changes when navigating away
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
    return undefined;
  }, [hasUnsavedChanges]);

  // Calculate word count and reading time
  const wordCount = useMemo(() => {
    return content.trim().split(/\s+/).filter(word => word.length > 0).length;
  }, [content]);

  const estimatedReadingTime = useMemo(() => {
    // Average reading speed: 200 words per minute
    return Math.ceil(wordCount / 200);
  }, [wordCount]);

  // Save status indicator
  const renderSaveStatus = () => {
    switch (saveStatus) {
      case 'saving':
        return (
          <span className="text-blue-600 text-sm flex items-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Saving...
          </span>
        );
      case 'saved':
        return (
          <span className="text-green-600 text-sm flex items-center">
            <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Auto-saved
          </span>
        );
      case 'error':
        return (
          <span className="text-red-600 text-sm flex items-center">
            <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Save failed
          </span>
        );
      default:
        if (hasUnsavedChanges) {
          if (Object.keys(validationErrors).length > 0) {
            return (
              <span className="text-warning text-sm flex items-center">
                <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Fix errors to save
              </span>
            );
          }
          return (
            <span className="text-gray-500 text-sm flex items-center">
              <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              Auto-saving...
            </span>
          );
        }
        return null;
    }
  };

  // Access roles options for the select component
  const accessRoleOptions: SelectOption[] = [
    { value: 'member', label: 'Member' },
    { value: 'admin', label: 'Administrator' },
    { value: 'hr', label: 'HR Staff' },
    { value: 'manager', label: 'Manager' },
    { value: 'trainer', label: 'Trainer' },
    { value: 'pilot', label: 'Pilot' },
    { value: 'safety-officer', label: 'Safety Officer' },
  ];

  return (
    <div className={`markdown-editor ${className}`}>
      {/* Header with metadata form */}
      <div className="bg-glass-elevated border-b border-glass-border p-[var(--spacing-card-lg)] backdrop-blur-[var(--blur-glass-strong)]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--spacing-element)]">
          {/* Title */}
          <Input
            label="Title"
            value={metadata.title}
            onChange={(value) => handleMetadataChange('title', value)}
            placeholder="Enter document title"
            disabled={isLoading}
            required
            {...(validationErrors.title && { error: validationErrors.title })}
          />

          {/* Folder Path */}
          <Input
            label="Folder Path"
            value={metadata.folder_path}
            onChange={(value) => handleMetadataChange('folder_path', value)}
            placeholder="/path/to/folder"
            disabled={isLoading}
            {...(validationErrors.folder_path && { error: validationErrors.folder_path })}
          />

          {/* Description */}
          <div className="md:col-span-2">
            <Textarea
              label="Description"
              value={metadata.description || ''}
              onChange={(value) => handleMetadataChange('description', value)}
              placeholder="Brief description of the document"
              disabled={isLoading}
              rows={2}
              {...(validationErrors.description && { error: validationErrors.description })}
              maxLength={500}
            />
          </div>

          {/* Access Roles */}
          <div className="md:col-span-2">
            <Select
              label="Access Roles"
              value={metadata.access_roles}
              onChange={(value) => handleMetadataChange('access_roles', value as string[])}
              options={accessRoleOptions}
              placeholder="Select access roles..."
              disabled={isLoading}
              multiple
              required
              description="Select which roles can access this document"
              {...(validationErrors.access_roles && { error: validationErrors.access_roles })}
            />
          </div>

          {/* Acknowledgment Checkbox */}
          <div className="md:col-span-2">
            <Checkbox
              checked={metadata.requires_acknowledgment}
              onChange={(checked) => handleMetadataChange('requires_acknowledgment', checked)}
              label="Requires acknowledgment"
              description="Users must acknowledge they have read this document"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Validation Errors Summary */}
        {Object.keys(validationErrors).length > 0 && (
          <div className="mt-[var(--spacing-element)] p-[var(--spacing-card)] bg-error/10 border border-error/20 rounded-[var(--radius-glass-sm)] backdrop-blur-[var(--blur-glass-light)]">
            <div className="flex items-start gap-[var(--spacing-tight)]">
              <svg className="h-5 w-5 text-error flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-error mb-[var(--spacing-tight)]">Please fix the following errors:</h3>
                <ul className="text-sm text-error space-y-1">
                  {Object.entries(validationErrors).map(([field, error]) => (
                    <li key={field} className="flex items-start gap-2">
                      <span className="text-error mt-1">•</span>
                      <span><strong className="capitalize">{field.replace('_', ' ')}:</strong> {error}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Custom Toolbar */}
      <div className="bg-glass border-b border-glass-border p-[var(--spacing-card)] backdrop-blur-[var(--blur-glass-strong)]">
        <div className="flex flex-wrap items-center gap-[var(--spacing-tight)]">
          {/* Formatting buttons */}
          <button
            type="button"
            onClick={() => insertMarkdownSyntax('**', '**', 'bold text')}
            className="p-2 text-tertiary hover:text-primary hover:bg-glass-hover rounded-[var(--radius-button)] transition-all duration-[var(--duration-normal)] hover:scale-[var(--scale-button-hover)] active:scale-[var(--scale-button-active)]"
            title="Bold (Ctrl+B)"
            disabled={isLoading}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h6a4 4 0 014 4v.5a3.5 3.5 0 01-2.5 3.36A4 4 0 0114 15v.5a4 4 0 01-4 4H4a1 1 0 01-1-1V4zm2 1v5h4a2 2 0 100-4H5zm0 7v4h5a2 2 0 100-4H5z" clipRule="evenodd" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => insertMarkdownSyntax('*', '*', 'italic text')}
            className="p-2 text-tertiary hover:text-primary hover:bg-glass-hover rounded-[var(--radius-button)] transition-all duration-[var(--duration-normal)]"
            title="Italic (Ctrl+I)"
            disabled={isLoading}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9.5L7.5 16H9a1 1 0 110 2H7a1 1 0 01-1-1h2a1 1 0 110-2h1.5L11.5 4H11a1 1 0 110-2h2a1 1 0 011 1z" clipRule="evenodd" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => insertMarkdownSyntax('`', '`', 'code')}
            className="p-2 text-tertiary hover:text-primary hover:bg-glass-hover rounded-[var(--radius-button)] transition-all duration-[var(--duration-normal)]"
            title="Code (Ctrl+`)"
            disabled={isLoading}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>

          <div className="w-px h-6 bg-white/20 mx-1"></div>

          <button
            type="button"
            onClick={() => insertMarkdownSyntax('## ', '', 'Heading')}
            className="p-2 text-tertiary hover:text-primary hover:bg-glass-hover rounded-[var(--radius-button)] transition-all duration-[var(--duration-normal)]"
            title="Heading (Ctrl+H)"
            disabled={isLoading}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => insertMarkdownSyntax('[', '](https://example.com)', 'link text')}
            className="p-2 text-tertiary hover:text-primary hover:bg-glass-hover rounded-[var(--radius-button)] transition-all duration-[var(--duration-normal)]"
            title="Link (Ctrl+K)"
            disabled={isLoading}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => insertMarkdownSyntax('- ', '', 'List item')}
            className="p-2 text-tertiary hover:text-primary hover:bg-glass-hover rounded-[var(--radius-button)] transition-all duration-[var(--duration-normal)]"
            title="Bullet List"
            disabled={isLoading}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => insertMarkdownSyntax('```\n', '\n```', 'code block')}
            className="p-2 text-tertiary hover:text-primary hover:bg-glass-hover rounded-[var(--radius-button)] transition-all duration-[var(--duration-normal)]"
            title="Code Block"
            disabled={isLoading}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-3.22l-1.14 1.14a.5.5 0 01-.64.05L6 14H5a2 2 0 01-2-2V5zm5.14 7.14L9.28 11H11a1 1 0 000-2H9.28l-1.14-1.14a1 1 0 10-1.42 1.42L7.59 10l-.87.86a1 1 0 001.42 1.42zM13 8a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => insertMarkdownSyntax('| Header 1 | Header 2 |\n|----------|----------|\n| ', ' | Cell 2 |', 'Cell 1')}
            className="p-2 text-tertiary hover:text-primary hover:bg-glass-hover rounded-[var(--radius-button)] transition-all duration-[var(--duration-normal)]"
            title="Table"
            disabled={isLoading}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm0 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z" clipRule="evenodd" />
            </svg>
          </button>

          <div className="w-px h-6 bg-white/20 mx-1"></div>

          {/* Help button */}
          <button
            type="button"
            onClick={() => setShowHelpPanel(!showHelpPanel)}
            className="p-2 text-tertiary hover:text-primary hover:bg-glass-hover rounded-[var(--radius-button)] transition-all duration-[var(--duration-normal)]"
            title="Markdown Help"
            disabled={isLoading}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
          </button>

          {/* Keyboard shortcuts help */}
          <div className="text-xs text-tertiary ml-2">
            <span className="hidden sm:inline">
              Shortcuts: <kbd className="px-1 py-0.5 bg-white/10 rounded text-xs">Ctrl+S</kbd> Save, 
              <kbd className="px-1 py-0.5 bg-white/10 rounded text-xs ml-1">Ctrl+B</kbd> Bold, 
              <kbd className="px-1 py-0.5 bg-white/10 rounded text-xs ml-1">Ctrl+I</kbd> Italic
            </span>
          </div>
        </div>
      </div>

      {/* Markdown Help Panel */}
      {showHelpPanel && (
        <div className="bg-brand-secondary/10 border-b border-brand-secondary/20 p-[var(--spacing-card-lg)] backdrop-blur-[var(--blur-glass-strong)]">
          <div className="max-w-4xl">
            <h3 className="text-sm font-semibold text-primary mb-3">Markdown Quick Reference</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div>
                <h4 className="font-semibold text-primary mb-2">Text Formatting</h4>
                <div className="space-y-1 text-secondary">
                  <div><code>**bold**</code> → <strong>bold</strong></div>
                  <div><code>*italic*</code> → <em>italic</em></div>
                  <div><code>`code`</code> → <code>code</code></div>
                  <div><code>~~strikethrough~~</code> → <del>strikethrough</del></div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-primary mb-2">Headings</h4>
                <div className="space-y-1 text-secondary">
                  <div><code># Heading 1</code></div>
                  <div><code>## Heading 2</code></div>
                  <div><code>### Heading 3</code></div>
                  <div><code>#### Heading 4</code></div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-blue-800 mb-2">Lists</h4>
                <div className="space-y-1 text-blue-700">
                  <div><code>- Bullet list</code></div>
                  <div><code>1. Numbered list</code></div>
                  <div><code>- [ ] Task list</code></div>
                  <div><code>- [x] Completed task</code></div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-blue-800 mb-2">Links & Images</h4>
                <div className="space-y-1 text-blue-700">
                  <div><code>[Link text](URL)</code></div>
                  <div><code>![Alt text](image.jpg)</code></div>
                  <div><code>&lt;https://example.com&gt;</code></div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-blue-800 mb-2">Code Blocks</h4>
                <div className="space-y-1 text-blue-700">
                  <div><code>```javascript</code></div>
                  <div><code>console.log('Hello');</code></div>
                  <div><code>```</code></div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-blue-800 mb-2">Tables</h4>
                <div className="space-y-1 text-blue-700">
                  <div><code>| Header 1 | Header 2 |</code></div>
                  <div><code>|----------|----------|</code></div>
                  <div><code>| Cell 1   | Cell 2   |</code></div>
                </div>
              </div>
            </div>
            
            <div className="mt-3 pt-3 border-t border-blue-200">
              <h4 className="font-medium text-blue-800 mb-2">Keyboard Shortcuts</h4>
              <div className="flex flex-wrap gap-4 text-blue-700">
                <span><kbd className="px-1 py-0.5 bg-blue-200 rounded text-xs">Ctrl+S</kbd> Save</span>
                <span><kbd className="px-1 py-0.5 bg-blue-200 rounded text-xs">Ctrl+B</kbd> Bold</span>
                <span><kbd className="px-1 py-0.5 bg-blue-200 rounded text-xs">Ctrl+I</kbd> Italic</span>
                <span><kbd className="px-1 py-0.5 bg-blue-200 rounded text-xs">Ctrl+K</kbd> Link</span>
                <span><kbd className="px-1 py-0.5 bg-blue-200 rounded text-xs">Ctrl+H</kbd> Heading</span>
                <span><kbd className="px-1 py-0.5 bg-blue-200 rounded text-xs">Ctrl+`</kbd> Code</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Editor */}
      <div 
        className="flex-1 min-h-0"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <MDEditor
          value={content}
          onChange={handleContentChange}
          preview="live"
          hideToolbar={false}
          visibleDragbar={false}
          height={600}
          data-color-mode="light"
          className="w-full"
          textareaProps={{
            placeholder: 'Write your markdown content here...\n\n# Example Heading\n\nYou can use **bold**, *italic*, and `code` formatting.\n\n- Create lists\n- Add links: [Example](https://example.com)\n- Insert code blocks:\n\n```javascript\nconsole.log("Hello, world!");\n```\n\nDrag and drop images or links here!',
            style: {
              fontSize: '14px',
              lineHeight: '1.6',
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace'
            }
          }}
        />
      </div>

      {/* Footer with actions and status */}
      <div className="bg-glass-elevated border-t border-glass-border p-[var(--spacing-card-lg)] backdrop-blur-[var(--blur-glass-strong)]">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-[var(--spacing-element)]">
          {/* Document stats */}
          <div className="flex items-center gap-[var(--spacing-element)] text-sm text-tertiary">
            <span>{wordCount} words</span>
            <span>{estimatedReadingTime} min read</span>
            {renderSaveStatus()}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-[var(--spacing-tight)]">
            <Button
              variant="secondary"
              onClick={handleCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={isLoading || Object.keys(validationErrors).length > 0}
            >
              {isLoading ? 'Saving...' : document ? 'Update Document' : 'Create Document'}
            </Button>
          </div>
        </div>
      </div>

      {/* Unsaved changes warning dialog */}
      {showUnsavedWarning && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="bg-glass-elevated border border-glass-border rounded-[var(--radius-modal)] shadow-[var(--shadow-glass-xl)] backdrop-blur-[var(--blur-glass-strong)] w-full max-w-md p-[var(--spacing-card-xl)]">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-warning/20 mb-[var(--spacing-element)]">
                <svg className="h-6 w-6 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-primary mb-[var(--spacing-tight)]">Unsaved Changes</h3>
              <p className="text-sm text-secondary mb-[var(--spacing-component)]">
                You have unsaved changes that will be lost if you continue. Are you sure you want to leave without saving?
              </p>
              <div className="flex items-center justify-center gap-[var(--spacing-tight)]">
                <Button
                  variant="secondary"
                  onClick={cancelCancel}
                >
                  Keep Editing
                </Button>
                <Button
                  variant="danger"
                  onClick={confirmCancel}
                >
                  Discard Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarkdownEditor;