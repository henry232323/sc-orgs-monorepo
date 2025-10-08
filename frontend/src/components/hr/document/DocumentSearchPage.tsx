import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  DocumentTextIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import Paper from '../../ui/Paper';
import Button from '../../ui/Button';
import { ComponentTitle, ComponentSubtitle } from '../../ui/Typography';
import EnhancedSearchInterface from './EnhancedSearchInterface';
import SearchResults from './SearchResults';
import { useSearchDocumentsQuery, useGetFolderStructureQuery } from '../../../services/apiSlice';

interface SearchOptions {
  query: string;
  filters: {
    folderPaths?: string[] | undefined;
    requiresAcknowledgment?: boolean | undefined;
    sortBy?: 'relevance' | 'date' | 'title' | undefined;
    includeContent?: boolean | undefined;
  };
  highlight: boolean;
}

interface SearchState {
  currentSearch: SearchOptions | null;
  page: number;
  limit: number;
}

const DocumentSearchPage: React.FC = () => {
  const { organizationId } = useParams<{ organizationId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchState, setSearchState] = useState<SearchState>({
    currentSearch: null,
    page: 1,
    limit: 20,
  });

  // Initialize search from URL params
  useEffect(() => {
    const query = searchParams.get('q');
    const sortBy = searchParams.get('sort') as 'relevance' | 'date' | 'title' || 'relevance';
    const folderPaths = searchParams.get('folders')?.split(',').filter(Boolean);
    const requiresAck = searchParams.get('ack');
    const includeContent = searchParams.get('content') === 'true';
    const page = parseInt(searchParams.get('page') || '1');

    if (query) {
      const searchOptions: SearchOptions = {
        query,
        filters: {
          sortBy,
          folderPaths: folderPaths || undefined,
          requiresAcknowledgment: requiresAck === 'true' ? true : requiresAck === 'false' ? false : undefined,
          includeContent,
        },
        highlight: true,
      };

      setSearchState({
        currentSearch: searchOptions,
        page,
        limit: 20,
      });
    }
  }, [searchParams]);

  // Get folder structure for filters
  const {
    data: folderStructure,
  } = useGetFolderStructureQuery(
    { organizationId: organizationId! },
    { skip: !organizationId }
  );

  // Execute search query
  const searchQueryParams = useMemo(() => {
    if (!searchState.currentSearch) return {};
    
    const params: any = {
      organizationId: organizationId!,
      query: searchState.currentSearch.query,
      page: searchState.page,
      limit: searchState.limit,
      highlight: searchState.currentSearch.highlight ? 'true' : 'false',
      include_content: searchState.currentSearch.filters.includeContent ? 'true' : 'false',
      sort_by: searchState.currentSearch.filters.sortBy || 'relevance',
    };

    if (searchState.currentSearch.filters.folderPaths?.length) {
      params.folder_paths = searchState.currentSearch.filters.folderPaths.join(',');
    }

    if (searchState.currentSearch.filters.requiresAcknowledgment !== undefined) {
      params.requires_acknowledgment = searchState.currentSearch.filters.requiresAcknowledgment.toString();
    }

    return params;
  }, [organizationId, searchState]);

  const {
    data: searchResponse,
    isLoading: isSearching,
    error: searchError,
    refetch: refetchSearch,
  } = useSearchDocumentsQuery(
    searchQueryParams,
    { 
      skip: !organizationId || !searchState.currentSearch?.query,
    }
  );

  // Update URL when search changes
  const updateSearchParams = useCallback((options: SearchOptions, page: number = 1) => {
    const params = new URLSearchParams();
    params.set('q', options.query);
    params.set('page', page.toString());
    
    if (options.filters.sortBy && options.filters.sortBy !== 'relevance') {
      params.set('sort', options.filters.sortBy);
    }
    
    if (options.filters.folderPaths?.length) {
      params.set('folders', options.filters.folderPaths.join(','));
    }
    
    if (options.filters.requiresAcknowledgment !== undefined) {
      params.set('ack', options.filters.requiresAcknowledgment.toString());
    }
    
    if (options.filters.includeContent) {
      params.set('content', 'true');
    }

    setSearchParams(params);
  }, [setSearchParams]);

  // Handle new search
  const handleSearch = useCallback((options: SearchOptions) => {
    setSearchState({
      currentSearch: options,
      page: 1,
      limit: 20,
    });
    updateSearchParams(options, 1);
  }, [updateSearchParams]);

  // Handle clear search
  const handleClearSearch = useCallback(() => {
    setSearchState({
      currentSearch: null,
      page: 1,
      limit: 20,
    });
    setSearchParams({});
  }, [setSearchParams]);

  // Handle suggestion click
  const handleSuggestionClick = useCallback((suggestion: string) => {
    if (searchState.currentSearch) {
      const newOptions = {
        ...searchState.currentSearch,
        query: suggestion,
      };
      handleSearch(newOptions);
    }
  }, [searchState.currentSearch, handleSearch]);

  // Handle pagination
  const handlePageChange = useCallback((newPage: number) => {
    if (searchState.currentSearch) {
      setSearchState(prev => ({ ...prev, page: newPage }));
      updateSearchParams(searchState.currentSearch, newPage);
    }
  }, [searchState.currentSearch, updateSearchParams]);

  // Handle retry
  const handleRetry = useCallback(() => {
    refetchSearch();
  }, [refetchSearch]);

  // Get recent searches from localStorage
  const getRecentSearches = useCallback((): string[] => {
    try {
      const saved = localStorage.getItem('hr-document-search-history');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((item: any) => item.query).slice(0, 5);
      }
    } catch (error) {
      console.error('Failed to load recent searches:', error);
    }
    return [];
  }, []);

  const recentSearches = getRecentSearches();

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Page header */}
      <div className="text-center">
        <ComponentTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Document Search
        </ComponentTitle>
        <ComponentSubtitle className="mt-2 text-gray-600 dark:text-gray-400">
          Search through your organization's document library with advanced filters and highlighting
        </ComponentSubtitle>
      </div>

      {/* Search interface */}
      <Paper className="p-6">
        <EnhancedSearchInterface
          onSearch={handleSearch}
          onClear={handleClearSearch}
          isLoading={isSearching}
          suggestions={searchResponse?.suggestions || []}
          onSuggestionClick={handleSuggestionClick}
          availableFolders={folderStructure?.data || []}
          recentSearches={recentSearches}
        />
      </Paper>

      {/* Search results */}
      {searchState.currentSearch && (
        <div className="space-y-4">
          {/* Error state */}
          {searchError && (
            <Paper className="p-6 border-red-200 dark:border-red-800">
              <div className="flex items-center space-x-3 text-red-600 dark:text-red-400">
                <ExclamationTriangleIcon className="h-6 w-6" />
                <div>
                  <ComponentTitle className="text-lg">Search Error</ComponentTitle>
                  <ComponentSubtitle className="mt-1">
                    Failed to search documents. Please try again.
                  </ComponentSubtitle>
                </div>
                <Button
                  variant="outline"
                  onClick={handleRetry}
                  className="ml-auto"
                >
                  <ArrowPathIcon className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            </Paper>
          )}

          {/* Loading or results */}
          {!searchError && (
            <SearchResults
              results={searchResponse?.data?.map(doc => ({
                document: doc,
                relevance_score: doc.relevance_score || 0,
                content_snippet: doc.content_snippet || undefined,
                highlighted_snippet: doc.highlighted_snippet || undefined,
                match_positions: doc.match_positions || undefined,
              })) || []}
              searchTerm={searchState.currentSearch.query}
              total={searchResponse?.total || 0}
              executionTimeMs={searchResponse?.execution_time_ms || undefined}
              suggestions={searchResponse?.suggestions}
              onSuggestionClick={handleSuggestionClick}
              organizationId={organizationId!}
              loading={isSearching}
            />
          )}

          {/* Pagination */}
          {searchResponse && searchResponse.total > searchState.limit && (
            <Paper className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {((searchState.page - 1) * searchState.limit) + 1} to{' '}
                  {Math.min(searchState.page * searchState.limit, searchResponse.total)} of{' '}
                  {searchResponse.total} results
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(searchState.page - 1)}
                    disabled={searchState.page <= 1 || isSearching}
                  >
                    Previous
                  </Button>
                  
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Page {searchState.page} of {Math.ceil(searchResponse.total / searchState.limit)}
                  </span>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(searchState.page + 1)}
                    disabled={searchState.page >= Math.ceil(searchResponse.total / searchState.limit) || isSearching}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </Paper>
          )}
        </div>
      )}

      {/* Empty state when no search */}
      {!searchState.currentSearch && (
        <Paper className="p-12 text-center">
          <DocumentTextIcon className="mx-auto h-16 w-16 text-gray-400" />
          <ComponentTitle className="mt-4 text-xl text-gray-900 dark:text-gray-100">
            Start searching
          </ComponentTitle>
          <ComponentSubtitle className="mt-2 text-gray-600 dark:text-gray-400 max-w-md mx-auto">
            Use the search interface above to find documents in your organization's library.
            You can search by title, description, or content, and use advanced filters to narrow your results.
          </ComponentSubtitle>
          
          {recentSearches.length > 0 && (
            <div className="mt-6">
              <ComponentSubtitle className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                Recent searches:
              </ComponentSubtitle>
              <div className="flex flex-wrap justify-center gap-2">
                {recentSearches.map((search, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(search)}
                    className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                  >
                    {search}
                  </button>
                ))}
              </div>
            </div>
          )}
        </Paper>
      )}
    </div>
  );
};

export default DocumentSearchPage;