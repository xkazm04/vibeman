'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, LucideIcon } from 'lucide-react';

export interface CompactListItem {
  id: string;
  title: string;
  emoji?: string;
  status?: 'pending' | 'accepted' | 'rejected' | 'implemented';
  badges?: Array<{
    icon?: LucideIcon;
    label: string;
    color: string;
  }>;
}

export interface CompactListProps {
  /** Title of the list column */
  title: string;
  /** Extra content rendered next to the title */
  titleExtra?: React.ReactNode;
  /** Array of items to display */
  items: CompactListItem[];
  /** Click handler for items */
  onItemClick?: (item: CompactListItem) => void;
  /** Delete handler for individual items */
  onItemDelete?: (itemId: string) => void;
  /** Delete all handler */
  onDeleteAll?: () => void;
  /** Custom empty state message */
  emptyMessage?: string;
  /** Max height for scrollable area */
  maxHeight?: string;
}

// Status-based styling
const getStatusClasses = (status?: string) => {
  const baseClasses = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-gray-900';
  switch (status) {
    case 'accepted':
      return `${baseClasses} border-green-500/40 bg-green-900/10 hover:bg-green-800/30 hover:border-green-400/60`;
    case 'rejected':
      return `${baseClasses} border-red-500/40 bg-red-900/10 hover:bg-red-800/30 hover:border-red-400/60`;
    case 'implemented':
      return `${baseClasses} border-amber-500/40 bg-amber-900/10 hover:bg-amber-800/30 hover:border-amber-400/60`;
    default:
      return `${baseClasses} border-gray-600/40 bg-gray-800/20 hover:bg-gray-700/40 hover:border-gray-500/60`;
  }
};

/**
 * CompactList - A compact, scrollable list column
 *
 * Features:
 * - Status-based color coding
 * - Emoji and badge support
 * - Delete all functionality
 * - Animated hover states
 * - Scrollable with max height
 */
export default function CompactList({
  title,
  titleExtra,
  items,
  onItemClick,
  onItemDelete,
  onDeleteAll,
  emptyMessage = 'No items',
  maxHeight = 'max-h-[400px]',
}: CompactListProps) {
  return (
    <motion.div
      className="flex flex-col bg-gray-900/40 border border-gray-700/40 rounded-lg overflow-hidden transition-all duration-200 hover:border-gray-600/60 hover:bg-gray-900/50 hover:shadow-lg hover:shadow-black/20"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, transition: { duration: 0.2, ease: 'easeOut' } }}
      layout
    >
      {/* Header */}
      <div className="px-3 py-2 bg-gray-800/60 border-b border-gray-700/40">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <h3 className="text-sm font-semibold text-gray-300 truncate" title={title}>
              {title}
            </h3>
            {titleExtra}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500 font-mono">
              {items.length}
            </span>
            {items.length > 0 && onDeleteAll && (
              <motion.button
                onClick={onDeleteAll}
                className="p-1 hover:bg-red-500/20 rounded transition-all duration-200 cursor-pointer"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                title={`Delete all items in ${title}`}
              >
                <Trash2 className="w-3 h-3 text-red-400" />
              </motion.button>
            )}
          </div>
        </div>
      </div>

      {/* Items List */}
      <div
        className={`flex-1 px-2 py-2 space-y-1 min-h-[100px] ${maxHeight} overflow-y-auto custom-scrollbar`}
        style={{
          maskImage: 'linear-gradient(to bottom, black calc(100% - 24px), transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black calc(100% - 24px), transparent 100%)',
        }}
      >
        {items.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-[10px] text-gray-600">
            {emptyMessage}
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {items.map((item) => (
              <motion.div
                key={item.id}
                tabIndex={0}
                role="button"
                className={`flex items-center gap-2 px-2 py-1.5 rounded-md border cursor-pointer transition-all duration-200 ease-out ${getStatusClasses(item.status)}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20, scale: 0.9 }}
                whileHover={{ x: 3, transition: { duration: 0.15, ease: 'easeOut' } }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onItemClick?.(item)}
              >
                {/* Badges */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {item.emoji && <span className="text-sm">{item.emoji}</span>}
                  {item.badges?.map((badge, idx) => (
                    <div key={idx} className="flex items-center gap-0.5" title={badge.label}>
                      {badge.icon && <badge.icon className={`w-3 h-3 ${badge.color}`} />}
                    </div>
                  ))}
                </div>

                {/* Title */}
                <span className="flex-1 min-w-0 text-xs text-gray-200 truncate font-medium">
                  {item.title}
                </span>

                {/* Delete button (on hover) */}
                {onItemDelete && (
                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation();
                      onItemDelete(item.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-500/20 rounded transition-all"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Trash2 className="w-3 h-3 text-red-400" />
                  </motion.button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}
