import React from 'react';

interface TextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  description?: string;
  error?: string | undefined;
  disabled?: boolean;
  required?: boolean;
  rows?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  id?: string;
  name?: string;
  maxLength?: number;
}

const Textarea: React.FC<TextareaProps> = ({
  value,
  onChange,
  placeholder,
  label,
  description,
  error,
  disabled = false,
  required = false,
  rows = 4,
  size = 'md',
  className = '',
  id,
  name,
  maxLength,
}) => {
  // Use theme variables for consistent sizing
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm leading-normal',
    md: 'px-4 py-2.5 text-sm leading-normal',
    lg: 'px-4 py-3 text-base leading-normal',
  };

  const textareaId =
    id || name || `textarea-${Math.random().toString(36).substr(2, 9)}`;

  // Base classes using theme system
  const baseClasses =
    'input-glass w-full resize-vertical text-primary placeholder:text-muted transition-all duration-[var(--duration-normal)] ease-[var(--ease-smooth)]';

  const errorClasses = error
    ? 'border-error bg-error focus:border-error focus:shadow-[0_0_0_3px_var(--color-error-bg)]'
    : 'focus:border-glass-focus focus:shadow-[0_0_0_3px_var(--color-glass-bg-hover)]';

  const disabledClasses = disabled
    ? 'opacity-50 cursor-not-allowed pointer-events-none bg-glass'
    : 'hover:border-glass-hover hover:bg-glass-hover';

  const classes = [
    baseClasses,
    sizeClasses[size],
    errorClasses,
    disabledClasses,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className='w-full'>
      {label && (
        <label
          htmlFor={textareaId}
          className={`block text-sm font-semibold text-primary mb-[var(--spacing-tight)] ${
            disabled ? 'opacity-50' : ''
          }`}
        >
          {label}
          {required && <span className='text-error ml-1'>*</span>}
        </label>
      )}

      <textarea
        id={textareaId}
        name={name}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        rows={rows}
        maxLength={maxLength}
        className={classes}
      />

      {description && !error && (
        <p
          className={`mt-[var(--spacing-tight)] text-xs text-tertiary ${
            disabled ? 'opacity-50' : ''
          }`}
        >
          {description}
        </p>
      )}

      {error && (
        <p className='mt-[var(--spacing-tight)] text-xs text-error'>{error}</p>
      )}

      {maxLength && (
        <p className='mt-1 text-xs text-muted text-right'>
          {value.length}/{maxLength}
        </p>
      )}
    </div>
  );
};

export default Textarea;
