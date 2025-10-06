import React from 'react';

interface InputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'email' | 'password' | 'search' | 'url' | 'date';
  disabled?: boolean;
  error?: string | undefined;
  className?: string;
  label?: string;
  required?: boolean;
  icon?: React.ReactNode;
  onKeyPress?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

const Input: React.FC<InputProps> = ({
  value,
  onChange,
  placeholder,
  type = 'text',
  disabled = false,
  error,
  className = '',
  label,
  required = false,
  icon,
  onKeyPress,
}) => {
  // Use theme variables for consistent styling
  const baseClasses =
    'input-glass w-full text-primary placeholder:text-muted transition-all duration-[var(--duration-normal)] ease-[var(--ease-smooth)]';

  const errorClasses = error
    ? 'border-error focus:border-error focus:shadow-[0_0_0_3px_var(--color-error-bg)]'
    : 'focus:border-glass-focus focus:shadow-[0_0_0_3px_var(--color-glass-bg-hover)]';

  const disabledClasses = disabled
    ? 'opacity-50 cursor-not-allowed pointer-events-none'
    : 'hover:border-glass-hover';

  const classes = [baseClasses, errorClasses, disabledClasses, className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className='w-full'>
      {label && (
        <label className='block text-sm font-medium text-secondary mb-[var(--spacing-tight)]'>
          {label}
          {required && <span className='text-error ml-1'>*</span>}
        </label>
      )}
      <div className='relative'>
        {icon && (
          <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
            <div className='h-5 w-5 text-muted'>{icon}</div>
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyPress={onKeyPress}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`${classes} ${icon ? 'pl-10' : ''}`}
        />
      </div>
      {error && (
        <p className='mt-[var(--spacing-tight)] text-sm text-error'>{error}</p>
      )}
    </div>
  );
};

export default Input;
