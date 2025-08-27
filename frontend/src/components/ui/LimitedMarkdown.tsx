import React from 'react';
import ReactMarkdown from 'react-markdown';

interface LimitedMarkdownProps {
  content: string;
  className?: string;
}

/**
 * LimitedMarkdown component for card/list views
 * Supports only basic text formatting and disables complex elements
 */
const LimitedMarkdown: React.FC<LimitedMarkdownProps> = ({
  content,
  className = '',
}) => {
  return (
    <div className={className}>
      <ReactMarkdown
        components={{
          // Only allow basic text formatting
          p: ({ children }) => (
            <span className='text-white/80'>{children}</span>
          ),
          strong: ({ children }) => (
            <strong className='font-semibold text-white'>{children}</strong>
          ),
          em: ({ children }) => (
            <em className='italic text-white/70'>{children}</em>
          ),
          code: ({ children }) => (
            <code className='bg-white/10 text-brand-secondary px-1 py-0.5 rounded text-xs'>
              {children}
            </code>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              className='text-brand-secondary hover:underline'
              target='_blank'
              rel='noopener noreferrer'
              onClick={e => e.stopPropagation()}
            >
              {children}
            </a>
          ),
          // Disable complex elements for list view
          h1: ({ children }) => (
            <span className='text-white/80 font-semibold'>{children}</span>
          ),
          h2: ({ children }) => (
            <span className='text-white/80 font-semibold'>{children}</span>
          ),
          h3: ({ children }) => (
            <span className='text-white/80 font-semibold'>{children}</span>
          ),
          h4: ({ children }) => (
            <span className='text-white/80 font-semibold'>{children}</span>
          ),
          h5: ({ children }) => (
            <span className='text-white/80 font-semibold'>{children}</span>
          ),
          h6: ({ children }) => (
            <span className='text-white/80 font-semibold'>{children}</span>
          ),
          blockquote: ({ children }) => (
            <span className='text-white/80 italic'>{children}</span>
          ),
          hr: () => <span className='text-white/60'> — </span>,
          // Remove complex elements
          img: () => null,
          video: () => null,
          table: () => null,
          thead: () => null,
          tbody: () => null,
          tr: () => null,
          th: () => null,
          td: () => null,
          ul: ({ children }) => (
            <span className='text-white/80'>{children}</span>
          ),
          ol: ({ children }) => (
            <span className='text-white/80'>{children}</span>
          ),
          li: ({ children }) => (
            <span className='text-white/80'>{children} </span>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default LimitedMarkdown;
