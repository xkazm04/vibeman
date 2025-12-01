'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Context, ContextGroup } from '@/lib/queries/contextQueries';

interface ContextItemSelectorProps {
  contexts: Context[];
  contextGroups: ContextGroup[];
  selectedGroupIds: string[];
  selectedContextIds: string[];
  onToggleContext: (contextId: string) => void;
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

export default function ContextItemSelector({
  contexts,
  contextGroups,
  selectedGroupIds,
  selectedContextIds,
  onToggleContext,
}: ContextItemSelectorProps) {
  // Filter and organize contexts by selected groups
  const groupedContexts = React.useMemo(() => {
    const result: { group: ContextGroup; contexts: Context[] }[] = [];

    // Only include groups that are selected
    selectedGroupIds.forEach((groupId) => {
      const group = contextGroups.find((g) => g.id === groupId);
      if (!group) return;

      const groupContexts = contexts
        .filter((ctx) => ctx.groupId === groupId)
        .sort((a, b) => a.name.localeCompare(b.name));

      if (groupContexts.length > 0) {
        result.push({ group, contexts: groupContexts });
      }
    });

    return result;
  }, [contexts, contextGroups, selectedGroupIds]);

  // Show placeholder when no groups are selected
  if (selectedGroupIds.length === 0) {
    return (
      <motion.div
        className="flex items-center justify-center py-3 text-gray-500 text-xs italic"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        data-testid="context-item-placeholder"
      >
        Select context groups above to filter by specific contexts
      </motion.div>
    );
  }

  // Calculate selection counts per group
  const selectionCounts = React.useMemo(() => {
    const counts: Record<string, { selected: number; total: number }> = {};
    groupedContexts.forEach(({ group, contexts: ctxs }) => {
      const selected = ctxs.filter((ctx) => selectedContextIds.includes(ctx.id)).length;
      counts[group.id] = { selected, total: ctxs.length };
    });
    return counts;
  }, [groupedContexts, selectedContextIds]);

  return (
    <motion.div
      className="space-y-3"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
    >
      <AnimatePresence mode="popLayout">
        {groupedContexts.map(({ group, contexts: groupContexts }, groupIndex) => {
          const rgb = getRGBFromHex(group.color || '#6b7280');
          const counts = selectionCounts[group.id];

          return (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: groupIndex * 0.05 }}
            >
              {/* Group Section Header */}
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-3 h-0.5 rounded-full"
                  style={{ backgroundColor: group.color }}
                />
                <span
                  className="text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: group.color }}
                  data-testid={`context-item-group-header-${group.id}`}
                >
                  {group.name}
                </span>
                <span className="text-[10px] text-gray-500">
                  {counts.selected > 0 ? `${counts.selected}/${counts.total}` : counts.total}
                </span>
                <div
                  className="flex-1 h-px"
                  style={{ backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)` }}
                />
              </div>

              {/* Context Buttons */}
              <div className="flex flex-wrap gap-2">
                <AnimatePresence mode="popLayout">
                  {groupContexts.map((context, idx) => {
                    const isSelected = selectedContextIds.includes(context.id);

                    return (
                      <motion.button
                        key={context.id}
                        data-testid={`context-item-select-${context.id}`}
                        onClick={() => onToggleContext(context.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          isSelected
                            ? 'text-white border'
                            : 'bg-gray-800/40 text-gray-400 border border-gray-700/40 hover:bg-gray-800/60 hover:text-gray-300'
                        }`}
                        style={{
                          backgroundColor: isSelected
                            ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`
                            : undefined,
                          borderColor: isSelected ? group.color : undefined,
                        }}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ delay: idx * 0.02 }}
                        whileHover={{
                          scale: 1.05,
                          boxShadow: isSelected
                            ? `0 0 10px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`
                            : '0 0 6px rgba(107, 114, 128, 0.2)',
                        }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {context.name}
                      </motion.button>
                    );
                  })}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </motion.div>
  );
}
