import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface SidebarItemProps {
  children: React.ReactNode;
  href?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'nested';
  className?: string;
}

const SidebarItem: React.FC<SidebarItemProps> = ({
  children,
  href,
  icon,
  onClick,
  variant = 'default',
  className = '',
}) => {
  const location = useLocation();
  const isActive = href
    ? location.pathname === href ||
      (href !== '/events' &&
        href !== '/organizations' &&
        location.pathname.startsWith(href + '/'))
    : false;

  const baseClasses = `group flex items-center gap-3 rounded-[var(--radius-nav)] px-3 py-2 text-sm leading-normal transition-all duration-[var(--duration-normal)] cursor-pointer border ${
    variant === 'nested' ? 'ml-4 text-sm' : ''
  } ${
    isActive
      ? 'bg-glass-elevated border-glass-hover text-primary shadow-[var(--shadow-glass-sm)] backdrop-blur-[var(--blur-glass-medium)]'
      : 'text-tertiary border-transparent hover:bg-glass-hover hover:text-primary hover:shadow-[var(--shadow-glass-md)] hover:scale-[var(--scale-button-hover)] hover:border-glass-hover active:scale-[var(--scale-button-active)]'
  } ${className}`;

  const content = (
    <>
      {icon && (
        <span
          className={`size-5 transition-all duration-[var(--duration-normal)] ${
            isActive
              ? 'text-secondary'
              : 'text-muted group-hover:text-primary group-hover:scale-110'
          }`}
        >
          {icon}
        </span>
      )}
      <span className='truncate'>{children}</span>
    </>
  );

  if (href) {
    return (
      <Link to={href} className={baseClasses}>
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button onClick={onClick} className={baseClasses} type='button'>
        {content}
      </button>
    );
  }

  return <div className={baseClasses}>{content}</div>;
};

export default SidebarItem;
