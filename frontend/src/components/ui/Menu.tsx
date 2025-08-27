import React from 'react';
import { Menu as HeadlessMenu } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

interface MenuOption {
  id: string | number;
  label: string;
  description?: string;
  disabled?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
}

interface MenuProps {
  options: MenuOption[];
  trigger: React.ReactNode;
  triggerClassName?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  align?: 'left' | 'right';
}

const Menu: React.FC<MenuProps> = ({
  options,
  trigger,
  triggerClassName = '',
  size = 'md',
  className = '',
  align = 'left',
}) => {
  const sizeClasses = {
    sm: 'py-1 text-sm leading-normal',
    md: 'py-1 text-sm leading-normal',
    lg: 'py-1 text-base leading-normal',
  };

  const alignClasses = {
    left: 'left-0',
    right: 'right-0',
  };

  return (
    <HeadlessMenu
      as='div'
      className={`relative inline-block text-left ${className}`}
    >
      <HeadlessMenu.Button
        className={`
          glass-button inline-flex items-center justify-center w-full rounded-[var(--radius-glass-sm)] 
          px-4 py-2 text-sm font-semibold text-primary hover:bg-glass-hover 
          focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)] focus:ring-opacity-50
          transition-all duration-[var(--duration-normal)]
          ${triggerClassName}
        `}
      >
        {trigger}
        <ChevronDownIcon className='ml-2 h-4 w-4' aria-hidden='true' />
      </HeadlessMenu.Button>

      <HeadlessMenu.Items
        className={`
          absolute z-10 mt-2 w-56 origin-top-right glass-elevated rounded-[var(--radius-glass-lg)] 
          shadow-[var(--shadow-glass-xl)] border border-glass py-1 focus:outline-none
          ${sizeClasses[size]}
          ${alignClasses[align]}
        `}
      >
        <div className='py-1'>
          {options.map(option => (
            <HeadlessMenu.Item key={option.id}>
              {({ active, disabled }) => (
                <button
                  onClick={option.onClick}
                  disabled={option.disabled || disabled}
                  className={`
                    ${active ? 'bg-glass-hover text-primary' : 'text-secondary'}
                    ${option.disabled || disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    group flex w-full items-center px-4 py-2 text-sm transition-all duration-[var(--duration-fast)]
                  `}
                >
                  {option.icon && (
                    <option.icon
                      className={`
                        mr-3 h-5 w-5 ${active ? 'text-primary' : 'text-muted'}
                      `}
                      aria-hidden='true'
                    />
                  )}
                  <div className='flex flex-col'>
                    <span
                      className={`${active ? 'font-semibold' : 'font-normal'}`}
                    >
                      {option.label}
                    </span>
                    {option.description && (
                      <span className='text-xs text-muted'>
                        {option.description}
                      </span>
                    )}
                  </div>
                </button>
              )}
            </HeadlessMenu.Item>
          ))}
        </div>
      </HeadlessMenu.Items>
    </HeadlessMenu>
  );
};

export default Menu;
