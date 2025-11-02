import React from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Clock, Tag } from 'lucide-react';
import { DbDocumentation } from '@/app/db';
import ReactMarkdown from 'react-markdown';

interface DocsContentProps {
  doc: DbDocumentation;
  onRegenerate: (doc: DbDocumentation) => void;
}

export default function DocsContent({ doc, onRegenerate }: DocsContentProps) {
  const [isRegenerating, setIsRegenerating] = React.useState(false);

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    await onRegenerate(doc);
    setIsRegenerating(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-slate-800/30 border border-slate-700 rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-800/50 p-6 border-b border-slate-700">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">{doc.title}</h2>
            <div className="flex items-center gap-4 text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Updated {new Date(doc.updated_at).toLocaleString()}</span>
              </div>
              {doc.auto_generated === 1 && (
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  <span>Auto-generated</span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className="px-4 py-2 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
            {isRegenerating ? 'Regenerating...' : 'Regenerate'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="prose prose-invert prose-slate max-w-none">
          <ReactMarkdown
            components={{
              h1: ({ children }) => (
                <h1 className="text-3xl font-bold text-white mb-4 mt-6">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-2xl font-bold text-white mb-3 mt-5">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-xl font-semibold text-white mb-2 mt-4">{children}</h3>
              ),
              h4: ({ children }) => (
                <h4 className="text-lg font-semibold text-slate-200 mb-2 mt-3">{children}</h4>
              ),
              p: ({ children }) => (
                <p className="text-slate-300 mb-4 leading-relaxed">{children}</p>
              ),
              ul: ({ children }) => (
                <ul className="list-disc list-inside text-slate-300 mb-4 space-y-2">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal list-inside text-slate-300 mb-4 space-y-2">{children}</ol>
              ),
              li: ({ children }) => (
                <li className="text-slate-300">{children}</li>
              ),
              code: ({ inline, children, ...props }: any) =>
                inline ? (
                  <code className="bg-slate-900 text-cyan-400 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                    {children}
                  </code>
                ) : (
                  <code className="block bg-slate-900 text-slate-300 p-4 rounded-lg overflow-x-auto text-sm font-mono mb-4" {...props}>
                    {children}
                  </code>
                ),
              pre: ({ children }) => (
                <pre className="mb-4">{children}</pre>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-blue-500 pl-4 italic text-slate-400 my-4">
                  {children}
                </blockquote>
              ),
              a: ({ children, href }) => (
                <a
                  href={href}
                  className="text-blue-400 hover:text-blue-300 underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {children}
                </a>
              ),
              hr: () => (
                <hr className="border-slate-700 my-6" />
              ),
              table: ({ children }) => (
                <div className="overflow-x-auto mb-4">
                  <table className="min-w-full border border-slate-700">{children}</table>
                </div>
              ),
              thead: ({ children }) => (
                <thead className="bg-slate-800">{children}</thead>
              ),
              tbody: ({ children }) => (
                <tbody>{children}</tbody>
              ),
              tr: ({ children }) => (
                <tr className="border-b border-slate-700">{children}</tr>
              ),
              th: ({ children }) => (
                <th className="px-4 py-2 text-left text-white font-semibold">{children}</th>
              ),
              td: ({ children }) => (
                <td className="px-4 py-2 text-slate-300">{children}</td>
              )
            }}
          >
            {doc.content}
          </ReactMarkdown>
        </div>

        {/* Metadata Footer */}
        {doc.last_sync_at && (
          <div className="mt-8 pt-4 border-t border-slate-700">
            <div className="text-sm text-slate-500">
              Last synced: {new Date(doc.last_sync_at).toLocaleString()}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
