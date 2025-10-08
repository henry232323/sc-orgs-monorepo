import React from 'react';
import { Link } from 'react-router-dom';
import {
  DocumentTextIcon,
  ClockIcon,
  FolderIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import Paper from '../../ui/Paper';
import Chip from '../../ui/Chip';
import { ComponentTitle, ComponentSubtitle, Caption } from '../../ui/Typography';
import SearchHighlighter from './SearchHighlighter';
import type { Document } from '../../../types/hr';

interface SearchResult {
  document: Document;
  relevance_score: number;
  content_snippet?: string | undefined;
  highlighted_snippet?: string | undefined;
  match_positions?: Array<{
    start: number;
    end: number;
    field: 'title' | 'description' | 'content';
  }> | undefined;
}

interface SearchResultsProps {
  results: SearchResult[];
  searchTerm: string;
  total: number;
  executionTimeMs?: number | undefined;
  suggestions?: string[] | undefined;
  onSuggestionClick?: (suggestion: string) => void;
  organizationId: string;
  loading?: boolean;
}

interface SearchResultItemProps {
  result: SearchResult;
  searchTerm: string;
  organizationId: string;
}

const SearchResultItem: React.FC<SearchResultItemProps> = ({
  result,
  searchTerm,
  organizationId,
}) => {
  const { document, relevance_score, content_snippet, highlighted_snippet } = result;
  
  // Extract search terms from the search query
  const searchTerms = searchTerm
    .split(/\s+/)
    .filter(term => term.length > 1)
    .map(term => term.replace(/[^\w\s]/g, ''));

  const formatReadingTime = (minutes: number) => {
    if (minutes < 1) return '< 1 min read';
    return `${Math.round(minutes)} min read`;
  };

  const formatRelevanceScore = (score: number) => {
    return Math.round(score * 100);
  };

  return (
    <Paper className="p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <Link
            to={`/organizations/${organizationId}/documents/${document.id}`}
            className="block group"
          >
            <ComponentTitle className="text-lg group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              <SearchHighlighter
                text={document.title}
                searchTerms={searchTerms}
                className="font-semibold"
              />
            </ComponentTitle>
          </Link>
          
          {document.description && (
            <ComponentSubtitle className="mt-1 text-gray-600 dark:text-gray-400">
              <SearchHighlighter
                text={document.description}
                searchTerms={searchTerms}
              />
            </ComponentSubtitle>
          )}
        </div>
        
        <div className="flex items-center space-x-2 ml-4">
          <Chip
            variant="status"
            size="sm"
            className="text-xs"
          >
            {formatRelevanceScore(relevance_score)}% match
          </Chip>
        </div>
      </div>

      {/* Content snippet with highlighting */}
      {(content_snippet || highlighted_snippet) && (
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
            {highlighted_snippet ? (
              <SearchHighlighter
                text=""
                highlightedText={highlighted_snippet}
                className="search-snippet"
              />
            ) : (
              <SearchHighlighter
                text={content_snippet!}
                searchTerms={searchTerms}
                maxLength={300}
              />
            )}
          </div>
        </div>
      )}

      {/* Document metadata */}
      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <FolderIcon className="h-4 w-4" />
            <span>{document.folder_path || '/'}</span>
          </div>
          
          <div className="flex items-center space-x-1">
            <DocumentTextIcon className="h-4 w-4" />
            <span>{document.word_count || 0} words</span>
          </div>
          
          <div className="flex items-center space-x-1">
            <ClockIcon className="h-4 w-4" />
            <span>{formatReadingTime(document.estimated_reading_time || 1)}</span>
          </div>

          {document.requires_acknowledgment && (
            <div className="flex items-center space-x-1">
              <CheckCircleIcon className="h-4 w-4 text-amber-500" />
              <span>Requires acknowledgment</span>
            </div>
          )}
        </div>

        <div className="text-xs">
          Updated {new Date(document.updated_at).toLocaleDateString()}
        </div>
      </div>
    </Paper>
  );
};

const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  searchTerm,
  total,
  executionTimeMs,
  suggestions = [],
  onSuggestionClick,
  organizationId,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, index) => (
          <Paper key={index} className="p-6 animate-pulse">
            <div className="space-y-3">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="flex space-x-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
              </div>
            </div>
          </Paper>
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-12">
        <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
        <ComponentTitle className="mt-4 text-gray-900 dark:text-gray-100">
          No documents found
        </ComponentTitle>
        <ComponentSubtitle className="mt-2 text-gray-600 dark:text-gray-400">
          No documents match your search for "{searchTerm}"
        </ComponentSubtitle>
        
        {suggestions.length > 0 && (
          <div className="mt-6">
            <Caption className="text-gray-500 dark:text-gray-400 mb-3">
              Did you mean:
            </Caption>
            <div className="flex flex-wrap justify-center gap-2">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => onSuggestionClick?.(suggestion)}
                  className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search metadata */}
      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
        <div>
          Found {total.toLocaleString()} result{total !== 1 ? 's' : ''} for "{searchTerm}"
        </div>
        {executionTimeMs !== undefined && (
          <div>
            Search completed in {executionTimeMs}ms
          </div>
        )}
      </div>

      {/* Search results */}
      <div className="space-y-4">
        {results.map((result) => (
          <SearchResultItem
            key={result.document.id}
            result={result}
            searchTerm={searchTerm}
            organizationId={organizationId}
          />
        ))}
      </div>
    </div>
  );
};

export default SearchResults;