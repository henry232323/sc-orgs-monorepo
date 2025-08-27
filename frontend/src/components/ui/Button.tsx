import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  variant?:
    | 'primary'
    | 'secondary'
    | 'danger'
    | 'ghost'
    | 'outline'
    | 'text'
    | 'glass';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: (e?: React.MouseEvent) => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  type = 'button',
  className = '',
}) => {
  const baseClasses =
    'inline-flex items-center gap-2 rounded-[var(--radius-button)] font-semibold text-primary transition-all duration-[var(--duration-normal)] ease-[var(--ease-glass)] focus:not-data-focus:outline-none data-focus:outline data-focus:outline-[var(--color-glass-border-focus)] cursor-pointer';

  const variantClasses = {
    primary:
      'bg-gray-700/70 hover:bg-gray-600/80 hover:shadow-[var(--shadow-glass-md)] hover:shadow-gray-600/20 shadow-[var(--shadow-glass-inset)] transform hover:scale-[var(--scale-button-hover)] active:scale-[var(--scale-button-active)] backdrop-blur-sm border border-gray-600/50',
    secondary: 'glass-button border-glass hover:border-glass-hover',
    danger:
      'bg-error hover:bg-[var(--color-error)] hover:shadow-[var(--shadow-glass-md)] hover:shadow-red-600/20 shadow-[var(--shadow-glass-inset)] transform hover:scale-[var(--scale-button-hover)] active:scale-[var(--scale-button-active)]',
    ghost:
      'hover:bg-glass-hover hover:shadow-[var(--shadow-glass-sm)] transform hover:scale-[var(--scale-button-hover)] active:scale-[var(--scale-button-active)]',
    outline:
      'bg-transparent hover:bg-glass-hover hover:shadow-[var(--shadow-glass-sm)] border border-glass-hover hover:border-glass-focus transform hover:scale-[var(--scale-button-hover)] active:scale-[var(--scale-button-active)]',
    text: 'hover:bg-glass hover:shadow-[var(--shadow-glass-sm)] transform hover:scale-[var(--scale-button-hover)] active:scale-[var(--scale-button-active)]',
    glass: 'glass-button',
  };

  const sizeClasses = {
    sm: 'px-3 py-2 text-xs leading-tight',
    md: 'px-4 py-2.5 text-sm leading-normal',
    lg: 'px-6 py-3 text-base leading-normal',
  };

  const disabledClasses = disabled
    ? 'opacity-50 cursor-not-allowed hover:scale-100 active:scale-100 pointer-events-none'
    : '';

  const classes = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    disabledClasses,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      className={classes}
      onClick={(e) => onClick?.(e)}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export default Button;
