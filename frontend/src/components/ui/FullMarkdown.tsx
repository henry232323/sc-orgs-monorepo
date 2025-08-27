import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface FullMarkdownProps {
  content: string;
  className?: string;
}

/**
 * FullMarkdown component for detail pages
 * Supports complete markdown with GitHub Flavored Markdown
 */
const FullMarkdown: React.FC<FullMarkdownProps> = ({
  content,
  className = '',
}) => {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <p className='text-white/80 leading-relaxed mb-4 last:mb-0'>
              {children}
            </p>
          ),
          h1: ({ children }) => (
            <h1 className='text-2xl font-bold text-white mb-3'>{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className='text-xl font-bold text-white mb-2'>{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className='text-lg font-semibold text-white mb-2'>
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className='text-base font-semibold text-white mb-2'>
              {children}
            </h4>
          ),
          h5: ({ children }) => (
            <h5 className='text-sm font-semibold text-white mb-2'>
              {children}
            </h5>
          ),
          h6: ({ children }) => (
            <h6 className='text-xs font-semibold text-white mb-2'>
              {children}
            </h6>
          ),
          ul: ({ children }) => (
            <ul className='list-disc list-inside text-white/80 mb-4 space-y-1'>
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className='list-decimal list-inside text-white/80 mb-4 space-y-1'>
              {children}
            </ol>
          ),
          li: ({ children }) => <li className='text-white/80'>{children}</li>,
          strong: ({ children }) => (
            <strong className='font-semibold text-white'>{children}</strong>
          ),
          em: ({ children }) => (
            <em className='italic text-white/80'>{children}</em>
          ),
          code: ({ children }) => (
            <code className='bg-white/10 text-brand-secondary px-1 py-0.5 rounded text-sm'>
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className='bg-black/30 text-white/90 p-4 rounded-lg mb-4 overflow-x-auto'>
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className='border-l-4 border-brand-secondary/50 pl-4 italic text-white/70 mb-4'>
              {children}
            </blockquote>
          ),
          hr: () => <hr className='border-white/20 my-6' />,
          a: ({ href, children }) => (
            <a
              href={href}
              className='text-brand-secondary hover:underline'
              target='_blank'
              rel='noopener noreferrer'
            >
              {children}
            </a>
          ),
          img: ({ src, alt }) => (
            <img
              src={src}
              alt={alt}
              className='max-w-full h-auto rounded-lg mb-4'
            />
          ),
          table: ({ children }) => (
            <div className='overflow-x-auto mb-4'>
              <table className='min-w-full border-collapse border border-white/20'>
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className='bg-white/10'>{children}</thead>
          ),
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => (
            <tr className='border-b border-white/10'>{children}</tr>
          ),
          th: ({ children }) => (
            <th className='border border-white/20 px-4 py-2 text-left text-white font-semibold'>
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className='border border-white/20 px-4 py-2 text-white/80'>
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default FullMarkdown;
