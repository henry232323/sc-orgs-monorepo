import React from 'react';
import Switch from './Switch';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: () => void;
  label: string;
  description?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  label,
  description,
  className = '',
  size = 'md',
}) => {
  return (
    <div
      className={`flex items-center justify-between bg-glass-elevated border border-glass-border rounded-[var(--radius-paper)] ${className}`}
      style={{ padding: 'var(--spacing-element)' }}
    >
      <div>
        <h4 className='text-sm font-medium text-primary'>{label}</h4>
        {description && <p className='text-xs text-tertiary'>{description}</p>}
      </div>
      <Switch enabled={checked} onChange={onChange} size={size} />
    </div>
  );
};

export default ToggleSwitch;
