/**
 * ContextCard Component
 * Card for displaying a context in the ModuleExplorer
 * Implements progressive disclosure: shows name + subtle file count badge
 * Details (file categorization) reveal on hover with smooth transitions
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Code2, Database, FileCode } from 'lucide-react';
import type { Context } from '@/stores/contextStore';
import { categorizeFilePaths } from './fileHelpers';

interface ContextCardProps {
  context: Context;
  isSelected: boolean;
  onSelect: () => void;
  onNavigate: () => void;
  onHover?: (contextId: string | null) => void;
}

export default function ContextCard({
  context,
  isSelected,
  onSelect,
  onNavigate,
  onHover,
}: ContextCardProps) {
  const hasDescription = Boolean(context.description);
  const filePaths = context.filePaths || [];
  const fileCount = filePaths.length;
  const { apiFiles, dbFiles } = categorizeFilePaths(filePaths);
  const apiCount = apiFiles.length;
  const dbCount = dbFiles.length;
  const otherCount = fileCount - apiCount - dbCount;

  return (
    <motion.div
      className={`relative p-3 rounded-xl cursor-pointer transition-all border group ${
        isSelected
          ? 'bg-cyan-500/20 border-cyan-500/50 shadow-lg shadow-cyan-500/10'
          : 'bg-gray-800/40 border-gray-700/30 hover:bg-gray-800/60 hover:border-gray-600/50'
      }`}
      onClick={onSelect}
      onMouseEnter={() => onHover?.(context.id)}
      onMouseLeave={() => onHover?.(null)}
      whileTap={{ scale: 0.98 }}
      layout
      data-testid={`context-card-${context.id}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <h4 className="text-sm font-medium text-white truncate">{context.name}</h4>

          {/* File count badge - subtle by default, prominent on hover */}
          {fileCount > 0 && (
            <span
              className="flex-shrink-0 px-1.5 py-0.5 text-[9px] font-medium rounded-full
                bg-gray-600/50 text-gray-400
                opacity-60 group-hover:opacity-100
                scale-95 group-hover:scale-100
                transition-all duration-200"
              data-testid={`context-file-count-${context.id}`}
            >
              {fileCount}
            </span>
          )}
        </div>

        {isSelected && hasDescription && (
          <motion.button
            className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors flex-shrink-0"
            onClick={e => {
              e.stopPropagation();
              onNavigate();
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.1 }}
            title="View documentation"
            data-testid={`context-navigate-btn-${context.id}`}
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </motion.button>
        )}
      </div>

      {/* File categorization badges - progressive disclosure on hover */}
      {fileCount > 0 && (
        <div
          className="flex items-center gap-1.5 mt-2
            opacity-0 group-hover:opacity-100
            scale-95 group-hover:scale-100
            max-h-0 group-hover:max-h-10
            overflow-hidden
            transition-all duration-200"
        >
          {apiCount > 0 && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 text-[8px] font-medium rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Code2 className="w-2.5 h-2.5" />
              {apiCount}
            </span>
          )}
          {dbCount > 0 && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 text-[8px] font-medium rounded-full bg-pink-500/20 text-pink-400 border border-pink-500/30">
              <Database className="w-2.5 h-2.5" />
              {dbCount}
            </span>
          )}
          {otherCount > 0 && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 text-[8px] font-medium rounded-full bg-gray-500/20 text-gray-400 border border-gray-500/30">
              <FileCode className="w-2.5 h-2.5" />
              {otherCount}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}
