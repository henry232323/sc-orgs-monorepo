import React from 'react';
import { XMarkIcon } from '@heroicons/react/20/solid';

interface ChipProps {
  children: React.ReactNode;
  variant?: 'default' | 'selected' | 'interactive' | 'status';
  size?: 'sm' | 'md' | 'lg';
  removable?: boolean;
  onRemove?: () => void;
  icon?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Chip: React.FC<ChipProps> = ({
  children,
  variant = 'default',
  size = 'md',
  removable = false,
  onRemove,
  icon,
  className = '',
  onClick,
}) => {
  const baseClasses =
    'inline-flex items-center gap-2 rounded-full font-medium transition-all duration-[var(--duration-normal)] ease-[var(--ease-glass)]';

  const variantClasses = {
    default: 'bg-glass text-secondary border border-glass',
    selected:
      'bg-glass-elevated text-primary border border-glass-hover shadow-[var(--shadow-glass-sm)]',
    interactive:
      'bg-glass text-secondary border border-glass hover:bg-glass-hover hover:text-primary hover:border-glass-hover hover:shadow-[var(--shadow-glass-sm)] cursor-pointer transform hover:scale-[var(--scale-hover)] active:scale-[var(--scale-active)]',
    status: 'bg-success text-success border border-success',
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs leading-tight',
    md: 'px-3 py-1.5 text-sm leading-normal',
    lg: 'px-4 py-2 text-base leading-normal',
  };

  const interactiveClasses = onClick ? 'cursor-pointer' : '';

  const classes = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    interactiveClasses,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.stopPropagation();
      onClick();
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRemove) {
      onRemove();
    }
  };

  return (
    <div className={classes} onClick={handleClick}>
      {icon && <span className='size-4 fill-current'>{icon}</span>}
      <span className='truncate'>{children}</span>
      {removable && onRemove && (
        <button
          onClick={handleRemove}
          className='size-4 rounded hover:bg-glass-hover transition-colors duration-[var(--duration-fast)]'
          aria-label='Remove'
        >
          <XMarkIcon className='size-3 fill-current' />
        </button>
      )}
    </div>
  );
};

export default Chip;
