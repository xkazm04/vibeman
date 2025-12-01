'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, X, Loader2 } from 'lucide-react';
import { TestSelector } from '../../lib/types';
import { getFileName } from '../../lib/helpers';

interface SelectorItemProps {
  selector: TestSelector;
  index: number;
  activeStepId?: string | null;
  copiedId: string | null;
  deletingId: string | null;
  onSelectorClick?: (testId: string) => void;
  onCopy: (testId: string, selectorId: string) => void;
  onDelete: (selectorId: string, e: React.MouseEvent) => void;
}

export default function SelectorItem({
  selector,
  index,
  activeStepId,
  copiedId,
  deletingId,
  onSelectorClick,
  onCopy,
  onDelete,
}: SelectorItemProps) {
  const isDeleting = deletingId === selector.id;
  const isCopied = copiedId === selector.id;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.5) }}
      className={`flex items-start gap-1 px-2 py-1.5 bg-gray-900/50 border rounded text-xs font-mono transition-all ${
        activeStepId ? 'border-cyan-500/30' : 'border-gray-600/30'
      } ${isDeleting ? 'opacity-50' : ''}`}
      data-testid={`selector-${index}`}
    >
      {/* Main clickable area */}
      <button
        onClick={() => onSelectorClick?.(selector.dataTestid)}
        disabled={!activeStepId || isDeleting}
        className={`flex-1 text-left ${
          activeStepId && !isDeleting
            ? 'hover:text-cyan-400 cursor-pointer'
            : 'cursor-not-allowed opacity-50'
        }`}
        data-testid={`selector-${index}-btn`}
      >
        <div>
          <span className="text-gray-300">
            {getFileName(selector.filepath)}:
          </span>{' '}
          <span className="text-gray-400">{selector.title || 'Untitled'}</span>
        </div>
        <div className="text-[10px] text-gray-600 mt-0.5">
          {selector.dataTestid || 'No test ID'}
        </div>
      </button>

      {/* Action buttons */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Copy button */}
        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            onCopy(selector.dataTestid, selector.id);
          }}
          disabled={isDeleting}
          className="p-1 text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded transition-colors disabled:opacity-50"
          whileHover={{ scale: !isDeleting ? 1.1 : 1 }}
          whileTap={{ scale: !isDeleting ? 0.9 : 1 }}
          title="Copy to clipboard"
          data-testid={`selector-${index}-copy-btn`}
        >
          {isCopied ? (
            <Check className="w-3 h-3 text-green-400" />
          ) : (
            <Copy className="w-3 h-3" />
          )}
        </motion.button>

        {/* Delete button */}
        <motion.button
          onClick={(e) => onDelete(selector.id, e)}
          disabled={isDeleting}
          className="p-1 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
          whileHover={{ scale: !isDeleting ? 1.1 : 1 }}
          whileTap={{ scale: !isDeleting ? 0.9 : 1 }}
          title="Delete selector"
          data-testid={`selector-${index}-delete-btn`}
        >
          {isDeleting ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <X className="w-3 h-3" />
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}
