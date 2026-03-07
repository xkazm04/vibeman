'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FolderOpen } from 'lucide-react';
import IdeasLoadingState from '@/app/features/Ideas/components/IdeasLoadingState';
import type { ContextCountItem } from '../lib/tinderTypes';

interface ContextFilterSidebarProps {
  contextCounts: ContextCountItem[];
  selectedContextId: string | null;
  onContextChange: (contextId: string | null) => void;
  loading?: boolean;
  disabled?: boolean;
}

export default function ContextFilterSidebar({
  contextCounts,
  selectedContextId,
  onContextChange,
  loading = false,
  disabled = false,
}: ContextFilterSidebarProps) {
  const totalCount = contextCounts.reduce((sum, ctx) => sum + ctx.count, 0);

  // Separate assigned and unassigned contexts
  const unassigned = contextCounts.find(ctx => ctx.context_id === null);
  const assigned = contextCounts.filter(ctx => ctx.context_id !== null);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      className="w-56 bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 space-y-3"
    >
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-gray-700/40">
        <FolderOpen className="w-4 h-4 text-amber-400" />
        <span className="text-sm font-semibold text-gray-200">Context</span>
      </div>

      {loading ? (
        <IdeasLoadingState size="sm" />
      ) : (
        <>
          {/* All Contexts Button */}
          <motion.button
            onClick={() => onContextChange(null)}
            disabled={disabled}
            className={`
              w-full flex items-center justify-between px-3 py-2 rounded-lg
              text-sm font-medium transition-all duration-200 border
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              ${selectedContextId === null
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-md shadow-amber-500/20'
                : 'text-gray-400 border-transparent hover:text-gray-200 hover:bg-gray-700/30 hover:border-gray-600/40'
              }
            `}
            whileHover={disabled ? {} : { scale: 1.02 }}
            whileTap={disabled ? {} : { scale: 0.98 }}
          >
            <span className="flex items-center gap-2">
              <span>🌟</span>
              <span>All Contexts</span>
            </span>
            <span className={`
              px-2 py-0.5 text-xs font-semibold rounded-full
              ${selectedContextId === null ? 'bg-amber-500/30 text-amber-200' : 'bg-gray-700 text-gray-400'}
            `}>
              {totalCount}
            </span>
          </motion.button>

          <div className="h-px bg-gray-700/40" />

          {/* Context list — scrollable when there are many */}
          <div className="space-y-1.5 max-h-[400px] overflow-y-auto scrollbar-hide">
            {/* Assigned contexts */}
            {assigned.map(({ context_id, context_name, count }) => {
              const isActive = selectedContextId === context_id;

              return (
                <motion.button
                  key={context_id}
                  onClick={() => onContextChange(context_id)}
                  disabled={disabled || count === 0}
                  className={`
                    w-full flex items-center justify-between px-3 py-2 rounded-lg
                    text-sm font-medium transition-all duration-200 border
                    ${disabled || count === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    ${isActive
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-md shadow-amber-500/20'
                      : 'text-gray-400 border-transparent hover:bg-amber-500/10 hover:border-amber-500/20'
                    }
                  `}
                  whileHover={disabled || count === 0 ? {} : { scale: 1.02 }}
                  whileTap={disabled || count === 0 ? {} : { scale: 0.98 }}
                >
                  <span className="flex items-center gap-2 truncate">
                    <span className="text-xs">📁</span>
                    <span className="truncate">{context_name}</span>
                  </span>
                  <span className={`
                    px-2 py-0.5 text-xs font-semibold rounded-full flex-shrink-0
                    ${isActive ? 'bg-amber-500/30' : 'bg-gray-700'} text-gray-300
                  `}>
                    {count}
                  </span>
                </motion.button>
              );
            })}

            {/* Unassigned group */}
            {unassigned && unassigned.count > 0 && (
              <>
                {assigned.length > 0 && <div className="h-px bg-gray-700/30 my-1" />}
                <motion.button
                  onClick={() => onContextChange('unassigned')}
                  disabled={disabled}
                  className={`
                    w-full flex items-center justify-between px-3 py-2 rounded-lg
                    text-sm font-medium transition-all duration-200 border
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    ${selectedContextId === 'unassigned'
                      ? 'bg-gray-500/20 text-gray-300 border-gray-500/40 shadow-md shadow-gray-500/20'
                      : 'text-gray-500 border-transparent hover:bg-gray-500/10 hover:border-gray-500/20'
                    }
                  `}
                  whileHover={disabled ? {} : { scale: 1.02 }}
                  whileTap={disabled ? {} : { scale: 0.98 }}
                >
                  <span className="flex items-center gap-2 truncate">
                    <span className="text-xs">📭</span>
                    <span className="truncate italic">Unassigned</span>
                  </span>
                  <span className={`
                    px-2 py-0.5 text-xs font-semibold rounded-full flex-shrink-0
                    ${selectedContextId === 'unassigned' ? 'bg-gray-500/30' : 'bg-gray-700'} text-gray-400
                  `}>
                    {unassigned.count}
                  </span>
                </motion.button>
              </>
            )}
          </div>

          {/* Empty State */}
          {contextCounts.length === 0 && (
            <div className="text-center py-4 text-sm text-gray-500">
              No contexts found
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
