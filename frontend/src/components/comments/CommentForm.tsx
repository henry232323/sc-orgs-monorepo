import React, { useState, useEffect } from 'react';
import { Button, MarkdownEditor } from '../ui';

interface CommentFormProps {
  onSubmit: (content: string) => void;
  onCancel?: () => void;
  initialContent?: string;
  placeholder?: string;
  submitLabel?: string;
  cancelLabel?: string;
  isSubmitting?: boolean;
  maxLength?: number;
}

const CommentForm: React.FC<CommentFormProps> = ({
  onSubmit,
  onCancel,
  initialContent = '',
  placeholder = 'Write your comment...',
  submitLabel = 'Post Comment',
  cancelLabel = 'Cancel',
  isSubmitting = false,
  maxLength = 1000,
}) => {
  const [content, setContent] = useState(initialContent);
  const [charCount, setCharCount] = useState(initialContent.length);

  useEffect(() => {
    setContent(initialContent);
    setCharCount(initialContent.length);
  }, [initialContent]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim() && !isSubmitting) {
      onSubmit(content.trim());
      setContent('');
      setCharCount(0);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
      setContent('');
      setCharCount(0);
    }
  };

  const handleContentChange = (value: string) => {
    setContent(value);
    setCharCount(value.length);
  };

  const isContentValid =
    content.trim().length > 0 && content.trim().length <= maxLength;
  const isOverLimit = charCount > maxLength;

  return (
    <form onSubmit={handleSubmit} className='space-y-[var(--spacing-element)]'>
      <div className='relative'>
        <MarkdownEditor
          value={content}
          onChange={handleContentChange}
          placeholder={placeholder}
          height={120}
          preview='edit'
          disabled={isSubmitting}
        />
        <div className='flex items-center justify-between mt-2'>
          <div className='text-sm text-tertiary'>
            {charCount}/{maxLength} characters
          </div>
          {isOverLimit && (
            <div className='text-sm text-error'>Comment is too long</div>
          )}
        </div>
      </div>

      <div className='flex items-center justify-end gap-[var(--spacing-tight)]'>
        {onCancel && (
          <Button
            type='button'
            variant='glass'
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            {cancelLabel}
          </Button>
        )}
        <Button
          type='submit'
          variant='primary'
          disabled={!isContentValid || isSubmitting}
        >
          {isSubmitting ? 'Posting...' : submitLabel}
        </Button>
      </div>
    </form>
  );
};

export default CommentForm;
