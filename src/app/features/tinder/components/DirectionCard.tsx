'use client';
import React, { useMemo, useState } from 'react';
import { motion, useTransform } from 'framer-motion';
import { DbDirection } from '@/app/db';
import { Calendar, Compass, MapPin, Check, X, Trash2 } from 'lucide-react';
import { formatCardDate } from '../lib/tinderUtils';
import { useDragSwipe } from '../lib/tinderHooks';

interface DirectionCardProps {
  direction: DbDirection;
  projectName: string;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  style?: React.CSSProperties;
  // Paired directions support
  directionB?: DbDirection;
  problemStatement?: string | null;
  pairId?: string;
  onAcceptVariant?: (variant: 'A' | 'B') => void;
  onRejectBoth?: () => void;
  onDeleteBoth?: () => void;
  disabled?: boolean;
}

/**
 * Compact markdown renderer for direction cards
 * Handles: headings, bold, lists, inline code
 */
function CompactMarkdown({ content, compact = false }: { content: string; compact?: boolean }) {
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
        const headingClass = compact
          ? level <= 2
            ? 'text-xs font-bold text-cyan-300 mt-2 mb-0.5'
            : 'text-xs font-semibold text-gray-300 mt-1 mb-0.5'
          : level <= 2
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
          <ul key={i} className={compact ? 'space-y-0.5 ml-2' : 'space-y-0.5 ml-3'}>
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
  }, [content, compact]);

  return <div className="space-y-1">{rendered}</div>;
}

/**
 * Implementation panel for single or paired directions
 */
function ImplementationPanel({
  direction,
  label,
  isSelected,
  onSelect,
  isPaired,
  color,
}: {
  direction: DbDirection;
  label?: 'A' | 'B';
  isSelected?: boolean;
  onSelect?: () => void;
  isPaired: boolean;
  color: 'cyan' | 'purple';
}) {
  // Truncate content for preview (preserve full lines)
  const getDirectionPreview = (content: string, maxLength: number) => {
    if (content.length <= maxLength) return content;
    const truncated = content.substring(0, maxLength);
    const lastNewline = truncated.lastIndexOf('\n');
    if (lastNewline > maxLength * 0.6) {
      return truncated.substring(0, lastNewline) + '\n...';
    }
    return truncated.trim() + '...';
  };

  const maxLength = isPaired ? 350 : 500;
  const colorClasses = color === 'cyan'
    ? {
        border: isSelected ? 'border-cyan-500' : 'border-gray-700/50 hover:border-cyan-500/50',
        bg: isSelected ? 'bg-cyan-500/10' : 'bg-gray-800/40 hover:bg-gray-800/60',
        badge: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
        ring: isSelected ? 'ring-2 ring-cyan-500/30' : '',
      }
    : {
        border: isSelected ? 'border-purple-500' : 'border-gray-700/50 hover:border-purple-500/50',
        bg: isSelected ? 'bg-purple-500/10' : 'bg-gray-800/40 hover:bg-gray-800/60',
        badge: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
        ring: isSelected ? 'ring-2 ring-purple-500/30' : '',
      };

  const content = (
    <>
      {/* Variant header (for pairs) */}
      {isPaired && label && (
        <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-700/30">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 text-xs font-bold rounded border ${colorClasses.badge}`}>
              Option {label}
            </span>
            <span className="text-xs text-gray-400 line-clamp-1">
              {direction.summary.replace(/^(Variant|Option) [AB]:\s*/i, '')}
            </span>
          </div>
          {isSelected && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                color === 'cyan' ? 'bg-cyan-500' : 'bg-purple-500'
              }`}
            >
              <Check className="w-3 h-3 text-white" />
            </motion.div>
          )}
        </div>
      )}

      {/* Content */}
      <div className={isPaired ? 'max-h-40 overflow-y-auto pr-1' : 'max-h-52 overflow-y-auto'}>
        <CompactMarkdown content={getDirectionPreview(direction.direction, maxLength)} compact={isPaired} />
      </div>
    </>
  );

  if (isPaired && onSelect) {
    return (
      <motion.button
        onClick={onSelect}
        className={`
          flex-1 min-w-0 p-3 rounded-lg border transition-all duration-200 text-left flex flex-col
          ${colorClasses.border} ${colorClasses.bg} ${colorClasses.ring}
          cursor-pointer
        `}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        {content}
      </motion.button>
    );
  }

  return (
    <div className={`p-4 rounded-lg border ${colorClasses.border} ${colorClasses.bg}`}>
      {content}
    </div>
  );
}

export default function DirectionCard({
  direction,
  projectName,
  onSwipeLeft,
  onSwipeRight,
  style,
  // Paired props
  directionB,
  problemStatement,
  pairId,
  onAcceptVariant,
  onRejectBoth,
  onDeleteBoth,
  disabled = false,
}: DirectionCardProps) {
  const isPaired = !!directionB && !!pairId;
  const [selectedVariant, setSelectedVariant] = useState<'A' | 'B' | null>(null);

  // Only use drag for single directions
  const { x, rotateZ, exitX, exitOpacity, handleDragEnd } = useDragSwipe(
    isPaired ? () => {} : onSwipeLeft,
    isPaired ? () => {} : onSwipeRight
  );

  const handleConfirmSelection = () => {
    if (selectedVariant && onAcceptVariant) {
      onAcceptVariant(selectedVariant);
    }
  };

  // For paired directions, use static card (no drag)
  const cardMotionProps = isPaired
    ? {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -20 },
        transition: { duration: 0.3 },
      }
    : {
        style: { x, rotateZ, ...style },
        drag: 'x' as const,
        dragConstraints: { left: 0, right: 0 },
        onDragEnd: handleDragEnd,
        animate: { x: exitX, opacity: exitOpacity },
        transition: {
          x: { type: 'spring', stiffness: 300, damping: 30 },
          opacity: { duration: 0.2 },
        },
      };

  return (
    <motion.div
      className={isPaired ? 'w-full' : 'absolute w-full'}
      {...cardMotionProps}
      style={isPaired ? style : { x, rotateZ, ...style }}
    >
      <div className={`relative bg-gradient-to-br from-gray-800 to-gray-900 border-2 ${
        isPaired ? 'border-amber-500/40' : 'border-cyan-500/40'
      } rounded-2xl shadow-2xl ${
        isPaired ? 'shadow-amber-500/10' : 'shadow-cyan-500/10'
      } overflow-hidden ${!isPaired ? 'cursor-grab active:cursor-grabbing' : ''}`}>

        {/* Swipe indicators (single direction only) */}
        {!isPaired && (
          <>
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
          </>
        )}

        {/* Card content */}
        <div className={isPaired ? 'p-6' : 'p-8'}>
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${isPaired ? 'bg-amber-500/20' : 'bg-cyan-500/20'}`}>
                <Compass className={`w-6 h-6 ${isPaired ? 'text-amber-400' : 'text-cyan-400'}`} />
              </div>
              <div>
                {isPaired ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs font-semibold rounded-full uppercase tracking-wide">
                        Compare Options
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <MapPin className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-400">{direction.context_map_title}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="text-xl font-bold text-white leading-tight line-clamp-2">
                      {direction.summary}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs font-semibold rounded-full uppercase tracking-wide">
                        Direction
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Context Area (single direction only) */}
          {!isPaired && (
            <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-gray-800/60 border border-gray-700/40 rounded-lg">
              <MapPin className="w-4 h-4 text-cyan-400" />
              <div>
                <div className="text-[10px] text-gray-500 uppercase">Context Area</div>
                <div className="text-sm font-semibold text-gray-200">
                  {direction.context_map_title}
                </div>
              </div>
            </div>
          )}

          {/* Problem Statement (paired only) */}
          {isPaired && problemStatement && (
            <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <h4 className="text-xs font-semibold text-amber-300 mb-1 uppercase tracking-wide">Problem to Solve</h4>
              <p className="text-sm text-gray-200">{problemStatement}</p>
            </div>
          )}

          {/* Implementation Details */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Implementation Details
            </h4>

            {isPaired && directionB ? (
              // Split view for paired directions
              <div className="flex gap-3">
                <ImplementationPanel
                  direction={direction}
                  label="A"
                  isSelected={selectedVariant === 'A'}
                  onSelect={() => setSelectedVariant('A')}
                  isPaired={true}
                  color="cyan"
                />
                <ImplementationPanel
                  direction={directionB}
                  label="B"
                  isSelected={selectedVariant === 'B'}
                  onSelect={() => setSelectedVariant('B')}
                  isPaired={true}
                  color="purple"
                />
              </div>
            ) : (
              // Single direction view
              <ImplementationPanel
                direction={direction}
                isPaired={false}
                color="cyan"
              />
            )}
          </div>

          {/* Action Buttons (paired only) */}
          {isPaired && (
            <div className="flex items-center justify-center gap-3 mb-4">
              {/* Skip Both */}
              <motion.button
                onClick={onRejectBoth}
                disabled={disabled}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
                  bg-orange-500/10 border border-orange-500/30 text-orange-400
                  hover:bg-orange-500/20 hover:border-orange-500/50
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
                whileHover={disabled ? {} : { scale: 1.02 }}
                whileTap={disabled ? {} : { scale: 0.98 }}
              >
                <X className="w-4 h-4" />
                <span>Skip Both</span>
              </motion.button>

              {/* Confirm Selection */}
              <motion.button
                onClick={handleConfirmSelection}
                disabled={disabled || !selectedVariant}
                className={`
                  flex items-center gap-2 px-6 py-2 rounded-lg font-medium text-sm
                  ${selectedVariant
                    ? 'bg-green-500/20 border border-green-500/40 text-green-400 hover:bg-green-500/30'
                    : 'bg-gray-700/50 border border-gray-600 text-gray-500 cursor-not-allowed'
                  }
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
                whileHover={disabled || !selectedVariant ? {} : { scale: 1.02 }}
                whileTap={disabled || !selectedVariant ? {} : { scale: 0.98 }}
              >
                <Check className="w-4 h-4" />
                <span>
                  {selectedVariant
                    ? `Implement Option ${selectedVariant}`
                    : 'Select an Option'
                  }
                </span>
              </motion.button>

              {/* Delete Both */}
              <motion.button
                onClick={onDeleteBoth}
                disabled={disabled}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
                  bg-red-500/10 border border-red-500/30 text-red-400
                  hover:bg-red-500/20 hover:border-red-500/50
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
                whileHover={disabled ? {} : { scale: 1.02 }}
                whileTap={disabled ? {} : { scale: 0.98 }}
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </motion.button>
            </div>
          )}

          {/* Footer */}
          <div className={`flex items-center justify-between pt-4 border-t border-gray-700/40 ${isPaired ? '' : ''}`}>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isPaired ? 'bg-amber-500 shadow-sm shadow-amber-500/50' : 'bg-cyan-500 shadow-sm shadow-cyan-500/50'}`}></div>
              <span className="text-sm text-gray-400">{projectName}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Calendar className="w-3 h-3" />
              <span>{formatCardDate(direction.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Gradient overlay for depth */}
        <div className={`absolute inset-0 bg-gradient-to-t ${
          isPaired ? 'from-amber-900/10' : 'from-cyan-900/20'
        } via-transparent to-transparent pointer-events-none`}></div>
      </div>
    </motion.div>
  );
}
