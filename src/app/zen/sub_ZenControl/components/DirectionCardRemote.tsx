'use client';

import React, { useState, useMemo } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Calendar, Compass, MapPin, Wifi } from 'lucide-react';
import type { RemoteDirection } from '@/stores/remoteWorkStore';
import { stripMarkdownListPrefix } from '@/lib/stringUtils';

interface DirectionCardRemoteProps {
  direction: RemoteDirection;
  onSwipeLeft: () => void; // Reject
  onSwipeRight: () => void; // Accept
  onSwipeDown?: () => void; // Skip
  style?: React.CSSProperties;
  isProcessing?: boolean;
}

/**
 * Compact markdown renderer for direction cards
 */
function CompactMarkdown({ content }: { content: string }) {
  const rendered = useMemo(() => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let i = 0;

    const renderInline = (text: string): React.ReactNode => {
      const parts: React.ReactNode[] = [];
      let lastIndex = 0;

      // Bold **text**
      const boldRegex = /\*\*([^*]+)\*\*/g;
      let match;

      while ((match = boldRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
          parts.push(text.slice(lastIndex, match.index));
        }
        parts.push(<strong key={match.index} className="font-semibold text-white">{match[1]}</strong>);
        lastIndex = match.index + match[0].length;
      }

      if (parts.length > 0) {
        if (lastIndex < text.length) {
          parts.push(text.slice(lastIndex));
        }
        return <>{parts}</>;
      }

      // Inline code `code`
      const processed = text.replace(
        /`([^`]+)`/g,
        '<code class="px-1 py-0.5 bg-gray-700/50 text-purple-300 rounded text-xs font-mono">$1</code>'
      );

      return <span dangerouslySetInnerHTML={{ __html: processed }} />;
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
        const headingClass = level <= 2
          ? 'text-xs font-bold text-purple-300 mt-2 mb-0.5'
          : 'text-xs font-semibold text-gray-300 mt-1.5 mb-0.5';

        elements.push(
          <div key={i} className={headingClass}>
            {renderInline(text)}
          </div>
        );
      }
      // Lists
      else if (line.match(/^[-*+]\s/) || line.match(/^\d+\.\s/)) {
        const listItems: string[] = [];
        while (i < lines.length && (lines[i].trim().match(/^[-*+]\s/) || lines[i].trim().match(/^\d+\.\s/))) {
          const item = stripMarkdownListPrefix(lines[i]);
          listItems.push(item);
          i++;
        }
        i--;

        elements.push(
          <ul key={i} className="space-y-0.5 ml-2">
            {listItems.slice(0, 5).map((item, idx) => (
              <li key={idx} className="text-[11px] text-gray-300 flex items-start gap-1">
                <span className="text-purple-400 mt-0.5">-</span>
                <span className="line-clamp-1">{renderInline(item)}</span>
              </li>
            ))}
            {listItems.length > 5 && (
              <li className="text-[10px] text-gray-500 ml-3">+{listItems.length - 5} more...</li>
            )}
          </ul>
        );
      }
      // Regular paragraphs
      else {
        elements.push(
          <p key={i} className="text-[11px] text-gray-300 leading-relaxed line-clamp-2">
            {renderInline(line)}
          </p>
        );
      }

      i++;
    }

    return elements.slice(0, 8); // Limit rendered elements
  }, [content]);

  return <div className="space-y-0.5">{rendered}</div>;
}

export default function DirectionCardRemote({
  direction,
  onSwipeLeft,
  onSwipeRight,
  onSwipeDown,
  style,
  isProcessing = false,
}: DirectionCardRemoteProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateZ = useTransform(x, [-200, 200], [-12, 12]);

  const [exitX, setExitX] = useState(0);
  const [exitY, setExitY] = useState(0);
  const [exitOpacity, setExitOpacity] = useState(1);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (isProcessing) return;

    const threshold = 100;

    // Swipe down (skip)
    if (info.offset.y > threshold && onSwipeDown) {
      setExitY(500);
      setExitOpacity(0);
      setTimeout(() => onSwipeDown(), 150);
      return;
    }

    // Swipe left/right
    if (Math.abs(info.offset.x) > threshold) {
      setExitX(info.offset.x > 0 ? 600 : -600);
      setExitOpacity(0);

      setTimeout(() => {
        if (info.offset.x > 0) {
          onSwipeRight(); // Accept
        } else {
          onSwipeLeft(); // Reject
        }
      }, 150);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const getDirectionPreview = (content: string, maxLength: number = 300) => {
    if (content.length <= maxLength) return content;
    const truncated = content.substring(0, maxLength);
    const lastNewline = truncated.lastIndexOf('\n');
    if (lastNewline > maxLength * 0.6) {
      return truncated.substring(0, lastNewline) + '\n...';
    }
    return truncated.trim() + '...';
  };

  return (
    <motion.div
      className="absolute w-full"
      style={{
        x,
        y,
        rotateZ,
        ...style,
      }}
      drag={!isProcessing}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      onDragEnd={handleDragEnd}
      animate={{
        x: exitX,
        y: exitY,
        opacity: exitOpacity,
      }}
      transition={{
        x: { type: 'spring', stiffness: 400, damping: 30 },
        y: { type: 'spring', stiffness: 400, damping: 30 },
        opacity: { duration: 0.15 },
      }}
    >
      <div className={`
        relative bg-gradient-to-br from-gray-800 to-gray-900
        border-2 border-purple-500/30 rounded-xl shadow-xl shadow-purple-500/5
        overflow-hidden
        ${isProcessing ? 'cursor-wait' : 'cursor-grab active:cursor-grabbing'}
      `}>
        {/* Swipe indicators */}
        <motion.div
          className="absolute top-4 right-4 z-10"
          style={{ opacity: useTransform(x, [0, 100], [0, 1]) }}
        >
          <div className="px-3 py-1.5 bg-green-500/20 border-2 border-green-500 rounded-lg rotate-12">
            <span className="text-sm font-black text-green-500">ACCEPT</span>
          </div>
        </motion.div>

        <motion.div
          className="absolute top-4 left-4 z-10"
          style={{ opacity: useTransform(x, [-100, 0], [1, 0]) }}
        >
          <div className="px-3 py-1.5 bg-red-500/20 border-2 border-red-500 rounded-lg -rotate-12">
            <span className="text-sm font-black text-red-500">REJECT</span>
          </div>
        </motion.div>

        {onSwipeDown && (
          <motion.div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10"
            style={{ opacity: useTransform(y, [0, 80], [0, 1]) }}
          >
            <div className="px-3 py-1.5 bg-gray-500/20 border-2 border-gray-500 rounded-lg">
              <span className="text-sm font-black text-gray-400">SKIP</span>
            </div>
          </motion.div>
        )}

        {/* Processing overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-gray-900/60 z-20 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Card content */}
        <div className="p-4">
          {/* Header */}
          <div className="flex items-start gap-2 mb-3">
            <div className="p-1.5 bg-purple-500/20 rounded-lg shrink-0">
              <Compass className="w-5 h-5 text-purple-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-white leading-tight line-clamp-2">
                {direction.summary}
              </h3>
              <div className="flex items-center gap-1.5 mt-1">
                <Wifi className="w-3 h-3 text-purple-400" />
                <span className="text-[10px] text-purple-400 uppercase tracking-wide">
                  Remote Direction
                </span>
              </div>
            </div>
          </div>

          {/* Context Area */}
          {direction.context_map_title && (
            <div className="flex items-center gap-1.5 mb-2 px-2 py-1.5 bg-gray-800/60 border border-gray-700/40 rounded-md">
              <MapPin className="w-3 h-3 text-purple-400 shrink-0" />
              <div className="min-w-0">
                <div className="text-[9px] text-gray-500 uppercase">Context</div>
                <div className="text-xs font-medium text-gray-300 truncate">
                  {direction.context_map_title}
                </div>
              </div>
            </div>
          )}

          {/* Direction Content Preview */}
          <div className="mb-3">
            <div className="p-2 bg-gray-800/40 border border-gray-700/30 rounded-md max-h-32 overflow-hidden">
              <CompactMarkdown content={getDirectionPreview(direction.direction)} />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-700/40">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
              <span className="text-xs text-gray-400 truncate max-w-[120px]">
                {direction.project_id}
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Calendar className="w-3 h-3" />
              <span>{formatDate(direction.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-purple-900/10 via-transparent to-transparent pointer-events-none" />
      </div>
    </motion.div>
  );
}
