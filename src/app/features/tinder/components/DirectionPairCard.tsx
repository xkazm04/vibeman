'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { DbDirection } from '@/app/db';
import { Calendar, Compass, MapPin, ArrowLeftRight, Check, X, Trash2 } from 'lucide-react';
import { formatCardDate } from '../lib/tinderUtils';

interface DirectionPairCardProps {
  directionA: DbDirection;
  directionB: DbDirection;
  problemStatement: string | null;
  projectName: string;
  onAcceptA: () => void;
  onAcceptB: () => void;
  onRejectBoth: () => void;
  onDeleteBoth: () => void;
  style?: React.CSSProperties;
  disabled?: boolean;
}

/**
 * Compact markdown renderer for direction cards
 */
function CompactMarkdown({ content, maxLength = 300 }: { content: string; maxLength?: number }) {
  const rendered = useMemo(() => {
    // Truncate content for preview
    const truncated = content.length > maxLength
      ? content.substring(0, maxLength).trim() + '...'
      : content;

    const lines = truncated.split('\n');
    const elements: React.ReactNode[] = [];

    const renderInline = (text: string): React.ReactNode => {
      // Bold **text**
      let processed = text.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-white">$1</strong>');
      // Inline code
      processed = processed.replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 bg-gray-700/50 text-cyan-300 rounded text-xs font-mono">$1</code>');
      return <span dangerouslySetInnerHTML={{ __html: processed }} />;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      if (line.startsWith('#')) {
        const level = line.match(/^#+/)?.[0].length || 1;
        const text = line.replace(/^#+\s*/, '');
        const headingClass = level <= 2
          ? 'text-xs font-bold text-cyan-300 mt-2 mb-0.5'
          : 'text-xs font-semibold text-gray-300 mt-1 mb-0.5';

        elements.push(
          <div key={i} className={headingClass}>
            {renderInline(text)}
          </div>
        );
      } else if (line.match(/^[-*+]\s/)) {
        elements.push(
          <div key={i} className="text-xs text-gray-300 flex items-start gap-1 ml-2">
            <span className="text-cyan-400">•</span>
            <span>{renderInline(line.replace(/^[-*+]\s/, ''))}</span>
          </div>
        );
      } else {
        elements.push(
          <p key={i} className="text-xs text-gray-300 leading-relaxed">
            {renderInline(line)}
          </p>
        );
      }
    }

    return elements;
  }, [content, maxLength]);

  return <div className="space-y-0.5">{rendered}</div>;
}

/**
 * Single variant card within the pair
 */
function VariantCard({
  direction,
  label,
  isSelected,
  onSelect,
  color,
}: {
  direction: DbDirection;
  label: 'A' | 'B';
  isSelected: boolean;
  onSelect: () => void;
  color: 'cyan' | 'purple';
}) {
  const colorClasses = color === 'cyan'
    ? {
        border: isSelected ? 'border-cyan-500 border-2' : 'border-gray-600 hover:border-cyan-500/50',
        bg: isSelected ? 'bg-cyan-500/10' : 'bg-gray-800/60 hover:bg-gray-800/80',
        badge: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
        glow: isSelected ? 'shadow-lg shadow-cyan-500/20' : '',
        ring: isSelected ? 'ring-2 ring-cyan-500/30' : '',
      }
    : {
        border: isSelected ? 'border-purple-500 border-2' : 'border-gray-600 hover:border-purple-500/50',
        bg: isSelected ? 'bg-purple-500/10' : 'bg-gray-800/60 hover:bg-gray-800/80',
        badge: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
        glow: isSelected ? 'shadow-lg shadow-purple-500/20' : '',
        ring: isSelected ? 'ring-2 ring-purple-500/30' : '',
      };

  return (
    <motion.button
      onClick={onSelect}
      className={`
        flex-1 min-w-0 p-5 rounded-xl border transition-all duration-200
        ${colorClasses.border} ${colorClasses.bg} ${colorClasses.glow} ${colorClasses.ring}
        cursor-pointer text-left flex flex-col
      `}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      {/* Variant Label */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <span className={`px-3 py-1.5 text-sm font-bold rounded-lg border ${colorClasses.badge}`}>
          Option {label}
        </span>
        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`w-7 h-7 rounded-full flex items-center justify-center ${
              color === 'cyan' ? 'bg-cyan-500' : 'bg-purple-500'
            }`}
          >
            <Check className="w-5 h-5 text-white" />
          </motion.div>
        )}
      </div>

      {/* Summary */}
      <h4 className="text-base font-semibold text-white mb-3 line-clamp-2 flex-shrink-0">
        {direction.summary.replace(/^Variant [AB]:\s*/i, '').replace(/^Option [AB]:\s*/i, '')}
      </h4>

      {/* Direction Preview - scrollable area takes remaining space */}
      <div className="flex-1 overflow-y-auto min-h-0 pr-1">
        <CompactMarkdown content={direction.direction} maxLength={400} />
      </div>
    </motion.button>
  );
}

export default function DirectionPairCard({
  directionA,
  directionB,
  problemStatement,
  projectName,
  onAcceptA,
  onAcceptB,
  onRejectBoth,
  onDeleteBoth,
  style,
  disabled = false,
}: DirectionPairCardProps) {
  const [selectedVariant, setSelectedVariant] = useState<'A' | 'B' | null>(null);

  const handleConfirmSelection = () => {
    if (selectedVariant === 'A') {
      onAcceptA();
    } else if (selectedVariant === 'B') {
      onAcceptB();
    }
  };

  return (
    <motion.div
      className="w-full"
      style={style}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-amber-500/40 rounded-2xl shadow-2xl shadow-amber-500/10 overflow-hidden">
        {/* Card content */}
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-xl">
                <ArrowLeftRight className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs font-semibold rounded-full uppercase tracking-wide">
                    Compare Directions
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <MapPin className="w-3 h-3 text-gray-400" />
                  <span className="text-xs text-gray-400">{directionA.context_map_title}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Problem Statement */}
          {problemStatement && (
            <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <h3 className="text-sm font-semibold text-amber-300 mb-1">Problem to Solve</h3>
              <p className="text-sm text-gray-200">{problemStatement}</p>
            </div>
          )}

          {/* Variant Cards - side by side comparison */}
          <div className="flex gap-4 mb-5 h-[320px]">
            <VariantCard
              direction={directionA}
              label="A"
              isSelected={selectedVariant === 'A'}
              onSelect={() => setSelectedVariant('A')}
              color="cyan"
            />
            <VariantCard
              direction={directionB}
              label="B"
              isSelected={selectedVariant === 'B'}
              onSelect={() => setSelectedVariant('B')}
              color="purple"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-3">
            {/* Reject Both */}
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
                  ? `Implement Variant ${selectedVariant}`
                  : 'Select a Variant'
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

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-700/40">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-sm text-gray-400">{projectName}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Calendar className="w-3 h-3" />
              <span>{formatCardDate(directionA.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-amber-900/10 via-transparent to-transparent pointer-events-none" />
      </div>
    </motion.div>
  );
}
