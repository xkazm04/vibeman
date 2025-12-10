'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ContextGroup, Context } from '@/lib/queries/contextQueries';

interface ContextGroupSelectorProps {
  contextGroups: ContextGroup[];
  contexts: Context[];
  selectedGroupIds: string[];
  onToggleGroup: (groupId: string) => void;
  onClearAll: () => void;
}

/**
 * Helper to extract RGB values from hex color
 */
function getRGBFromHex(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 107, g: 114, b: 128 };
}

export default function ContextGroupSelector({
  contextGroups,
  contexts,
  selectedGroupIds,
  onToggleGroup,
  onClearAll,
}: ContextGroupSelectorProps) {
  // Count contexts per group
  const contextCountByGroup = React.useMemo(() => {
    const counts: Record<string, number> = {};
    contextGroups.forEach((group) => {
      counts[group.id] = contexts.filter((ctx) => ctx.groupId === group.id).length;
    });
    return counts;
  }, [contextGroups, contexts]);

  const hasGroupsSelected = selectedGroupIds.length > 0;

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
      {/* Clear All Button - only visible when groups are selected */}
      <AnimatePresence>
        {hasGroupsSelected && (
          <motion.button
            data-testid="context-group-clear-all-btn"
            onClick={onClearAll}
            className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-800/60 text-gray-400 border border-gray-600/50 hover:bg-gray-700/60 hover:text-gray-300 transition-all"
            initial={{ opacity: 0, scale: 0.8, width: 0 }}
            animate={{ opacity: 1, scale: 1, width: 'auto' }}
            exit={{ opacity: 0, scale: 0.8, width: 0 }}
            whileTap={{ scale: 0.95 }}
          >
            Clear
          </motion.button>
        )}
      </AnimatePresence>

      {/* Group Buttons */}
      {contextGroups.map((group) => {
        const isSelected = selectedGroupIds.includes(group.id);
        const contextCount = contextCountByGroup[group.id] || 0;
        const rgb = getRGBFromHex(group.color || '#6b7280');

        // Skip groups with no contexts
        if (contextCount === 0) return null;

        return (
          <motion.button
            key={group.id}
            data-testid={`context-group-select-${group.id}`}
            onClick={() => onToggleGroup(group.id)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
              isSelected
                ? 'text-white border-2'
                : 'bg-gray-800/40 text-gray-400 border border-gray-700/40 hover:bg-gray-800/60 hover:text-gray-300'
            }`}
            style={{
              backgroundColor: isSelected ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.25)` : undefined,
              borderColor: isSelected ? group.color : undefined,
            }}
            whileHover={{
              boxShadow: isSelected
                ? `0 0 12px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`
                : '0 0 8px rgba(107, 114, 128, 0.3)',
            }}
            whileTap={{ scale: 0.95 }}
          >
            {/* Group name */}
            <span>{group.name}</span>

            {/* Context count badge */}
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                isSelected ? 'bg-white/20 text-white' : 'bg-gray-700/60 text-gray-500'
              }`}
            >
              {contextCount}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
