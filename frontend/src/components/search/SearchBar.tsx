import React, { useState, useRef, useEffect } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
  showSuggestions?: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  placeholder = 'Search organizations, events, users...',
  className = '',
  showSuggestions = true,
}) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load search history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('searchHistory');
    if (saved) {
      setSearchHistory(JSON.parse(saved));
    }
  }, []);

  const handleSearch = (searchQuery: string) => {
    if (searchQuery.trim()) {
      // Add to search history
      const newHistory = [
        searchQuery,
        ...searchHistory.filter(h => h !== searchQuery),
      ].slice(0, 10);
      setSearchHistory(newHistory);
      localStorage.setItem('searchHistory', JSON.stringify(newHistory));

      // Perform search
      onSearch(searchQuery);
      setQuery('');
      setShowHistory(false);
      inputRef.current?.blur();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowHistory(false);
      inputRef.current?.blur();
    }
  };

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('searchHistory');
  };

  const removeFromHistory = (item: string) => {
    const newHistory = searchHistory.filter(h => h !== item);
    setSearchHistory(newHistory);
    localStorage.setItem('searchHistory', JSON.stringify(newHistory));
  };

  return (
    <div className={`relative ${className}`}>
      <form onSubmit={handleSubmit} className='relative'>
        <div className='relative'>
          <MagnifyingGlassIcon className='absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted' />
          <input
            ref={inputRef}
            type='text'
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => {
              setIsFocused(true);
              if (searchHistory.length > 0) setShowHistory(true);
            }}
            onBlur={() => {
              // Delay hiding to allow clicking on suggestions
              setTimeout(() => {
                setIsFocused(false);
                setShowHistory(false);
              }, 200);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className='input-glass w-full pl-10 pr-10 py-2 text-primary placeholder:text-muted focus:ring-2 focus:ring-[var(--color-accent-blue)] focus:ring-opacity-50'
          />
          {query && (
            <button
              type='button'
              onClick={() => setQuery('')}
              className='absolute right-3 top-1/2 transform -translate-y-1/2 text-muted hover:text-primary transition-colors duration-[var(--duration-normal)]'
            >
              <XMarkIcon className='w-4 h-4' />
            </button>
          )}
        </div>
      </form>

      {/* Search Suggestions */}
      {showSuggestions &&
        isFocused &&
        showHistory &&
        searchHistory.length > 0 && (
          <div className='absolute top-full left-0 right-0 mt-2 glass-elevated rounded-[var(--radius-glass-lg)] shadow-[var(--shadow-glass-xl)] z-50'>
            <div className='p-2'>
              <div className='flex items-center justify-between mb-2'>
                <span className='text-xs text-muted uppercase tracking-wide'>
                  Recent Searches
                </span>
                <button
                  onClick={clearHistory}
                  className='text-xs text-muted hover:text-error transition-colors duration-[var(--duration-normal)]'
                >
                  Clear All
                </button>
              </div>
              <div className='space-y-1'>
                {searchHistory.map((item, index) => (
                  <div
                    key={index}
                    className='flex items-center justify-between group hover:bg-glass-hover rounded-[var(--radius-glass-sm)] px-2 py-1 cursor-pointer transition-all duration-[var(--duration-fast)]'
                    onClick={() => handleSearch(item)}
                  >
                    <div className='flex items-center space-x-2'>
                      <MagnifyingGlassIcon className='w-3 h-3 text-muted' />
                      <span className='text-sm text-primary truncate'>
                        {item}
                      </span>
                    </div>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        removeFromHistory(item);
                      }}
                      className='opacity-0 group-hover:opacity-100 text-muted hover:text-error transition-all duration-[var(--duration-normal)]'
                    >
                      <XMarkIcon className='w-3 h-3' />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      {/* Quick Search Options */}
      {showSuggestions && isFocused && !showHistory && (
        <div className='absolute top-full left-0 right-0 mt-2 bg-glass border-glass rounded-[var(--radius-dropdown)] shadow-[var(--shadow-glass-xl)] backdrop-blur-[var(--blur-glass-strong)] z-50'>
          <div className='p-3'>
            <div className='text-xs text-gray-400 uppercase tracking-wide mb-2'>
              Quick Search
            </div>
            <div className='grid grid-cols-2 gap-2'>
              <button
                onClick={() => handleSearch('combat organizations')}
                className='text-left text-sm text-white hover:bg-white/10 rounded px-2 py-1 transition-colors'
              >
                Combat Organizations
              </button>
              <button
                onClick={() => handleSearch('mining events')}
                className='text-left text-sm text-white hover:bg-white/10 rounded px-2 py-1 transition-colors'
              >
                Mining Events
              </button>
              <button
                onClick={() => handleSearch('exploration groups')}
                className='text-left text-sm text-white hover:bg-white/10 rounded px-2 py-1 transition-colors'
              >
                Exploration Groups
              </button>
              <button
                onClick={() => handleSearch('trading orgs')}
                className='text-left text-sm text-white hover:bg-white/10 rounded px-2 py-1 transition-colors'
              >
                Trading Organizations
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
