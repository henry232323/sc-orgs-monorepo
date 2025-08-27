import React, { useState, useRef } from 'react';
import { Combobox, ComboboxInput, ComboboxOptions, ComboboxOption } from '@headlessui/react';
import { Chip } from './Chip';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  maxTags?: number;
  className?: string;
}

const TagInput: React.FC<TagInputProps> = ({
  value = [],
  onChange,
  suggestions = [],
  placeholder = 'Add tags...',
  maxTags = 10,
  className = '',
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter suggestions based on query and existing tags
  const filteredSuggestions =
    query === ''
      ? suggestions
          .filter(suggestion => !value.includes(suggestion))
          .slice(0, 8)
      : suggestions
          .filter(
            suggestion =>
              suggestion.toLowerCase().includes(query.toLowerCase()) &&
              !value.includes(suggestion)
          )
          .slice(0, 5);

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !value.includes(trimmedTag) && value.length < maxTags) {
      onChange([...value, trimmedTag]);
      setQuery('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.trim()) {
      e.preventDefault();
      // Select the first filtered suggestion instead of adding custom text
      if (filteredSuggestions.length > 0 && filteredSuggestions[0]) {
        addTag(filteredSuggestions[0]);
      }
    } else if (e.key === 'Backspace' && !query && value.length > 0) {
      const lastTag = value[value.length - 1];
      if (lastTag) {
        removeTag(lastTag);
      }
    }
  };


  return (
    <div className={`relative ${className}`}>
      {/* Existing Tags */}
      {value.length > 0 && (
        <div className='flex flex-wrap gap-2 mb-3'>
          {value.map((tag, index) => (
            <Chip
              key={`${tag}-${index}`}
              variant='selected'
              size='md'
              removable
              onRemove={() => removeTag(tag)}
            >
              {tag}
            </Chip>
          ))}
        </div>
      )}

      {/* Combobox for adding new tags */}
      <div className='min-h-[2.5rem] flex items-center'>
        <Combobox
          value={null}
          onChange={(selectedTag: string | null) => {
            if (selectedTag) {
              addTag(selectedTag);
            }
          }}
          onClose={() => setQuery('')}
          disabled={value.length >= maxTags}
        >
          <div className='w-full'>
            <ComboboxInput
              ref={inputRef}
              className='input-glass w-full py-2 px-3 text-sm leading-normal text-primary placeholder:text-muted transition-all duration-[var(--duration-normal)] focus:ring-2 focus:ring-[var(--color-accent-blue)] focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed'
              placeholder={
                value.length >= maxTags
                  ? `Maximum ${maxTags} tags reached`
                  : placeholder || 'Add tags...'
              }
              onChange={event => setQuery(event.target.value)}
              onKeyDown={handleKeyDown}
              displayValue={() => query}
            />
          </div>

          <ComboboxOptions className='absolute top-full left-0 right-0 -mt-3 bg-dark-glass border border-glass-border rounded-[var(--radius-dropdown)] shadow-[var(--shadow-glass-lg)] backdrop-blur-[var(--blur-glass-strong)] z-50 max-h-48 overflow-y-auto'>
            {filteredSuggestions.length > 0 ? (
              filteredSuggestions.map((suggestion, index) => (
                <ComboboxOption
                  key={suggestion}
                  value={suggestion}
                  className={({ focus }) =>
                    `group flex cursor-pointer items-center px-3 py-2 text-sm text-white transition-all duration-150 [text-shadow:0_1px_2px_rgba(0,0,0,0.8)] border-b border-white/10 ${
                      focus ? 'bg-white/20 backdrop-blur-sm' : 'hover:bg-white/20 hover:backdrop-blur-sm'
                    } ${
                      index === 0 ? 'first:rounded-t-[var(--radius-dropdown)]' : ''
                    } ${
                      index === filteredSuggestions.length - 1
                        ? 'last:rounded-b-[var(--radius-dropdown)] last:border-b-0'
                        : ''
                    }`
                  }
                >
                  {suggestion}
                </ComboboxOption>
              ))
            ) : (
              <div className='px-3 py-2 text-sm text-white/60'>
                {query !== ''
                  ? `No matching tags found. Please select from the available suggestions.`
                  : 'All available tags have been selected.'}
              </div>
            )}
          </ComboboxOptions>
        </Combobox>
      </div>

      {/* Tag Count */}
      <div className='mt-2 text-xs text-white/60'>
        {value.length} / {maxTags} tags
      </div>
    </div>
  );
};

export default TagInput;
