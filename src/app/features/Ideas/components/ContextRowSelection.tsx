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
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              !selectedContextId
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'bg-gray-800/40 text-gray-400 border border-gray-700/40 hover:bg-gray-800/60 hover:text-gray-300'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
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
                {groupContexts.map((context) => (
                  <motion.button
                    key={context.id}
                    onClick={() => onSelectContext(context.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      selectedContextId === context.id
                        ? 'text-cyan-300 border border-cyan-500/40'
                        : 'bg-gray-800/40 text-gray-400 border border-gray-700/40 hover:bg-gray-800/60 hover:text-gray-300'
                    }`}
                    style={{
                      backgroundColor: selectedContextId === context.id
                        ? `${group.color}20`
                        : undefined,
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {context.name}
                  </motion.button>
                ))}
              </React.Fragment>
            );
          })}

          {/* Ungrouped Contexts */}
          {groupedContexts.ungrouped && groupedContexts.ungrouped.length > 0 && (
            <>
              {contextGroups.length > 0 && (
                <div className="w-px h-8 bg-gray-600" />
              )}
              {groupedContexts.ungrouped.map((context) => (
                <motion.button
                  key={context.id}
                  onClick={() => onSelectContext(context.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedContextId === context.id
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'bg-gray-800/40 text-gray-400 border border-gray-700/40 hover:bg-gray-800/60 hover:text-gray-300'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {context.name}
                </motion.button>
              ))}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
