'use client';
import React, { useState, useMemo } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { DbDirection } from '@/app/db';
import { Calendar, Compass, MapPin } from 'lucide-react';

interface DirectionCardProps {
  direction: DbDirection;
  projectName: string;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  style?: React.CSSProperties;
}

/**
 * Compact markdown renderer for direction cards
 * Handles: headings, bold, lists, inline code
 */
function CompactMarkdown({ content }: { content: string }) {
  const rendered = useMemo(() => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let i = 0;

    const renderInline = (text: string): React.ReactNode => {
      // Process inline formatting
      let processed = text;
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
      processed = processed.replace(
        /`([^`]+)`/g,
        '<code class="px-1 py-0.5 bg-gray-700/50 text-cyan-300 rounded text-xs font-mono">$1</code>'
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
          ? 'text-sm font-bold text-cyan-300 mt-3 mb-1'
          : 'text-xs font-semibold text-gray-300 mt-2 mb-1';

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
          const item = lines[i].trim().replace(/^[-*+]\s/, '').replace(/^\d+\.\s/, '');
          listItems.push(item);
          i++;
        }
        i--; // Back up

        elements.push(
          <ul key={i} className="space-y-0.5 ml-3">
            {listItems.map((item, idx) => (
              <li key={idx} className="text-xs text-gray-300 flex items-start gap-1.5">
                <span className="text-cyan-400 mt-1">•</span>
                <span>{renderInline(item)}</span>
              </li>
            ))}
          </ul>
        );
      }
      // Regular paragraphs
      else {
        elements.push(
          <p key={i} className="text-xs text-gray-300 leading-relaxed">
            {renderInline(line)}
          </p>
        );
      }

      i++;
    }

    return elements;
  }, [content]);

  return <div className="space-y-1">{rendered}</div>;
}

export default function DirectionCard({
  direction,
  projectName,
  onSwipeLeft,
  onSwipeRight,
  style,
}: DirectionCardProps) {
  const x = useMotionValue(0);
  const rotateZ = useTransform(x, [-200, 200], [-15, 15]);

  const [exitX, setExitX] = useState(0);
  const [exitOpacity, setExitOpacity] = useState(1);

  const handleDragEnd = (_: any, info: PanInfo) => {
    const threshold = 150;

    if (Math.abs(info.offset.x) > threshold) {
      // Swiped
      setExitX(info.offset.x > 0 ? 1000 : -1000);
      setExitOpacity(0);

      setTimeout(() => {
        if (info.offset.x > 0) {
          onSwipeRight(); // Accept/Implement
        } else {
          onSwipeLeft(); // Reject/Skip
        }
      }, 200);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  // Truncate direction content for preview (but preserve full lines)
  const getDirectionPreview = (content: string, maxLength: number = 500) => {
    if (content.length <= maxLength) return content;
    // Find a good break point (end of line near maxLength)
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
        rotateZ,
        ...style,
      }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      animate={{
        x: exitX,
        opacity: exitOpacity,
      }}
      transition={{
        x: { type: 'spring', stiffness: 300, damping: 30 },
        opacity: { duration: 0.2 },
      }}
    >
      <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-cyan-500/40 rounded-2xl shadow-2xl shadow-cyan-500/10 overflow-hidden cursor-grab active:cursor-grabbing">
        {/* Swipe indicators */}
        <motion.div
          className="absolute top-8 right-8 z-10"
          style={{
            opacity: useTransform(x, [0, 150], [0, 1]),
          }}
        >
          <div className="px-6 py-3 bg-cyan-500/20 border-4 border-cyan-500 rounded-xl rotate-12">
            <span className="text-2xl font-black text-cyan-500">IMPLEMENT</span>
          </div>
        </motion.div>

        <motion.div
          className="absolute top-8 left-8 z-10"
          style={{
            opacity: useTransform(x, [-150, 0], [1, 0]),
          }}
        >
          <div className="px-6 py-3 bg-orange-500/20 border-4 border-orange-500 rounded-xl -rotate-12">
            <span className="text-2xl font-black text-orange-500">SKIP</span>
          </div>
        </motion.div>

        {/* Card content */}
        <div className="p-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-500/20 rounded-xl">
                <Compass className="w-8 h-8 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white leading-tight line-clamp-2">
                  {direction.summary}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs font-semibold rounded-full uppercase tracking-wide">
                    Direction
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Context Area */}
          <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-gray-800/60 border border-gray-700/40 rounded-lg">
            <MapPin className="w-4 h-4 text-cyan-400" />
            <div>
              <div className="text-[10px] text-gray-500 uppercase">Context Area</div>
              <div className="text-sm font-semibold text-gray-200">
                {direction.context_map_title}
              </div>
            </div>
          </div>

          {/* Direction Content Preview */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Implementation Details
            </h4>
            <div className="p-4 bg-gray-800/40 border border-gray-700/30 rounded-lg max-h-52 overflow-y-auto">
              <CompactMarkdown content={getDirectionPreview(direction.direction)} />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-700/40">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
              <span className="text-sm text-gray-400">{projectName}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Calendar className="w-3 h-3" />
              <span>{formatDate(direction.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Gradient overlay for depth - cyan tint */}
        <div className="absolute inset-0 bg-gradient-to-t from-cyan-900/20 via-transparent to-transparent pointer-events-none"></div>
      </div>
    </motion.div>
  );
}
