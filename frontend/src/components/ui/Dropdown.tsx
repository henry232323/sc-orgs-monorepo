import React, { Fragment } from 'react';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';

interface DropdownOption {
  value: string;
  label: string;
  description?: string;
}

interface DropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
}

const Dropdown: React.FC<DropdownProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select option',
  disabled = false,
  className = '',
  buttonClassName = '',
}) => {
  const selectedOption = options.find(option => option.value === value);

  return (
    <Menu
      as='div'
      className={`relative ${className.includes('w-full') ? 'block' : 'inline-block'} text-left ${className}`}
    >
      <MenuButton
        disabled={disabled}
        className={`glass-button inline-flex w-full items-center justify-between rounded-[var(--radius-glass-sm)] px-3 py-2 text-sm text-primary border border-glass hover:bg-glass-hover hover:border-glass-hover focus:outline-none focus:ring-2 focus:ring-glass-focus focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-[var(--duration-normal)] ${buttonClassName}`}
      >
        <span className={selectedOption ? 'text-primary' : 'text-tertiary'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDownIcon className='h-4 w-4 text-tertiary' aria-hidden='true' />
      </MenuButton>

      <MenuItems className='absolute left-0 z-50 mt-2 w-full origin-top-left rounded-[var(--radius-dropdown)] bg-dark-glass border border-glass-border shadow-[var(--shadow-glass-lg)] backdrop-blur-[var(--blur-glass-strong)] focus:outline-none'>
        <div className='py-1'>
          {options.map(option => (
            <MenuItem key={option.value} as={Fragment}>
              {() => (
                <button
                  onClick={() => onChange(option.value)}
                  className={`w-full flex items-center px-3 py-2 text-sm text-white hover:bg-white/20 hover:backdrop-blur-sm transition-all duration-150 first:rounded-t-[var(--radius-dropdown)] last:rounded-b-[var(--radius-dropdown)] [text-shadow:0_1px_2px_rgba(0,0,0,0.8)] border-b border-white/10 last:border-b-0 ${
                    option.value === value ? 'bg-white/10' : ''
                  }`}
                >
                  <div className='flex flex-col'>
                    <span className='font-medium'>{option.label}</span>
                    {option.description && (
                      <span className='text-xs text-tertiary'>
                        {option.description}
                      </span>
                    )}
                  </div>
                  {option.value === value && (
                    <div className='ml-auto h-2 w-2 rounded-full bg-[var(--color-accent-blue)]'></div>
                  )}
                </button>
              )}
            </MenuItem>
          ))}
        </div>
      </MenuItems>
    </Menu>
  );
};

export default Dropdown;
