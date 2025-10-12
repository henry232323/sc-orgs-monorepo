import React, { useState, useMemo } from 'react';
import { Combobox } from '@headlessui/react';
import { ChevronDownIcon, CheckIcon, UserIcon } from '@heroicons/react/24/outline';

export interface OrganizationMember {
  id: string;
  user: {
    id: string;
    rsi_handle: string;
    avatar_url?: string;
    is_rsi_verified?: boolean;
  };
  role?: {
    id: string;
    name: string;
  };
  joined_at: string;
}

interface MemberAutocompleteProps {
  value?: string;
  onChange: (memberId: string) => void;
  members: OrganizationMember[];
  placeholder?: string;
  label?: string;
  description?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  isLoading?: boolean;
  onRetry?: () => void;
  className?: string;
  id?: string;
  name?: string;
}

const MemberAutocomplete: React.FC<MemberAutocompleteProps> = ({
  value,
  onChange,
  members,
  placeholder = 'Search for a member...',
  label,
  description,
  error,
  disabled = false,
  required = false,
  isLoading = false,
  onRetry,
  className = '',
  id,
  name,
}) => {
  const [query, setQuery] = useState('');

  const autocompleteId = id || name || `member-autocomplete-${Math.random().toString(36).substr(2, 9)}`;

  // Find selected member
  const selectedMember = useMemo(() => {
    return members.find(member => member.id === value) || null;
  }, [members, value]);

  // Filter members based on search query
  const filteredMembers = useMemo(() => {
    if (query === '') {
      return members;
    }

    return members.filter(member =>
      member.user.rsi_handle.toLowerCase().includes(query.toLowerCase())
    );
  }, [members, query]);

  // Base classes using design system
  const baseClasses =
    'input-glass w-full text-primary transition-all duration-[var(--duration-normal)] ease-[var(--ease-smooth)]';

  const errorClasses = error
    ? 'border-error focus:border-error focus:shadow-[0_0_0_3px_var(--color-error-bg)]'
    : 'focus:border-glass-focus focus:shadow-[0_0_0_3px_var(--color-glass-bg-hover)]';

  const disabledClasses = disabled
    ? 'opacity-50 cursor-not-allowed pointer-events-none'
    : 'hover:border-glass-hover';

  const inputClasses = [
    baseClasses,
    'px-4 py-2.5 text-sm leading-normal',
    errorClasses,
    disabledClasses,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const renderMemberOption = (member: OrganizationMember) => (
    <div className="flex items-center gap-3">
      {/* Avatar */}
      <div className="w-8 h-8 bg-gradient-to-r from-white/20 to-white/10 rounded-full flex items-center justify-center flex-shrink-0">
        {member.user.avatar_url ? (
          <img
            src={member.user.avatar_url}
            alt={member.user.rsi_handle}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <UserIcon className="w-4 h-4 text-muted" />
        )}
      </div>

      {/* Member info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-primary truncate">
            {member.user.rsi_handle}
          </span>
          {member.user.is_rsi_verified && (
            <span className="text-brand-secondary text-sm">✓</span>
          )}
        </div>
        {member.role && (
          <span className="text-xs text-tertiary">
            {member.role.name}
          </span>
        )}
      </div>
    </div>
  );

  // Removed unused renderSelectedMember function

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={autocompleteId}
          className={`block text-sm font-semibold text-primary mb-[var(--spacing-tight)] ${
            disabled ? 'opacity-50' : ''
          }`}
        >
          {label}
          {required && <span className="text-error ml-1">*</span>}
        </label>
      )}

      <Combobox
        value={value || ''}
        onChange={(memberId: string | null) => {
          if (memberId) {
            onChange(memberId);
          }
        }}
        disabled={disabled || isLoading}
      >
        <div className="relative">
          <div className="relative">
            <Combobox.Input
              id={autocompleteId}
              className={inputClasses}
              displayValue={() => selectedMember ? selectedMember.user.rsi_handle : ''}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={placeholder}
              autoComplete="off"
            />
            <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-3">
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-accent-blue"></div>
              ) : (
                <ChevronDownIcon
                  className="h-5 w-5 text-muted"
                  aria-hidden="true"
                />
              )}
            </Combobox.Button>
          </div>

          <Combobox.Options className="absolute z-50 w-full mt-1 bg-glass-elevated border border-glass-border rounded-[var(--radius-glass-sm)] shadow-[var(--shadow-glass-lg)] backdrop-blur-[var(--blur-glass-strong)] max-h-60 overflow-auto">
            {/* Loading state */}
            {isLoading && (
              <div className="px-4 py-3 text-sm text-center">
                <div className="flex items-center justify-center gap-3">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-accent-blue"></div>
                  <span className="text-muted">Loading members...</span>
                </div>
              </div>
            )}

            {/* Error state */}
            {!isLoading && members.length === 0 && onRetry && (
              <div className="px-4 py-3 text-sm text-center">
                <div className="flex flex-col items-center gap-2">
                  <span className="text-error">Failed to load members</span>
                  <button
                    onClick={onRetry}
                    className="text-xs text-brand-secondary hover:text-brand-secondary/80 underline"
                  >
                    Try again
                  </button>
                </div>
              </div>
            )}

            {/* No members available */}
            {!isLoading && members.length === 0 && !onRetry && (
              <div className="px-4 py-3 text-sm text-muted text-center">
                No members available
              </div>
            )}

            {/* No search results */}
            {!isLoading && members.length > 0 && filteredMembers.length === 0 && (
              <div className="px-4 py-3 text-sm text-muted text-center">
                No members found matching "{query}"
              </div>
            )}

            {/* Member options */}
            {!isLoading && filteredMembers.map((member) => (
              <Combobox.Option
                key={member.id}
                value={member.id}
                className={({ active, selected }) =>
                  `relative cursor-pointer select-none px-4 py-3 transition-colors duration-[var(--duration-fast)] ${
                    active
                      ? 'bg-glass-hover'
                      : ''
                  } ${
                    selected
                      ? 'bg-brand-secondary/20 text-brand-secondary'
                      : 'text-primary'
                  }`
                }
              >
                {({ selected }) => (
                  <div className="flex items-center justify-between">
                    {renderMemberOption(member)}
                    {selected && (
                      <CheckIcon
                        className="h-4 w-4 text-brand-secondary"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                )}
              </Combobox.Option>
            ))}
          </Combobox.Options>
        </div>
      </Combobox>

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

export default MemberAutocomplete;