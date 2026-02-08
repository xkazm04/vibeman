'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ContextGroup, Context } from '@/lib/queries/contextQueries';
import { Check } from 'lucide-react';
import { getRGBFromHex } from '@/lib/design-tokens/colors';

interface ContextGroupSelectorProps {
  contextGroups: ContextGroup[];
  contexts: Context[];
  selectedGroupIds: string[];
  /** Groups selected as whole units for requirement generation (via Shift+Click) */
  selectedGroupIdsForGeneration?: string[];
  /** Toggle callback with optional shift key indicator */
  onToggleGroup: (groupId: string, isShiftClick?: boolean) => void;
  onClearAll: () => void;
}

export default function ContextGroupSelector({
  contextGroups,
  contexts,
  selectedGroupIds,
  selectedGroupIdsForGeneration = [],
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

        const isSelectedForGeneration = selectedGroupIdsForGeneration.includes(group.id);

        return (
          <motion.button
            key={group.id}
            data-testid={`context-group-select-${group.id}`}
            onClick={(e) => onToggleGroup(group.id, e.shiftKey)}
            title="Click to expand/collapse. Shift+Click to select entire group for generation."
            className={`relative shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
              isSelected || isSelectedForGeneration
                ? 'text-white border-2'
                : 'bg-gray-800/40 text-gray-400 border border-gray-700/40 hover:bg-gray-800/60 hover:text-gray-300'
            }`}
            style={{
              backgroundColor: (isSelected || isSelectedForGeneration) ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.25)` : undefined,
              borderColor: isSelectedForGeneration ? '#22c55e' : (isSelected ? group.color : undefined),
            }}
            whileHover={{
              boxShadow: (isSelected || isSelectedForGeneration)
                ? `0 0 12px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`
                : '0 0 8px rgba(107, 114, 128, 0.3)',
            }}
            whileTap={{ scale: 0.95 }}
          >
            {/* Checkmark indicator for group-level selection */}
            <AnimatePresence>
              {isSelectedForGeneration && (
                <motion.div
                  className="absolute -top-1.5 -right-1.5 bg-green-500 rounded-full p-0.5 shadow-lg"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Check className="w-3 h-3 text-white" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Group name */}
            <span>{group.name}</span>

            {/* Context count badge */}
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                isSelected || isSelectedForGeneration ? 'bg-white/20 text-white' : 'bg-gray-700/60 text-gray-500'
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
