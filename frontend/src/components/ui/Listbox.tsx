import React from 'react';
import {
  Listbox as HeadlessListbox,
  ListboxButton,
  ListboxOptions,
  ListboxOption,
  Transition,
} from '@headlessui/react';
import { Fragment } from 'react';
import { ChevronUpDownIcon, CheckIcon } from '@heroicons/react/20/solid';

interface Option {
  id: string | number | null;
  label: string;
  description?: string;
  disabled?: boolean;
  icon?: React.ComponentType<any>;
  avatar?: string;
}

interface ListboxProps {
  options: Option[];
  selected: Option | null;
  onChange: (option: Option | null) => void;
  placeholder?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const Listbox: React.FC<ListboxProps> = ({
  options,
  selected,
  onChange,
  placeholder = 'Select an option...',
  disabled = false,
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'py-1.5 pl-3 pr-8 text-sm/6',
    md: 'py-2 pl-3 pr-8 text-sm/6',
    lg: 'py-2.5 pl-4 pr-10 text-base/6',
  };

  const iconSizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-5 w-5',
  };

  return (
    <HeadlessListbox value={selected} onChange={onChange} disabled={disabled}>
      <div className='relative'>
        <ListboxButton
          className={`
            relative w-full cursor-default rounded-lg text-left focus:not-data-focus:outline-none data-focus:outline data-focus:outline-white
            ${sizeClasses[size]}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'data-hover:border-glass-hover data-hover:bg-glass-hover'}
            ${className}
          `}
          style={{
            background: 'var(--color-glass-bg)',
            border: '1px solid var(--color-glass-border)',
            boxShadow: 'var(--shadow-glass-inset)',
          }}
        >
          <span
            className={`block truncate ${selected ? 'text-primary' : 'text-muted'}`}
          >
            {selected ? selected.label : placeholder}
          </span>
          <span className='pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2'>
            <ChevronUpDownIcon
              className={`${iconSizeClasses[size]} text-tertiary`}
              aria-hidden='true'
            />
          </span>
        </ListboxButton>

        <Transition
          as={Fragment}
          leave='transition ease-in duration-100'
          leaveFrom='opacity-100'
          leaveTo='opacity-0'
        >
          <ListboxOptions className='absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg py-1 text-base shadow-lg focus:outline-none bg-dark-glass border border-glass-border shadow-[var(--shadow-glass-lg)] backdrop-blur-[var(--blur-glass-strong)]'>
            {options.map(option => (
              <ListboxOption
                key={option.id}
                className={({ active, disabled: optionDisabled }) =>
                  `relative cursor-default select-none py-2 px-3 hover:bg-white/20 hover:backdrop-blur-sm transition-all duration-150 text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.8)] border-b border-white/10 last:border-b-0 ${option.icon || option.avatar ? 'pl-14' : 'pl-10'} pr-4 ${
                    active ? 'bg-white/20 backdrop-blur-sm' : ''
                  } ${optionDisabled ? 'opacity-50 cursor-not-allowed' : ''}`
                }
                value={option}
                disabled={option.disabled || false}
              >
                {({ selected: isSelected }) => (
                  <>
                    <div className='flex items-center'>
                      {(option.icon || option.avatar) && (
                        <div className='flex-shrink-0 mr-3'>
                          {option.avatar ? (
                            <img
                              src={option.avatar}
                              alt={option.label}
                              className='h-10 w-10 rounded-lg object-cover border border-white/10'
                              style={{ borderRadius: '8px' }}
                              onError={e => {
                                // Fallback to a default avatar or hide if image fails to load
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : option.icon ? (
                            <option.icon className='h-8 w-8 text-white/80' />
                          ) : null}
                        </div>
                      )}
                      <div className='flex-1 min-w-0'>
                        <span
                          className={`block truncate text-white ${isSelected ? 'font-semibold' : 'font-normal'}`}
                        >
                          {option.label}
                        </span>
                        {option.description && (
                          <span className='block truncate text-xs mt-1 text-white/80'>
                            {option.description}
                          </span>
                        )}
                      </div>
                    </div>
                    {isSelected ? (
                      <span className='absolute inset-y-0 left-0 flex items-center pl-3 text-white'>
                        <CheckIcon className='h-5 w-5' aria-hidden='true' />
                      </span>
                    ) : null}
                  </>
                )}
              </ListboxOption>
            ))}
          </ListboxOptions>
        </Transition>
      </div>
    </HeadlessListbox>
  );
};

export default Listbox;
