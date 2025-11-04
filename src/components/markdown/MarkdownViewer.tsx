import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';

// Import components
import MdHeading from './MdHeading';
import MdParagraph from './MdParagraph';
import MdCode from './MdCode';
import MdBlockquote from './MdBlockquote';
import MdList from './MdList';
import MdCallout from './MdCallout';
import MdDivider from './MdDivider';
import MdTable from './MdTable';
import {MdImage} from './MdImage';
import TableOfContents from './TableOfContents';
import InteractiveContent from './InteractiveContent';
import SimplePlantUML from './SimplePlantUML';

interface MarkdownViewerProps {
  content: string;
  className?: string;
}

interface ParsedElement {
  type: 'heading' | 'paragraph' | 'code' | 'blockquote' | 'list' | 'callout' | 'divider' | 'image' | 'table' | 'plantuml';
  level?: number;
  content: string;
  language?: string;
  calloutType?: 'info' | 'success' | 'warning' | 'error';
  items?: string[];
  alt?: string;
  src?: string;
  headers?: string[];
  rows?: string[][];
  id?: string;
}

interface TOCItem {
  id: string;
  text: string;
  level: number;
}

export default function MarkdownViewer({
  content,
  className = ''
}: MarkdownViewerProps) {
  // Parse markdown content into structured elements
  const { parsedElements, tocItems } = useMemo(() => {
    const elements: ParsedElement[] = [];
    const toc: TOCItem[] = [];
    const lines = content.split('\n');
    let i = 0;

    const generateId = (text: string): string => {
      return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .trim();
    };

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
        const id = generateId(text);

        elements.push({
          type: 'heading',
          level: Math.min(level, 6),
          content: text,
          id
        });

        toc.push({
          id,
          text,
          level: Math.min(level, 6)
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

        // Special handling for PlantUML
        if (language === 'plantuml' || language === 'puml') {
          elements.push({
            type: 'plantuml' as any,
            content: codeLines.join('\n'),
            language
          });
        } else {
          elements.push({
            type: 'code',
            content: codeLines.join('\n'),
            language
          });
        }
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

    return { parsedElements: elements, tocItems: toc };
  }, [content]);

  // Render inline markdown with interactive content support
  const renderInlineContent = (text: string): React.ReactElement => {
    let processed = text;

    // Interactive content syntax: {{trigger|content|type}}
    // Use a more robust parsing approach to handle content with pipe characters
    const interactiveMatches: Array<{
      match: string;
      trigger: string;
      content: string;
      type: 'text' | 'plantuml';
    }> = [];

    // Find all {{...}} blocks
    const blockRegex = /\{\{([^}]+)\}\}/g;
    let match;
    while ((match = blockRegex.exec(text)) !== null) {
      const fullMatch = match[0];
      const innerContent = match[1];
      
      // Split by pipe, but only take the first and last parts as delimiters
      // Everything in between is the content (which may contain pipes)
      const parts = innerContent.split('|');
      if (parts.length >= 3) {
        const trigger = parts[0].trim();
        const type = parts[parts.length - 1].trim() as 'text' | 'plantuml';
        const content = parts.slice(1, -1).join('|').trim();
        
        interactiveMatches.push({
          match: fullMatch,
          trigger,
          content,
          type
        });
      }
    }

    // Replace interactive content with placeholders
    interactiveMatches.forEach((item, index) => {
      processed = processed.replace(item.match, `__INTERACTIVE_${index}__`);
    });

    // Bold text
    processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>');

    // Italic text
    processed = processed.replace(/\*(.*?)\*/g, '<em class="italic text-gray-300">$1</em>');

    // Inline code
    processed = processed.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 bg-gray-800 text-red-400 rounded text-sm font-mono border border-gray-700">$1</code>');

    // Links
    processed = processed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-cyan-400 hover:text-cyan-300 underline transition-colors" target="_blank" rel="noopener noreferrer">$1</a>');

    // Split by interactive placeholders and render
    const parts = processed.split(/__INTERACTIVE_\d+__/);
    const result: React.ReactNode[] = [];

    parts.forEach((part, index) => {
      if (part) {
        result.push(
          <span key={`text-${index}`} dangerouslySetInnerHTML={{ __html: part }} />
        );
      }

      if (index < interactiveMatches.length) {
        const interactive = interactiveMatches[index];
        result.push(
          <InteractiveContent
            key={`interactive-${index}`}
            trigger={interactive.trigger}
            content={interactive.content}
            type={interactive.type}
            renderInlineContent={renderInlineContent}
          />
        );
      }
    });

    return <>{result}</>;
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring" as const,
        stiffness: 100,
        damping: 15
      }
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
    <>
      {/* Table of Contents */}
      <TableOfContents headings={tocItems} />

      {/* Main Content */}
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
                <MdHeading
                  level={element.level!}
                  content={element.content}
                  id={element.id!}
                  renderInlineContent={renderInlineContent}
                />
              )}

              {element.type === 'paragraph' && (
                <MdParagraph
                  content={element.content}
                  renderInlineContent={renderInlineContent}
                />
              )}

              {element.type === 'code' && (
                <MdCode
                  content={element.content}
                  language={element.language!}
                  index={index}
                />
              )}

              {element.type === 'blockquote' && (
                <MdBlockquote
                  content={element.content}
                  renderInlineContent={renderInlineContent}
                />
              )}

              {element.type === 'list' && element.items && (
                <MdList
                  items={element.items}
                  renderInlineContent={renderInlineContent}
                />
              )}

              {element.type === 'callout' && element.calloutType && (
                <MdCallout
                  content={element.content}
                  calloutType={element.calloutType}
                  renderInlineContent={renderInlineContent}
                />
              )}

              {element.type === 'divider' && <MdDivider />}

              {element.type === 'image' && element.src && (
                <MdImage
                  content={element.src}
                  alt={element.alt}
                />
              )}

              {element.type === 'table' && element.headers && element.rows && (
                <MdTable
                  headers={element.headers}
                  rows={element.rows}
                  renderInlineContent={renderInlineContent}
                />
              )}

              {element.type === 'plantuml' && (
                <SimplePlantUML
                  content={element.content}
                  title="PlantUML Diagram"
                />
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>
    </>
  );
}