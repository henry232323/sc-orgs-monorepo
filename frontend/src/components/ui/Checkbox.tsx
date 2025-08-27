import React from 'react';
import { CheckIcon } from '@heroicons/react/24/outline';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!disabled) {
      onChange(e.target.checked);
    }
  };

  return (
    <label
      className={`flex items-start cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {/* Hidden native checkbox for accessibility */}
      <input
        type='checkbox'
        checked={checked}
        onChange={handleChange}
        disabled={disabled}
        className='sr-only'
      />

      {/* Custom checkbox visual */}
      <div
        className='flex-shrink-0'
        style={{
          marginRight: label || description ? 'var(--spacing-element)' : '0',
        }}
      >
        <div
          className={`
            ${sizeClasses[size]}
            border-2 rounded-[var(--radius-xs)] transition-all duration-[var(--duration-normal)]
            flex items-center justify-center cursor-pointer
            ${
              checked
                ? 'bg-brand-secondary border-brand-secondary shadow-[0_0_0_3px_rgba(0,184,255,0.1)]'
                : 'border-glass-border bg-transparent hover:border-glass-hover'
            }
            ${!disabled && 'hover:scale-110 active:scale-95'}
          `}
        >
          {checked && (
            <CheckIcon
              className={`${iconSizes[size]} text-white transition-all duration-[var(--duration-fast)]`}
              strokeWidth={3}
            />
          )}
        </div>
      </div>

      {/* Label and description */}
      {(label || description) && (
        <div className='flex-1'>
          {label && (
            <div className='text-sm font-medium text-primary cursor-pointer'>
              {label}
            </div>
          )}
          {description && (
            <div
              className='text-xs text-tertiary'
              style={{ marginTop: label ? 'var(--spacing-tight)' : '0' }}
            >
              {description}
            </div>
          )}
        </div>
      )}
    </label>
  );
};

export default Checkbox;
