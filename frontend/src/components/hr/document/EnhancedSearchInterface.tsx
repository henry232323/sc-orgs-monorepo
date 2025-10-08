import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  XMarkIcon,
  ClockIcon,
  FolderIcon,
  CheckCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import Chip from '../../ui/Chip';
import { ComponentTitle, Caption } from '../../ui/Typography';
import Select from '../../ui/Select';

interface SearchFilters {
  folderPaths?: string[];
  requiresAcknowledgment?: boolean;
  sortBy?: 'relevance' | 'date' | 'title';
  includeContent?: boolean;
}

interface SearchOptions {
  query: string;
  filters: SearchFilters;
  highlight: boolean;
}

interface EnhancedSearchInterfaceProps {
  onSearch: (options: SearchOptions) => void;
  onClear: () => void;
  isLoading?: boolean;
  suggestions?: string[];
  onSuggestionClick?: (suggestion: string) => void;
  availableFolders?: string[];
  recentSearches?: string[];
  className?: string;
}

interface SearchHistoryItem {
  query: string;
  timestamp: Date;
  resultCount?: number | undefined;
}

const EnhancedSearchInterface: React.FC<EnhancedSearchInterfaceProps> = ({
  onSearch,
  onClear,
  isLoading = false,
  suggestions = [],
  onSuggestionClick,
  availableFolders = [],
  recentSearches = [],
  className = '',
}) => {
  const [query, setQuery] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    sortBy: 'relevance',
    includeContent: false,
  });
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);

  // Load search history from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('hr-document-search-history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved).map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp),
        }));
        setSearchHistory(parsed);
      } catch (error) {
        console.error('Failed to load search history:', error);
      }
    }
  }, []);

  // Save search history to localStorage
  const saveSearchHistory = useCallback((newHistory: SearchHistoryItem[]) => {
    try {
      localStorage.setItem('hr-document-search-history', JSON.stringify(newHistory));
      setSearchHistory(newHistory);
    } catch (error) {
      console.error('Failed to save search history:', error);
    }
  }, []);

  // Add search to history
  const addToHistory = useCallback((searchQuery: string, resultCount?: number) => {
    if (!searchQuery.trim()) return;

    const newItem: SearchHistoryItem = {
      query: searchQuery,
      timestamp: new Date(),
      resultCount: resultCount ?? undefined,
    };

    const updatedHistory = [
      newItem,
      ...searchHistory.filter(item => item.query !== searchQuery),
    ].slice(0, 10); // Keep only last 10 searches

    saveSearchHistory(updatedHistory);
  }, [searchHistory, saveSearchHistory]);

  // Clear search history
  const clearHistory = useCallback(() => {
    localStorage.removeItem('hr-document-search-history');
    setSearchHistory([]);
  }, []);

  // Handle search submission
  const handleSearch = useCallback((searchQuery?: string) => {
    const finalQuery = searchQuery || query;
    if (!finalQuery.trim()) return;

    const searchOptions: SearchOptions = {
      query: finalQuery.trim(),
      filters,
      highlight: true,
    };

    onSearch(searchOptions);
    addToHistory(finalQuery);
  }, [query, filters, onSearch, addToHistory]);

  // Handle clear search
  const handleClear = useCallback(() => {
    setQuery('');
    setFilters({
      sortBy: 'relevance',
      includeContent: false,
    });
    onClear();
  }, [onClear]);

  // Handle suggestion click
  const handleSuggestionClick = useCallback((suggestion: string) => {
    setQuery(suggestion);
    handleSearch(suggestion);
    onSuggestionClick?.(suggestion);
  }, [handleSearch, onSuggestionClick]);

  // Handle history item click
  // const handleHistoryClick = useCallback((historyItem: SearchHistoryItem) => {
  //   setQuery(historyItem.query);
  //   handleSearch(historyItem.query);
  // }, [handleSearch]);

  // Handle filter changes
  const handleFilterChange = useCallback((key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  // Handle folder selection
  const handleFolderToggle = useCallback((folder: string) => {
    setFilters(prev => {
      const currentFolders = prev.folderPaths || [];
      const isSelected = currentFolders.includes(folder);
      
      return {
        ...prev,
        folderPaths: isSelected
          ? currentFolders.filter(f => f !== folder)
          : [...currentFolders, folder],
      };
    });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && event.target instanceof HTMLInputElement) {
        handleSearch();
      }
      if (event.key === 'Escape') {
        handleClear();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleSearch, handleClear]);

  // Format recent searches for display
  const formattedRecentSearches = useMemo(() => {
    return [...new Set([...recentSearches, ...searchHistory.map(h => h.query)])]
      .slice(0, 5);
  }, [recentSearches, searchHistory]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main search input */}
      <div className="relative">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search documents..."
            value={query}
            onChange={(value) => setQuery(value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-10 pr-20"
            disabled={isLoading}
          />
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
            {query && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="p-1 h-6 w-6"
              >
                <XMarkIcon className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="p-1 h-6 w-6"
            >
              <AdjustmentsHorizontalIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search button */}
        <div className="mt-2 flex justify-between items-center">
          <Button
            onClick={() => handleSearch()}
            disabled={!query.trim() || isLoading}
            className="flex items-center space-x-2"
          >
            {isLoading ? (
              <ArrowPathIcon className="h-4 w-4 animate-spin" />
            ) : (
              <MagnifyingGlassIcon className="h-4 w-4" />
            )}
            <span>Search</span>
          </Button>

          {query && (
            <Button
              variant="ghost"
              onClick={handleClear}
              className="text-sm"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Advanced filters */}
      {showAdvanced && (
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-4">
          <ComponentTitle className="text-sm font-medium">
            Advanced Search Options
          </ComponentTitle>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Sort by */}
            <div>
              <Caption className="block mb-2">Sort by</Caption>
              <Select
                value={filters.sortBy || 'relevance'}
                onChange={(value) => handleFilterChange('sortBy', value)}
                options={[
                  { value: 'relevance', label: 'Relevance' },
                  { value: 'date', label: 'Date Modified' },
                  { value: 'title', label: 'Title' },
                ]}
              />
            </div>

            {/* Acknowledgment filter */}
            <div>
              <Caption className="block mb-2">Acknowledgment Status</Caption>
              <Select
                value={
                  filters.requiresAcknowledgment === undefined
                    ? 'all'
                    : filters.requiresAcknowledgment
                    ? 'required'
                    : 'not-required'
                }
                onChange={(value) =>
                  handleFilterChange(
                    'requiresAcknowledgment',
                    value === 'all' ? undefined : value === 'required'
                  )
                }
                options={[
                  { value: 'all', label: 'All Documents' },
                  { value: 'required', label: 'Requires Acknowledgment' },
                  { value: 'not-required', label: 'No Acknowledgment Required' },
                ]}
              />
            </div>
          </div>

          {/* Folder filters */}
          {availableFolders.length > 0 && (
            <div>
              <Caption className="block mb-2">Folders</Caption>
              <div className="flex flex-wrap gap-2">
                {availableFolders.map((folder) => (
                  <Chip
                    key={folder}
                    variant={
                      filters.folderPaths?.includes(folder) ? 'selected' : 'default'
                    }
                    size="sm"
                    onClick={() => handleFolderToggle(folder)}
                    className="cursor-pointer"
                  >
                    <FolderIcon className="h-3 w-3 mr-1" />
                    {folder === '/' ? 'Root' : folder}
                  </Chip>
                ))}
              </div>
            </div>
          )}

          {/* Search options */}
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.includeContent || false}
                onChange={(e) => handleFilterChange('includeContent', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <Caption>Search in document content</Caption>
            </label>
          </div>
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div>
          <Caption className="text-gray-500 dark:text-gray-400 mb-2">
            Suggestions:
          </Caption>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, index) => (
              <Chip
                key={index}
                variant="default"
                size="sm"
                onClick={() => handleSuggestionClick(suggestion)}
                className="cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900"
              >
                {suggestion}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {/* Recent searches */}
      {formattedRecentSearches.length > 0 && !query && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <Caption className="text-gray-500 dark:text-gray-400">
              Recent searches:
            </Caption>
            {searchHistory.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearHistory}
                className="text-xs"
              >
                Clear history
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {formattedRecentSearches.map((search, index) => {
              const historyItem = searchHistory.find(h => h.query === search);
              return (
                <Chip
                  key={index}
                  variant="default"
                  size="sm"
                  onClick={() => handleSuggestionClick(search)}
                  className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-1"
                >
                  <ClockIcon className="h-3 w-3" />
                  <span>{search}</span>
                  {historyItem?.resultCount !== undefined && (
                    <span className="text-xs text-gray-500">
                      ({historyItem.resultCount})
                    </span>
                  )}
                </Chip>
              );
            })}
          </div>
        </div>
      )}

      {/* Active filters display */}
      {(filters.folderPaths?.length || filters.requiresAcknowledgment !== undefined) && (
        <div>
          <Caption className="text-gray-500 dark:text-gray-400 mb-2">
            Active filters:
          </Caption>
          <div className="flex flex-wrap gap-2">
            {filters.folderPaths?.map((folder) => (
              <Chip
                key={folder}
                variant="selected"
                size="sm"
                className="flex items-center space-x-1"
              >
                <FolderIcon className="h-3 w-3" />
                <span>{folder === '/' ? 'Root' : folder}</span>
                <button
                  onClick={() => handleFolderToggle(folder)}
                  className="ml-1 hover:bg-blue-700 rounded-full p-0.5"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </Chip>
            ))}
            {filters.requiresAcknowledgment !== undefined && (
              <Chip
                variant="selected"
                size="sm"
                className="flex items-center space-x-1"
              >
                <CheckCircleIcon className="h-3 w-3" />
                <span>
                  {filters.requiresAcknowledgment ? 'Requires' : 'No'} Acknowledgment
                </span>
                <button
                  onClick={() => handleFilterChange('requiresAcknowledgment', undefined)}
                  className="ml-1 hover:bg-blue-700 rounded-full p-0.5"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </Chip>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedSearchInterface;