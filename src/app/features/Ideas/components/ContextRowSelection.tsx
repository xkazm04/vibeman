'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Context, ContextGroup } from '@/lib/queries/contextQueries';

interface ContextRowSelectionProps {
  contexts: Context[];
  contextGroups: ContextGroup[];
  selectedContextId?: string | null;
  onSelectContext: (contextId: string | null) => void;
}

export default function ContextRowSelection({
  contexts,
  contextGroups,
  selectedContextId,
  onSelectContext,
}: ContextRowSelectionProps) {
  // Group contexts by context group
  const groupedContexts = React.useMemo(() => {
    const grouped: Record<string, Context[]> = {
      ungrouped: [],
    };

    contextGroups.forEach(group => {
      grouped[group.id] = [];
    });

    contexts.forEach(context => {
      if (context.groupId) {
        if (grouped[context.groupId]) {
          grouped[context.groupId].push(context);
        }
      } else {
        grouped.ungrouped.push(context);
      }
    });

    return grouped;
  }, [contexts, contextGroups]);

  if (contexts.length === 0) {
    return null;
  }

  return (
    <motion.div
      className="pt-3 border-t border-gray-700/20"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
    >
      <div className="flex items-start gap-3">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide shrink-0 pt-1.5">
          Context:
        </span>

        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Full Project Button */}
          <motion.button
            onClick={() => onSelectContext(null)}
            className={`relative px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              !selectedContextId
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'bg-gray-800/40 text-gray-400 border border-gray-700/40 hover:bg-gray-800/60 hover:text-gray-300'
            }`}
            whileHover={{
              scale: 1.05,
              boxShadow: !selectedContextId
                ? '0 0 12px rgba(34, 211, 238, 0.4), 0 0 20px rgba(34, 211, 238, 0.2)'
                : '0 0 8px rgba(107, 114, 128, 0.3)'
            }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            Full Project
          </motion.button>

          {/* Grouped Contexts with Colored Dividers */}
          {contextGroups.map((group) => {
            const groupContexts = groupedContexts[group.id] || [];
            if (groupContexts.length === 0) return null;

            return (
              <React.Fragment key={group.id}>
                {/* Colored Divider */}
                <div
                  className="w-px h-8"
                  style={{ backgroundColor: group.color || '#6b7280' }}
                />

                {/* Group Contexts */}
                {groupContexts.map((context) => {
                  const isSelected = selectedContextId === context.id;
                  // Extract RGB values from group.color hex
                  const getRGBFromHex = (hex: string) => {
                    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                    return result ? {
                      r: parseInt(result[1], 16),
                      g: parseInt(result[2], 16),
                      b: parseInt(result[3], 16)
                    } : { r: 34, g: 211, b: 238 };
                  };
                  const rgb = getRGBFromHex(group.color || '#22d3ee');

                  return (
                    <motion.button
                      key={context.id}
                      onClick={() => onSelectContext(context.id)}
                      className={`relative px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        isSelected
                          ? 'text-cyan-300 border border-cyan-500/40'
                          : 'bg-gray-800/40 text-gray-400 border border-gray-700/40 hover:bg-gray-800/60 hover:text-gray-300'
                      }`}
                      style={{
                        backgroundColor: isSelected
                          ? `${group.color}20`
                          : undefined,
                      }}
                      whileHover={{
                        scale: 1.05,
                        boxShadow: isSelected
                          ? `0 0 12px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4), 0 0 20px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`
                          : '0 0 8px rgba(107, 114, 128, 0.3)'
                      }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ duration: 0.2 }}
                    >
                      {context.name}
                    </motion.button>
                  );
                })}
              </React.Fragment>
            );
          })}

          {/* Ungrouped Contexts */}
          {groupedContexts.ungrouped && groupedContexts.ungrouped.length > 0 && (
            <>
              {contextGroups.length > 0 && (
                <div className="w-px h-8 bg-gray-600" />
              )}
              {groupedContexts.ungrouped.map((context) => {
                const isSelected = selectedContextId === context.id;
                return (
                  <motion.button
                    key={context.id}
                    onClick={() => onSelectContext(context.id)}
                    className={`relative px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'bg-gray-800/40 text-gray-400 border border-gray-700/40 hover:bg-gray-800/60 hover:text-gray-300'
                    }`}
                    whileHover={{
                      scale: 1.05,
                      boxShadow: isSelected
                        ? '0 0 12px rgba(34, 211, 238, 0.4), 0 0 20px rgba(34, 211, 238, 0.2)'
                        : '0 0 8px rgba(107, 114, 128, 0.3)'
                    }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                  >
                    {context.name}
                  </motion.button>
                );
              })}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
