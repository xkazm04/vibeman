/**
 * ContextNode — Compact node representing an individual context inside a group cluster
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import type { Context } from '@/stores/contextStore';
import { getLucideIcon } from './helpers';

interface ContextNodeProps {
  context: Context;
  color: string;
  isSelected: boolean;
  onSelect: (contextId: string) => void;
  index: number;
}

export default function ContextNode({
  context,
  color,
  isSelected,
  onSelect,
  index,
}: ContextNodeProps) {
  const fileCount = context.filePaths?.length || 0;
  const Icon = getLucideIcon(null);

  return (
    <motion.button
      onClick={() => onSelect(context.id)}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: index * 0.03, type: 'spring', stiffness: 400, damping: 25 }}
      className={`relative flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-left transition-all group
        ${isSelected
          ? 'border-white/30 bg-white/10'
          : 'border-transparent hover:border-white/15 hover:bg-white/5'
        }`}
      title={context.description || context.name}
      data-testid={`context-node-${context.id}`}
    >
      <Icon
        className="w-3 h-3 shrink-0"
        style={{ color: `${color}cc` }}
      />
      <span className="text-[10px] text-gray-300 truncate max-w-[80px] leading-tight">
        {context.name}
      </span>
      {fileCount > 0 && (
        <span className="text-[9px] text-gray-600 font-mono shrink-0">
          {fileCount}
        </span>
      )}
    </motion.button>
  );
}
