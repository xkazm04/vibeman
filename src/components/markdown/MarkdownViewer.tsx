import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Copy, 
  Check, 
  ExternalLink, 
  Quote, 
  AlertCircle,
  Info,
  CheckCircle,
  AlertTriangle,
  FileText,
  Hash
} from 'lucide-react';

interface MarkdownViewerProps {
  content: string;
  className?: string;
  readOnly?: boolean;
  showLineNumbers?: boolean;
  theme?: 'dark' | 'light';
}

interface ParsedElement {
  type: 'heading' | 'paragraph' | 'code' | 'blockquote' | 'list' | 'callout' | 'divider' | 'image' | 'table';
  level?: number;
  content: string;
  language?: string;
  calloutType?: 'info' | 'success' | 'warning' | 'error';
  items?: string[];
  alt?: string;
  src?: string;
  headers?: string[];
  rows?: string[][];
}

export default function MarkdownViewer({ 
  content, 
  className = '', 
  readOnly = true,
  showLineNumbers = false,
  theme = 'dark'
}: MarkdownViewerProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Parse markdown content into structured elements
  const parsedElements = useMemo(() => {
    const elements: ParsedElement[] = [];
    const lines = content.split('\n');
    let i = 0;

    while (i < lines.length) {
      const line = lines[i].trim();
      
      if (!line) {
        i++;
        continue;
      }

      // Headings
      if (line.startsWith('#')) {
        const level = line.match(/^#+/)?.[0].length || 1;
        const text = line.replace(/^#+\s*/, '');
        elements.push({
          type: 'heading',
          level: Math.min(level, 6),
          content: text
        });
      }
      // Code blocks
      else if (line.startsWith('```')) {
        const language = line.replace('```', '').trim() || 'text';
        const codeLines: string[] = [];
        i++;
        
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        
        elements.push({
          type: 'code',
          content: codeLines.join('\n'),
          language
        });
      }
      // Callouts (:::type content :::)
      else if (line.startsWith(':::')) {
        const calloutType = line.replace(':::', '').trim() as 'info' | 'success' | 'warning' | 'error';
        const calloutLines: string[] = [];
        i++;
        
        while (i < lines.length && !lines[i].trim().startsWith(':::')) {
          calloutLines.push(lines[i]);
          i++;
        }
        
        elements.push({
          type: 'callout',
          content: calloutLines.join('\n').trim(),
          calloutType
        });
      }
      // Blockquotes
      else if (line.startsWith('>')) {
        const quoteLines: string[] = [];
        while (i < lines.length && lines[i].trim().startsWith('>')) {
          quoteLines.push(lines[i].replace(/^>\s?/, ''));
          i++;
        }
        i--; // Back up one since we'll increment at the end
        
        elements.push({
          type: 'blockquote',
          content: quoteLines.join('\n').trim()
        });
      }
      // Lists
      else if (line.match(/^[-*+]\s/) || line.match(/^\d+\.\s/)) {
        const listItems: string[] = [];
        while (i < lines.length && (lines[i].trim().match(/^[-*+]\s/) || lines[i].trim().match(/^\d+\.\s/))) {
          const item = lines[i].trim().replace(/^[-*+]\s/, '').replace(/^\d+\.\s/, '');
          listItems.push(item);
          i++;
        }
        i--; // Back up one since we'll increment at the end
        
        elements.push({
          type: 'list',
          content: '',
          items: listItems
        });
      }
      // Horizontal rule
      else if (line.match(/^---+$/) || line.match(/^\*\*\*+$/)) {
        elements.push({
          type: 'divider',
          content: ''
        });
      }
      // Tables
      else if (line.includes('|') && i + 1 < lines.length && lines[i + 1].trim().includes('|')) {
        // Check if the next line looks like a table separator (contains dashes and pipes)
        const nextLine = lines[i + 1].trim();
        if (nextLine.match(/^[\|\s\-:]+$/)) {
          // Parse table
          const headers = line.split('|').map(cell => cell.trim()).filter(cell => cell);
          const tableLines: string[] = [];
          
          // Skip the separator line
          i += 2;
          
          // Collect table rows
          while (i < lines.length && lines[i].trim().includes('|')) {
            tableLines.push(lines[i].trim());
            i++;
          }
          i--; // Back up one since we'll increment at the end
          
          const rows = tableLines.map(line => 
            line.split('|').map(cell => cell.trim()).filter(cell => cell)
          );
          
          elements.push({
            type: 'table',
            content: '',
            headers,
            rows
          });
        } else {
          // Not a table, treat as paragraph
          elements.push({
            type: 'paragraph',
            content: line
          });
        }
      }
      // Images
      else if (line.match(/!\[([^\]]*)\]\(([^)]+)\)/)) {
        const match = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);
        if (match) {
          elements.push({
            type: 'image',
            content: match[2],
            alt: match[1],
            src: match[2]
          });
        }
      }
      // Regular paragraphs
      else {
        elements.push({
          type: 'paragraph',
          content: line
        });
      }
      
      i++;
    }

    return elements;
  }, [content]);

  // Copy code to clipboard
  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  };

  // Render inline markdown (bold, italic, code, links)
  const renderInlineContent = (text: string) => {
    let processed = text;
    
    // Bold text
    processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>');
    
    // Italic text
    processed = processed.replace(/\*(.*?)\*/g, '<em class="italic text-gray-300">$1</em>');
    
    // Inline code
    processed = processed.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 bg-gray-800 text-pink-400 rounded text-sm font-mono border border-gray-700">$1</code>');
    
    // Links
    processed = processed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-cyan-400 hover:text-cyan-300 underline transition-colors" target="_blank" rel="noopener noreferrer">$1</a>');
    
    return <span dangerouslySetInnerHTML={{ __html: processed }} />;
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15
      }
    }
  };

  const calloutIcons = {
    info: <Info className="w-4 h-4" />,
    success: <CheckCircle className="w-4 h-4" />,
    warning: <AlertTriangle className="w-4 h-4" />,
    error: <AlertCircle className="w-4 h-4" />
  };

  const calloutStyles = {
    info: {
      container: 'bg-blue-500/10 border-blue-500/30 border-l-4 border-l-blue-500',
      icon: 'text-blue-400',
      text: 'text-blue-100'
    },
    success: {
      container: 'bg-green-500/10 border-green-500/30 border-l-4 border-l-green-500',
      icon: 'text-green-400',
      text: 'text-green-100'
    },
    warning: {
      container: 'bg-yellow-500/10 border-yellow-500/30 border-l-4 border-l-yellow-500',
      icon: 'text-yellow-400',
      text: 'text-yellow-100'
    },
    error: {
      container: 'bg-red-500/10 border-red-500/30 border-l-4 border-l-red-500',
      icon: 'text-red-400',
      text: 'text-red-100'
    }
  };

  if (!content.trim()) {
    return (
      <div className={`flex items-center justify-center py-12 text-gray-500 ${className}`}>
        <div className="text-center">
          <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg mb-2">No content to display</p>
          <p className="text-sm text-gray-600">The markdown content is empty</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className={`prose prose-invert max-w-none ${className}`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="space-y-6">
        {parsedElements.map((element, index) => (
          <motion.div key={index} variants={itemVariants}>
            {element.type === 'heading' && (
              <div className="group relative">
                {element.level === 1 && (
                  <h1 className="text-3xl font-bold text-white mb-6 mt-0 flex items-center space-x-3">
                    <Hash className="w-6 h-6 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span>{element.content}</span>
                  </h1>
                )}
                {element.level === 2 && (
                  <h2 className="text-2xl font-bold text-white mb-4 mt-8 pb-2 border-b border-gray-700 flex items-center space-x-3">
                    <Hash className="w-5 h-5 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span>{element.content}</span>
                  </h2>
                )}
                {element.level === 3 && (
                  <h3 className="text-xl font-semibold text-white mb-3 mt-6 flex items-center space-x-3">
                    <Hash className="w-4 h-4 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span>{element.content}</span>
                  </h3>
                )}
                {element.level && element.level > 3 && (
                  <h4 className="text-lg font-semibold text-white mb-2 mt-4 flex items-center space-x-3">
                    <Hash className="w-4 h-4 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span>{element.content}</span>
                  </h4>
                )}
              </div>
            )}

            {element.type === 'paragraph' && (
              <p className="text-gray-300 leading-relaxed">
                {renderInlineContent(element.content)}
              </p>
            )}

            {element.type === 'code' && (
              <div className="relative group">
                <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
                  {/* Code header */}
                  <div className="flex items-center justify-between px-4 py-2 bg-gray-800/50 border-b border-gray-700">
                    <span className="text-xs text-gray-400 font-mono">
                      {element.language}
                    </span>
                    <button
                      onClick={() => copyCode(element.content)}
                      className="flex items-center space-x-1 px-2 py-1 text-xs text-gray-400 hover:text-gray-300 hover:bg-gray-700/50 rounded transition-colors"
                    >
                      {copiedCode === element.content ? (
                        <>
                          <Check className="w-3 h-3" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  
                  {/* Code content */}
                  <pre className="p-4 overflow-x-auto">
                    <code className="text-sm font-mono text-gray-300 leading-relaxed">
                      {element.content}
                    </code>
                  </pre>
                </div>
              </div>
            )}

            {element.type === 'blockquote' && (
              <div className="border-l-4 border-gray-600 bg-gray-800/30 pl-4 py-3 my-4 rounded-r-lg">
                <div className="flex items-start space-x-3">
                  <Quote className="w-4 h-4 text-gray-500 mt-1 flex-shrink-0" />
                  <div className="text-gray-300 italic">
                    {renderInlineContent(element.content)}
                  </div>
                </div>
              </div>
            )}

            {element.type === 'list' && element.items && (
              <ul className="space-y-2 text-gray-300">
                {element.items.map((item, itemIndex) => (
                  <li key={itemIndex} className="flex items-start space-x-3">
                    <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full mt-2 flex-shrink-0"></span>
                    <span>{renderInlineContent(item)}</span>
                  </li>
                ))}
              </ul>
            )}

            {element.type === 'callout' && element.calloutType && (
              <div className={`p-4 rounded-lg border ${calloutStyles[element.calloutType].container}`}>
                <div className="flex items-start space-x-3">
                  <div className={`${calloutStyles[element.calloutType].icon} mt-0.5`}>
                    {calloutIcons[element.calloutType]}
                  </div>
                  <div className={`${calloutStyles[element.calloutType].text} space-y-2`}>
                    {element.content.split('\n').map((line, lineIndex) => (
                      <p key={lineIndex} className="leading-relaxed">
                        {renderInlineContent(line)}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {element.type === 'divider' && (
              <hr className="my-8 border-0 h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent" />
            )}

            {element.type === 'image' && element.src && (
              <div className="my-6">
                <img
                  src={element.src}
                  alt={element.alt || ''}
                  className="max-w-full h-auto rounded-lg border border-gray-700 shadow-lg"
                />
                {element.alt && (
                  <p className="text-sm text-gray-500 text-center mt-2 italic">
                    {element.alt}
                  </p>
                )}
              </div>
            )}

            {element.type === 'table' && (
              <div className="my-6 overflow-x-auto">
                <div className="inline-block min-w-full">
                  <table className="min-w-full border border-gray-700 rounded-lg overflow-hidden bg-gray-900/50 backdrop-blur-sm">
                    <thead>
                      <tr className="bg-gray-800/80 border-b border-gray-700">
                        {element.headers?.map((header, headerIndex) => (
                          <th
                            key={headerIndex}
                            className={`
                              px-4 py-3 font-semibold text-gray-200 text-sm text-left
                              ${headerIndex === 0 ? 'rounded-tl-lg' : ''}
                              ${headerIndex === (element.headers?.length || 0) - 1 ? 'rounded-tr-lg' : ''}
                              border-r border-gray-700 last:border-r-0
                            `}
                          >
                            {renderInlineContent(header)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {element.rows?.map((row, rowIndex) => (
                        <tr
                          key={rowIndex}
                          className={`
                            border-b border-gray-700/50 last:border-b-0
                            hover:bg-gray-800/30 transition-colors duration-200
                            ${rowIndex % 2 === 0 ? 'bg-gray-900/20' : 'bg-gray-800/10'}
                          `}
                        >
                          {row.map((cell, cellIndex) => (
                            <td
                              key={cellIndex}
                              className={`
                                px-4 py-3 text-gray-300 text-sm leading-relaxed text-left
                                border-r border-gray-700/30 last:border-r-0
                                ${rowIndex === (element.rows?.length || 0) - 1 && cellIndex === 0 ? 'rounded-bl-lg' : ''}
                                ${rowIndex === (element.rows?.length || 0) - 1 && cellIndex === row.length - 1 ? 'rounded-br-lg' : ''}
                              `}
                            >
                              {renderInlineContent(cell)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Table info */}
                <div className="mt-2 text-xs text-gray-500 flex items-center justify-between">
                  <span>{element.rows?.length || 0} row{(element.rows?.length || 0) !== 1 ? 's' : ''}</span>
                  <span>{element.headers?.length || 0} column{(element.headers?.length || 0) !== 1 ? 's' : ''}</span>
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}