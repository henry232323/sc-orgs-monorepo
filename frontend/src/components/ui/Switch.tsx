import React from 'react';
import { Switch as HeadlessSwitch } from '@headlessui/react';

interface SwitchProps {
  enabled: boolean;
  checked?: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
}

const Switch: React.FC<SwitchProps> = ({
  enabled,
  checked,
  onChange,
  disabled = false,
  label,
  description,
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'h-5 w-9',
    md: 'h-6 w-11',
    lg: 'h-7 w-14',
  };

  const thumbSizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  const thumbTranslateClasses = {
    sm: enabled ? 'translate-x-4' : 'translate-x-1',
    md: enabled ? 'translate-x-6' : 'translate-x-1',
    lg: enabled ? 'translate-x-8' : 'translate-x-1',
  };

  // Use checked prop if provided, otherwise fall back to enabled
  const isChecked = checked !== undefined ? checked : enabled;

  return (
    <div className='flex items-center space-x-3'>
      <HeadlessSwitch
        checked={isChecked}
        onChange={onChange}
        disabled={disabled}
        className={`
          ${isChecked ? 'bg-brand-secondary' : 'bg-glass-elevated'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${sizeClasses[size]}
          relative inline-flex items-center rounded-[var(--radius-toggle)] transition-all duration-[var(--duration-normal)] focus:outline-none focus:ring-2 focus:ring-brand-secondary/50 border border-glass-border
        `}
      >
        <span
          className={`
            ${thumbTranslateClasses[size]}
            ${thumbSizeClasses[size]}
            inline-block transform rounded-full bg-white transition-transform duration-[var(--duration-normal)] shadow-[var(--shadow-glass-sm)]
          `}
        />
      </HeadlessSwitch>

      {(label || description) && (
        <div className='flex flex-col'>
          {label && (
            <span
              className={`text-sm font-semibold text-primary ${disabled ? 'opacity-50' : ''}`}
            >
              {label}
            </span>
          )}
          {description && (
            <span
              className={`text-xs text-tertiary ${disabled ? 'opacity-50' : ''}`}
            >
              {description}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default Switch;
