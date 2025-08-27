import React from 'react';
import { ListBulletIcon, CalendarIcon } from '@heroicons/react/24/outline';

// ===== VIEW TOGGLE INTERFACES =====

type ViewMode = 'list' | 'calendar' | 'grid' | 'card';

interface ViewOption {
  value: ViewMode;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

interface ViewToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  options?: ViewOption[];
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

// ===== DEFAULT VIEW OPTIONS =====

const DEFAULT_LIST_CALENDAR_OPTIONS: ViewOption[] = [
  {
    value: 'list',
    label: 'List',
    icon: ListBulletIcon,
  },
  {
    value: 'calendar',
    label: 'Calendar',
    icon: CalendarIcon,
  },
];

// ===== VIEW TOGGLE COMPONENT =====

/**
 * Reusable view mode toggle component with glass styling
 * Perfect for switching between list/calendar, grid/card views, etc.
 */
const ViewToggle: React.FC<ViewToggleProps> = ({
  value,
  onChange,
  options = DEFAULT_LIST_CALENDAR_OPTIONS,
  size = 'md',
  className = '',
  label,
}) => {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const containerSizeClasses = {
    sm: 'p-0.5',
    md: 'p-1',
    lg: 'p-1.5',
  };

  const iconSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {label && (
        <span className='text-secondary text-sm whitespace-nowrap'>
          {label}:
        </span>
      )}

      <div
        className={`flex bg-glass border border-glass rounded-[var(--radius-button)] ${containerSizeClasses[size]}`}
      >
        {options.map(option => {
          const isSelected = value === option.value;

          return (
            <button
              key={option.value}
              onClick={() => onChange(option.value)}
              className={`
                ${sizeClasses[size]}
                rounded-[var(--radius-button)] 
                transition-all duration-[var(--duration-normal)] 
                flex items-center gap-1.5
                ${
                  isSelected
                    ? 'bg-[var(--color-accent-blue)] text-primary shadow-[var(--shadow-glass-sm)] backdrop-blur-[var(--blur-glass-sm)]'
                    : 'text-tertiary hover:text-primary hover:bg-glass-hover'
                }
              `}
              type='button'
            >
              <option.icon className={iconSizeClasses[size]} />
              <span className='whitespace-nowrap'>{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ===== PRESET COMPONENTS =====

/**
 * Pre-configured Event view toggle (List/Calendar)
 */
export const EventViewToggle: React.FC<{
  value: 'list' | 'calendar';
  onChange: (mode: 'list' | 'calendar') => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}> = ({ value, onChange, size = 'md', className = '', label = 'View' }) => {
  return (
    <ViewToggle
      value={value}
      onChange={onChange as (mode: ViewMode) => void}
      options={DEFAULT_LIST_CALENDAR_OPTIONS}
      size={size}
      className={className}
      label={label}
    />
  );
};

/**
 * Generic List/Calendar toggle (for backwards compatibility)
 */
export const ListCalendarToggle = EventViewToggle;

/**
 * Customizable view toggle for any view modes
 */
export const CustomViewToggle = ViewToggle;

export default ViewToggle;
