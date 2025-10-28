'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Folder } from 'lucide-react';
import { Context, ContextGroup } from '@/lib/queries/contextQueries';

interface ContextSelectorProps {
  contexts: Context[];
  contextGroups?: ContextGroup[];
  selectedContext: Context | undefined;
  onSelectContext: (contextId: string | null) => void;
  disabled?: boolean;
}

export default function ContextSelector({
  contexts,
  contextGroups = [],
  selectedContext,
  onSelectContext,
  disabled = false
}: ContextSelectorProps) {
  if (contexts.length === 0) {
    return null;
  }

  // Group contexts by context group
  const groupedContexts = React.useMemo(() => {
    const grouped: Record<string, Context[]> = {
      ungrouped: [],
    };

    contextGroups.forEach(group => {
      grouped[group.id] = [];
    });

    contexts.forEach(context => {
      if (context.groupId && grouped[context.groupId]) {
        grouped[context.groupId].push(context);
      } else {
        grouped.ungrouped.push(context);
      }
    });

    return grouped;
  }, [contexts, contextGroups]);

  return (
    <div className="w-full">
      <div className="flex items-center space-x-2 mb-2">
        <Folder className="w-3.5 h-3.5 text-cyan-400" />
        <span className="text-sm font-semibold text-cyan-300">Context Filter</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {/* Full Project Button */}
        <motion.button
          onClick={() => onSelectContext(null)}
          disabled={disabled}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all shrink-0 ${
            !selectedContext
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'bg-gray-800/40 text-gray-400 border border-gray-700/40 hover:bg-gray-800/60 hover:text-gray-300'
          }`}
          whileHover={{ scale: disabled ? 1 : 1.02 }}
          whileTap={{ scale: disabled ? 1 : 0.98 }}
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
                className="w-px h-8 self-center"
                style={{ backgroundColor: group.color || '#6b7280' }}
              />

              {/* Group Contexts */}
              {groupContexts.map((context) => (
                <motion.button
                  key={context.id}
                  onClick={() => onSelectContext(context.id)}
                  disabled={disabled}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all shrink-0 ${
                    selectedContext?.id === context.id
                      ? 'text-cyan-300 border border-cyan-500/40'
                      : 'bg-gray-800/40 text-gray-400 border border-gray-700/40 hover:bg-gray-800/60 hover:text-gray-300'
                  }`}
                  style={{
                    backgroundColor: selectedContext?.id === context.id
                      ? `${group.color}20`
                      : undefined,
                  }}
                  whileHover={{ scale: disabled ? 1 : 1.02 }}
                  whileTap={{ scale: disabled ? 1 : 0.98 }}
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
              <div className="w-px h-8 self-center bg-gray-600" />
            )}
            {groupedContexts.ungrouped.map((context) => (
              <motion.button
                key={context.id}
                onClick={() => onSelectContext(context.id)}
                disabled={disabled}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all shrink-0 ${
                  selectedContext?.id === context.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-gray-800/40 text-gray-400 border border-gray-700/40 hover:bg-gray-800/60 hover:text-gray-300'
                }`}
                whileHover={{ scale: disabled ? 1 : 1.02 }}
                whileTap={{ scale: disabled ? 1 : 0.98 }}
              >
                {context.name}
              </motion.button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
