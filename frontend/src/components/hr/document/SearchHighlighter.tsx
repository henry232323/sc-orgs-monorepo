import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MatchPosition {
  start: number;
  end: number;
  field: 'title' | 'description' | 'content';
}

interface SearchHighlighterProps {
  text: string;
  searchTerms?: string[];
  highlightedText?: string;
  matchPositions?: MatchPosition[];
  isMarkdown?: boolean;
  maxLength?: number;
  className?: string;
}

interface HighlightedTextProps {
  text: string;
  searchTerms: string[];
  className?: string;
}

/**
 * Component for highlighting search terms in plain text
 */
const HighlightedText: React.FC<HighlightedTextProps> = ({
  text,
  searchTerms,
  className = '',
}) => {
  if (!searchTerms || searchTerms.length === 0) {
    return <span className={className}>{text}</span>;
  }

  // Create a regex pattern for all search terms
  const pattern = searchTerms
    .map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) // Escape regex chars
    .join('|');
  
  const regex = new RegExp(`(${pattern})`, 'gi');
  const parts = text.split(regex);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        const isMatch = searchTerms.some(term => 
          part.toLowerCase() === term.toLowerCase()
        );
        
        return isMatch ? (
          <mark 
            key={index} 
            className="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded"
          >
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        );
      })}
    </span>
  );
};

/**
 * Component for highlighting search terms in markdown content
 */
const HighlightedMarkdown: React.FC<{
  content: string;
  searchTerms: string[];
  className?: string;
}> = ({ content, searchTerms, className = '' }) => {
  // Pre-process markdown to add highlighting
  const highlightedContent = useMemo(() => {
    if (!searchTerms || searchTerms.length === 0) {
      return content;
    }

    let highlighted = content;
    
    // Highlight search terms while preserving markdown syntax
    searchTerms.forEach(term => {
      const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escapedTerm})`, 'gi');
      
      // Use a temporary placeholder to avoid conflicts with markdown syntax
      const placeholder = `__HIGHLIGHT_${Math.random().toString(36).substr(2, 9)}__`;
      highlighted = highlighted.replace(regex, `${placeholder}$1${placeholder}`);
    });

    return highlighted;
  }, [content, searchTerms]);

  // Custom renderer to handle our highlight placeholders
  const components = useMemo(() => ({
    p: ({ children, ...props }: any) => {
      const processChildren = (child: any): any => {
        if (typeof child === 'string') {
          // Replace our placeholders with actual highlight markup
          const parts = child.split(/(__HIGHLIGHT_[a-z0-9]+__)/);
          return parts.map((part: string, index: number) => {
            if (part.startsWith('__HIGHLIGHT_') && part.endsWith('__')) {
              return null; // Remove placeholder
            }
            
            // Check if this part should be highlighted
            const shouldHighlight = searchTerms.some(term =>
              part.toLowerCase().includes(term.toLowerCase())
            );
            
            if (shouldHighlight) {
              return (
                <mark 
                  key={index}
                  className="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded"
                >
                  {part}
                </mark>
              );
            }
            
            return part;
          });
        }
        return child;
      };

      const processedChildren = React.Children.map(children, processChildren);
      return <p {...props}>{processedChildren}</p>;
    },
  }), [searchTerms]);

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
      >
        {highlightedContent}
      </ReactMarkdown>
    </div>
  );
};

/**
 * Main search highlighter component
 */
const SearchHighlighter: React.FC<SearchHighlighterProps> = ({
  text,
  searchTerms = [],
  highlightedText,
  // matchPositions,
  isMarkdown = false,
  maxLength,
  className = '',
}) => {
  // If we have pre-highlighted text from the backend, use it
  if (highlightedText) {
    return (
      <div 
        className={`search-highlighted-content ${className}`}
        dangerouslySetInnerHTML={{ __html: highlightedText }}
      />
    );
  }

  // Truncate text if maxLength is specified
  const displayText = maxLength && text.length > maxLength
    ? `${text.substring(0, maxLength)}...`
    : text;

  // Render based on content type
  if (isMarkdown) {
    return (
      <HighlightedMarkdown
        content={displayText}
        searchTerms={searchTerms}
        className={className}
      />
    );
  }

  return (
    <HighlightedText
      text={displayText}
      searchTerms={searchTerms}
      className={className}
    />
  );
};

export default SearchHighlighter;

// Export individual components for specific use cases
export { HighlightedText, HighlightedMarkdown };