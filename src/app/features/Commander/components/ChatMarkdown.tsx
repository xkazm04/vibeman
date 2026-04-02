/**
 * ChatMarkdown — Lightweight markdown renderer for Annette chat bubbles.
 *
 * Handles the subset of markdown that Claude typically produces in chat:
 * bold, italic, inline code, code blocks, headings, bullet lists, links, and paragraphs.
 *
 * Deliberately minimal — no animations, no TOC, no interactive content.
 * Designed for dark-on-dark chat bubble context (slate-300 text on slate-800 bg).
 */

'use client';

import React, { useMemo } from 'react';

interface ChatMarkdownProps {
  content: string;
}

/** Render inline markdown: **bold**, *italic*, `code`, [links](url) */
function renderInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Regex matches: **bold**, *italic*, `code`, [text](url)
  const pattern = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    // Text before this match
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    if (match[2] !== undefined) {
      // **bold**
      nodes.push(
        <strong key={match.index} className="font-semibold text-slate-100">
          {match[2]}
        </strong>
      );
    } else if (match[3] !== undefined) {
      // *italic*
      nodes.push(
        <em key={match.index} className="italic text-slate-200">
          {match[3]}
        </em>
      );
    } else if (match[4] !== undefined) {
      // `inline code`
      nodes.push(
        <code
          key={match.index}
          className="px-1 py-0.5 bg-slate-700/80 text-amber-300 rounded text-[0.8em] font-mono border border-slate-600/40"
        >
          {match[4]}
        </code>
      );
    } else if (match[5] !== undefined && match[6] !== undefined) {
      // [text](url)
      nodes.push(
        <a
          key={match.index}
          href={match[6]}
          className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
          target="_blank"
          rel="noopener noreferrer"
        >
          {match[5]}
        </a>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining text after last match
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : [text];
}

/** Parse markdown into block elements */
interface Block {
  type: 'heading' | 'paragraph' | 'list' | 'code' | 'divider';
  level?: number;
  content?: string;
  items?: string[];
  language?: string;
}

function parseBlocks(content: string): Block[] {
  const blocks: Block[] = [];
  const lines = content.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Empty line — skip
    if (!trimmed) {
      i++;
      continue;
    }

    // Code block
    if (trimmed.startsWith('```')) {
      const language = trimmed.slice(3).trim() || 'text';
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push({ type: 'code', content: codeLines.join('\n'), language });
      i++; // skip closing ```
      continue;
    }

    // Heading
    if (trimmed.startsWith('#')) {
      const level = trimmed.match(/^#+/)?.[0].length || 1;
      const text = trimmed.replace(/^#+\s*/, '');
      blocks.push({ type: 'heading', level: Math.min(level, 4), content: text });
      i++;
      continue;
    }

    // Horizontal rule
    if (trimmed.match(/^[-*_]{3,}$/)) {
      blocks.push({ type: 'divider' });
      i++;
      continue;
    }

    // Bullet/numbered list
    if (trimmed.match(/^[-*+]\s/) || trimmed.match(/^\d+\.\s/)) {
      const items: string[] = [];
      while (
        i < lines.length &&
        (lines[i].trim().match(/^[-*+]\s/) || lines[i].trim().match(/^\d+\.\s/))
      ) {
        items.push(lines[i].trim().replace(/^[-*+]\s+/, '').replace(/^\d+\.\s+/, ''));
        i++;
      }
      blocks.push({ type: 'list', items });
      continue;
    }

    // Paragraph — collect consecutive non-empty, non-special lines
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith('#') &&
      !lines[i].trim().startsWith('```') &&
      !lines[i].trim().match(/^[-*+]\s/) &&
      !lines[i].trim().match(/^\d+\.\s/) &&
      !lines[i].trim().match(/^[-*_]{3,}$/)
    ) {
      paraLines.push(lines[i].trim());
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push({ type: 'paragraph', content: paraLines.join(' ') });
    }
  }

  return blocks;
}

const HEADING_STYLES: Record<number, string> = {
  1: 'text-base font-semibold text-slate-100 mt-3 mb-1.5',
  2: 'text-sm font-semibold text-slate-100 mt-2.5 mb-1',
  3: 'text-sm font-medium text-slate-200 mt-2 mb-1',
  4: 'text-xs font-medium text-slate-300 mt-1.5 mb-0.5 uppercase tracking-wide',
};

export default function ChatMarkdown({ content }: ChatMarkdownProps) {
  const blocks = useMemo(() => parseBlocks(content), [content]);

  return (
    <div className="space-y-1.5 break-words">
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'heading':
            return (
              <div key={i} className={HEADING_STYLES[block.level || 3]}>
                {renderInline(block.content || '')}
              </div>
            );

          case 'paragraph':
            return (
              <p key={i} className="text-slate-300 leading-relaxed">
                {renderInline(block.content || '')}
              </p>
            );

          case 'list':
            return (
              <ul key={i} className="space-y-1 my-1">
                {block.items?.map((item, j) => (
                  <li key={j} className="flex items-start gap-2 text-slate-300">
                    <span className="w-1 h-1 rounded-full bg-cyan-400/60 mt-2 flex-shrink-0" />
                    <span className="leading-relaxed">{renderInline(item)}</span>
                  </li>
                ))}
              </ul>
            );

          case 'code':
            return (
              <pre
                key={i}
                className="bg-slate-900/80 border border-slate-700/40 rounded-lg px-3 py-2 my-1.5 overflow-x-auto"
              >
                <code className="text-xs font-mono text-emerald-300 leading-relaxed">
                  {block.content}
                </code>
              </pre>
            );

          case 'divider':
            return (
              <hr key={i} className="border-slate-700/40 my-2" />
            );

          default:
            return null;
        }
      })}
    </div>
  );
}
