'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import type { Components } from 'react-markdown';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const components: Components = {
  h1: ({ children }) => (
    <h1 className="text-lg font-bold text-foreground mb-3 mt-4">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-base font-semibold text-foreground/90 mb-2 mt-3">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-semibold text-foreground/80 mb-2 mt-2">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="text-sm text-foreground/70 mb-3 leading-relaxed">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="list-disc list-inside space-y-1 mb-3 text-sm text-foreground/70">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-inside space-y-1 mb-3 text-sm text-foreground/70">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="text-foreground/70">{children}</li>
  ),
  code: ({ className, children, ...props }) => {
    const isBlock = className?.includes('language-');
    if (isBlock) {
      return (
        <code
          className={`block p-4 bg-background/50 border border-border/30 rounded-xl text-xs font-mono overflow-x-auto ${className || ''}`}
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <code
        className="px-1.5 py-0.5 bg-secondary/60 border border-border/30 rounded text-xs font-mono text-primary/80"
        {...props}
      >
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="mb-3">{children}</pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-primary/30 pl-4 italic text-foreground/50 my-3">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <table className="w-full text-sm mb-3">{children}</table>
  ),
  th: ({ children }) => (
    <th className="text-left font-medium text-foreground/70 pb-2 border-b border-border/30">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="py-1.5 text-foreground/60 border-b border-border/20">{children}</td>
  ),
  a: ({ href, children }) => (
    <a href={href} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  hr: () => <hr className="border-border/30 my-4" />,
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground/80">{children}</strong>
  ),
};

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
