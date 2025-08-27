import React from 'react';

interface FilterGroupProps {
  children: React.ReactNode;
  title: string;
  icon?: React.ReactNode;
  description?: string;
  className?: string;
  variant?: 'default' | 'collapsible';
  defaultExpanded?: boolean;
}

const FilterGroup: React.FC<FilterGroupProps> = ({
  children,
  title,
  icon,
  description,
  className = '',
  variant = 'default',
  defaultExpanded = true,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

  const baseClasses = 'space-y-[var(--spacing-tight)]';
  const headerClasses = 'flex items-center mb-[var(--spacing-tight)]';
  const classes = [baseClasses, className].filter(Boolean).join(' ');

  const toggleExpanded = () => {
    if (variant === 'collapsible') {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div className={classes}>
      <div className={headerClasses}>
        {icon && <span className='w-5 h-5 text-muted mr-2'>{icon}</span>}
        <span className='text-sm font-semibold text-secondary'>{title}</span>
        {variant === 'collapsible' && (
          <button
            onClick={toggleExpanded}
            className='ml-auto p-1 rounded-[var(--radius-glass-sm)] hover:bg-glass-hover transition-colors duration-[var(--duration-normal)]'
            aria-label={isExpanded ? 'Collapse filters' : 'Expand filters'}
          >
            <svg
              className={`w-3 h-3 text-muted transition-transform duration-[var(--duration-normal)] ${
                isExpanded ? '' : '-rotate-90'
              }`}
              fill='currentColor'
              viewBox='0 0 20 20'
            >
              <path
                fillRule='evenodd'
                d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z'
                clipRule='evenodd'
              />
            </svg>
          </button>
        )}
      </div>

      {description && (
        <p className='text-xs text-tertiary mb-[var(--spacing-tight)]'>
          {description}
        </p>
      )}

      <div className={isExpanded ? '' : 'hidden'}>{children}</div>
    </div>
  );
};

export default FilterGroup;
