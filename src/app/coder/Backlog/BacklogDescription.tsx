import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';

interface BacklogDescriptionProps {
  description: string;
  className?: string;
}

export const BacklogDescription: React.FC<BacklogDescriptionProps> = ({
  description,
  className = ""
}) => {
  return (
    <div className={`prose prose-invert prose-sm max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // Custom styling for code blocks
          code: ({ node, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || '');
            const inline = !match;
            return !inline && match ? (
              <pre className="bg-slate-800/50 rounded-lg p-4 overflow-x-auto border border-slate-700/30">
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            ) : (
              <code className="bg-slate-800/50 px-2 py-1 rounded text-sm border border-slate-700/30" {...props}>
                {children}
              </code>
            );
          },
          // Custom styling for headings
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold text-white mb-4 border-b border-slate-700/30 pb-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-semibold text-white mb-3 mt-6">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-medium text-white mb-2 mt-4">
              {children}
            </h3>
          ),
          // Custom styling for paragraphs
          p: ({ children }) => (
            <p className="text-slate-200 leading-relaxed mb-4">
              {children}
            </p>
          ),
          // Custom styling for lists
          ul: ({ children }) => (
            <ul className="text-slate-200 mb-4 space-y-1">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="text-slate-200 mb-4 space-y-1">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-slate-200 ml-4">
              {children}
            </li>
          ),
          // Custom styling for blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-slate-600 pl-4 italic text-slate-300 bg-slate-800/30 py-2 rounded-r-lg mb-4">
              {children}
            </blockquote>
          ),
          // Custom styling for tables
          table: ({ children }) => (
            <div className="overflow-x-auto mb-4">
              <table className="w-full border-collapse border border-slate-700/30 rounded-lg">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-slate-800/50">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="border border-slate-700/30 px-4 py-2 text-left text-slate-200 font-medium">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-slate-700/30 px-4 py-2 text-slate-200">
              {children}
            </td>
          ),
          // Custom styling for links
          a: ({ children, href }) => (
            <a 
              href={href} 
              className="text-blue-400 hover:text-blue-300 underline transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
        }}
      >
        {description}
      </ReactMarkdown>
    </div>
  );
}; 