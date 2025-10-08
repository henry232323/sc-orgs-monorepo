import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/outline';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  value: string | string[];
  onChange: (value: string | string[]) => void;
  options: SelectOption[];
  placeholder?: string;
  label?: string;
  description?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  multiple?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  id?: string;
  name?: string;
}

const Select: React.FC<SelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select an option...',
  label,
  description,
  error,
  disabled = false,
  required = false,
  multiple = false,
  size = 'md',
  className = '',
  id,
  name,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const selectRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectId = id || name || `select-${Math.random().toString(36).substr(2, 9)}`;

  // Size classes
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm leading-tight',
    md: 'px-4 py-2.5 text-sm leading-normal',
    lg: 'px-4 py-3 text-base leading-normal',
  };

  // Base classes using design system
  const baseClasses =
    'input-glass w-full text-primary transition-all duration-[var(--duration-normal)] ease-[var(--ease-smooth)] cursor-pointer';

  const errorClasses = error
    ? 'border-error focus:border-error focus:shadow-[0_0_0_3px_var(--color-error-bg)]'
    : 'focus:border-glass-focus focus:shadow-[0_0_0_3px_var(--color-glass-bg-hover)]';

  const disabledClasses = disabled
    ? 'opacity-50 cursor-not-allowed pointer-events-none'
    : 'hover:border-glass-hover';

  const triggerClasses = [
    baseClasses,
    sizeClasses[size],
    errorClasses,
    disabledClasses,
    'flex items-center justify-between',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  // Get selected options for display
  const selectedOptions = multiple
    ? options.filter(option => Array.isArray(value) && value.includes(option.value))
    : options.filter(option => option.value === value);

  // Filter options based on search term
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle option selection
  const handleOptionSelect = (optionValue: string) => {
    if (multiple) {
      const currentValues = Array.isArray(value) ? value : [];
      const newValues = currentValues.includes(optionValue)
        ? currentValues.filter(v => v !== optionValue)
        : [...currentValues, optionValue];
      onChange(newValues);
    } else {
      onChange(optionValue);
      setIsOpen(false);
    }
    setSearchTerm('');
  };

  // Handle removing selected option (for multiple select)
  const handleRemoveOption = (optionValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (multiple && Array.isArray(value)) {
      const newValues = value.filter(v => v !== optionValue);
      onChange(newValues);
    }
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
    
    return undefined;
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
      case ' ':
        if (!isOpen) {
          e.preventDefault();
          setIsOpen(true);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchTerm('');
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        }
        break;
    }
  };

  // Render selected values display
  const renderSelectedValues = () => {
    if (multiple && selectedOptions.length > 0) {
      return (
        <div className="flex flex-wrap gap-1">
          {selectedOptions.map(option => (
            <span
              key={option.value}
              className="inline-flex items-center gap-1 px-2 py-1 bg-brand-secondary/20 text-brand-secondary rounded-[var(--radius-xs)] text-xs"
            >
              {option.label}
              <button
                type="button"
                onClick={(e) => handleRemoveOption(option.value, e)}
                className="hover:bg-brand-secondary/30 rounded-full p-0.5 transition-colors"
              >
                <XMarkIcon className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      );
    }

    if (!multiple && selectedOptions.length > 0) {
      return <span>{selectedOptions[0]?.label}</span>;
    }

    return <span className="text-muted">{placeholder}</span>;
  };

  return (
    <div className="w-full" ref={selectRef}>
      {label && (
        <label
          htmlFor={selectId}
          className={`block text-sm font-semibold text-primary mb-[var(--spacing-tight)] ${
            disabled ? 'opacity-50' : ''
          }`}
        >
          {label}
          {required && <span className="text-error ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        {/* Select trigger */}
        <div
          id={selectId}
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-required={required}
          aria-invalid={!!error}
          tabIndex={disabled ? -1 : 0}
          className={triggerClasses}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
        >
          <div className="flex-1 min-w-0">
            {renderSelectedValues()}
          </div>
          <ChevronDownIcon
            className={`w-5 h-5 text-muted transition-transform duration-[var(--duration-normal)] ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>

        {/* Dropdown menu */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-glass-elevated border border-glass-border rounded-[var(--radius-glass-sm)] shadow-[var(--shadow-glass-lg)] backdrop-blur-[var(--blur-glass-strong)] max-h-60 overflow-hidden">
            {/* Search input for filtering options */}
            {options.length > 5 && (
              <div className="p-2 border-b border-glass-border">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search options..."
                  className="w-full px-3 py-2 text-sm bg-glass border border-glass-border rounded-[var(--radius-xs)] text-primary placeholder:text-muted focus:outline-none focus:border-glass-focus"
                />
              </div>
            )}

            {/* Options list */}
            <div className="overflow-y-auto max-h-48" role="listbox">
              {filteredOptions.length === 0 ? (
                <div className="px-4 py-3 text-sm text-muted text-center">
                  No options found
                </div>
              ) : (
                filteredOptions.map(option => {
                  const isSelected = multiple
                    ? Array.isArray(value) && value.includes(option.value)
                    : value === option.value;

                  return (
                    <div
                      key={option.value}
                      role="option"
                      aria-selected={isSelected}
                      className={`
                        px-4 py-3 text-sm cursor-pointer transition-colors duration-[var(--duration-fast)]
                        ${option.disabled 
                          ? 'opacity-50 cursor-not-allowed' 
                          : 'hover:bg-glass-hover'
                        }
                        ${isSelected 
                          ? 'bg-brand-secondary/20 text-brand-secondary font-medium' 
                          : 'text-primary'
                        }
                      `}
                      onClick={() => !option.disabled && handleOptionSelect(option.value)}
                    >
                      <div className="flex items-center justify-between">
                        <span>{option.label}</span>
                        {isSelected && (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {description && !error && (
        <p
          className={`mt-[var(--spacing-tight)] text-xs text-tertiary ${
            disabled ? 'opacity-50' : ''
          }`}
        >
          {description}
        </p>
      )}

      {error && (
        <p className="mt-[var(--spacing-tight)] text-xs text-error">{error}</p>
      )}
    </div>
  );
};

export default Select;