import React from 'react';

interface PaperProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'glass' | 'glass-subtle' | 'glass-strong';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  interactive?: boolean;
}

const Paper: React.FC<PaperProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  interactive = false,
}) => {
  // Base classes using theme variables
  const baseClasses =
    'rounded-[var(--radius-glass-lg)] border transition-all duration-[var(--duration-normal)] ease-[var(--ease-glass)]';

  const variantClasses = {
    default: 'glass',
    elevated: 'glass-elevated',
    glass: 'glass',
    'glass-subtle': 'glass-subtle',
    'glass-strong': 'glass-strong',
  };

  const sizeClasses = {
    sm: 'glass-card-sm',
    md: 'glass-card',
    lg: 'glass-card-lg',
    xl: 'glass-card-xl',
  };

  const interactiveClasses = interactive
    ? 'glass-interactive cursor-pointer'
    : '';

  const classes = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    interactiveClasses,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <div className={classes}>{children}</div>;
};

export default Paper;
