'use client';

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Edit2, Zap, Play } from 'lucide-react';
import { DbIdea } from '@/app/db';
import ContextMenu from '@/components/ContextMenu';
import { getCategoryConfig, EffortIcon, ImpactIcon, effortConfig, impactConfig } from '../lib/ideaConfig';

interface BufferItemProps {
  idea: DbIdea;
  onClick: () => void;
  onDelete: (ideaId: string) => void;
  onConvert?: (ideaId: string) => void;
  onQueueForExecution?: (ideaId: string) => void;
}

const BufferItem = React.memo(function BufferItem({ idea, onClick, onDelete, onConvert, onQueueForExecution }: BufferItemProps) {
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  const handleDeleteClick = () => {
    setShowContextMenu(false);
    onDelete(idea.id);
  };

  const handleEditClick = () => {
    setShowContextMenu(false);
    onClick();
  };

  const handleConvertClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowContextMenu(false);
    if (onConvert) {
      onConvert(idea.id);
    }
  };

  const handleQueueClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowContextMenu(false);
    if (onQueueForExecution) {
      onQueueForExecution(idea.id);
    }
  };

  const categoryConfig = getCategoryConfig(idea.category);

  // Get status-based styling with dark-mode friendly colors and high-contrast hover states
  const getStatusClasses = () => {
    const baseClasses = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-gray-900';
    switch (idea.status) {
      case 'accepted':
        return `${baseClasses} border-green-500/40 bg-green-900/10 hover:bg-green-800/30 hover:border-green-400/60 focus-visible:ring-green-400/70`;
      case 'rejected':
        return `${baseClasses} border-red-500/40 bg-red-900/10 hover:bg-red-800/30 hover:border-red-400/60 focus-visible:ring-red-400/70`;
      case 'implemented':
        return `${baseClasses} border-amber-500/40 bg-amber-900/10 hover:bg-amber-800/30 hover:border-amber-400/60 focus-visible:ring-amber-400/70`;
      default:
        return `${baseClasses} border-gray-600/40 bg-gray-800/20 hover:bg-gray-700/40 hover:border-gray-500/60 focus-visible:ring-blue-400/70`;
    }
  };

  const effortCfg = idea.effort ? effortConfig[idea.effort] || null : null;
  const impactCfg = idea.impact ? impactConfig[idea.impact] || null : null;

  // Handle keyboard navigation for accessibility
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  }, [onClick]);

  return (
    <>
      <motion.div
        data-testid={`buffer-item-${idea.id}`}
        tabIndex={0}
        role="button"
        aria-label={`${idea.title} - ${idea.status}`}
        className={`flex items-center gap-2 px-2 py-1.5 rounded-md border cursor-pointer transition-all duration-200 ease-out ${getStatusClasses()}`}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        whileHover={{
          x: 3,
          transition: { duration: 0.15, ease: 'easeOut' }
        }}
        whileFocus={{
          scale: 1.01,
          transition: { duration: 0.15 }
        }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        onContextMenu={handleContextMenu}
      >
        {/* Badges */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Category Emoji */}
          <span className="text-sm">{categoryConfig.emoji}</span>

          {/* Impact Badge */}
          {impactCfg && (
            <div className="flex items-center gap-0.5" title={`Impact: ${impactCfg.label}`}>
              <ImpactIcon className={`w-3 h-3 ${impactCfg.color}`} />
            </div>
          )}

          {/* Effort Badge */}
          {effortCfg && (
            <div className="flex items-center gap-0.5" title={`Effort: ${effortCfg.label}`}>
              <EffortIcon className={`w-3 h-3 ${effortCfg.color}`} />
            </div>
          )}
        </div>

        {/* Title */}
        <span className="flex-1 min-w-0 text-xs text-gray-200 truncate font-medium">
          {idea.title}
        </span>

        {/* Action buttons for pending ideas */}
        {idea.status === 'pending' && (
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {/* Quick Convert Button */}
            {onConvert && (
              <motion.button
                onClick={handleConvertClick}
                className="p-1 rounded hover:bg-amber-500/20 text-amber-400/60 hover:text-amber-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                title="Convert to requirement"
                aria-label="Convert to requirement"
              >
                <Zap className="w-3 h-3" />
              </motion.button>
            )}
            {/* Queue for Execution Button */}
            {onQueueForExecution && (
              <motion.button
                onClick={handleQueueClick}
                className="p-1 rounded hover:bg-green-500/20 text-green-400/60 hover:text-green-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400/70"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                title="Queue for execution"
                aria-label="Queue for execution"
              >
                <Play className="w-3 h-3" />
              </motion.button>
            )}
          </div>
        )}
      </motion.div>

      {/* Context Menu */}
      <ContextMenu
        isOpen={showContextMenu}
        position={contextMenuPosition}
        onClose={() => setShowContextMenu(false)}
        items={[
          ...(onQueueForExecution && idea.status === 'pending'
            ? [
                {
                  label: 'Queue for execution',
                  icon: Play,
                  onClick: handleQueueClick as () => void,
                },
              ]
            : []),
          ...(onConvert && idea.status === 'pending'
            ? [
                {
                  label: 'Convert to requirement',
                  icon: Zap,
                  onClick: handleConvertClick as () => void,
                },
              ]
            : []),
          {
            label: 'Edit idea',
            icon: Edit2,
            onClick: handleEditClick,
          },
          {
            label: 'Delete idea',
            icon: Trash2,
            onClick: handleDeleteClick,
            destructive: true,
          },
        ]}
      />
    </>
  );
});

export default BufferItem;
