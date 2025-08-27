import React from 'react';
import MDEditor from '@uiw/react-md-editor';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: number;
  preview?: 'edit' | 'preview' | 'live';
  className?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  placeholder = 'Write your content here...',
  height = 200,
  preview = 'edit',
  className = '',
  label,
  error,
  disabled = false,
}) => {
  const handleChange = (val?: string) => {
    onChange(val || '');
  };

  return (
    <div className={`space-y-[var(--spacing-tight)] ${className}`}>
      {label && (
        <label className='block text-sm font-medium text-secondary'>
          {label}
        </label>
      )}

      <div
        data-color-mode='dark'
        className={disabled ? 'opacity-50 pointer-events-none' : ''}
      >
        <MDEditor
          value={value}
          onChange={handleChange}
          preview={preview}
          height={height}
          textareaProps={{
            placeholder,
            disabled,
          }}
          visibleDragbar={false}
        />
      </div>

      {error && <p className='text-error text-sm'>{error}</p>}
    </div>
  );
};

export default MarkdownEditor;
