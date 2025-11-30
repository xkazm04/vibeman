'use client';

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Edit2 } from 'lucide-react';
import { DbIdea } from '@/app/db';
import { useProcessingIdea } from '../lib/ProcessingIdeaContext';
import ContextMenu from '@/components/ContextMenu';
import { getCategoryConfig, EffortIcon, ImpactIcon } from '../lib/ideaConfig';

interface BufferItemProps {
  idea: DbIdea;
  onClick: () => void;
  onDelete: (ideaId: string) => void;
}

const BufferItem = React.memo(function BufferItem({ idea, onClick, onDelete }: BufferItemProps) {
  const { processingIdeaId } = useProcessingIdea();
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

  const categoryConfig = getCategoryConfig(idea.category);
  const isProcessing = processingIdeaId === idea.id;

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

  const getEffortConfig = (effort: number | null) => {
    if (!effort) return null;
    const configs: Record<number, { label: string; color: string }> = {
      1: { label: 'XS', color: 'text-green-400' },
      2: { label: 'S', color: 'text-blue-400' },
      3: { label: 'M', color: 'text-yellow-400' },
      4: { label: 'L', color: 'text-orange-400' },
      5: { label: 'XL', color: 'text-red-400' },
    };
    return configs[effort] || null;
  };

  const getImpactConfig = (impact: number | null) => {
    if (!impact) return null;
    const configs: Record<number, { label: string; color: string }> = {
      1: { label: 'MIN', color: 'text-gray-400' },
      2: { label: 'LOW', color: 'text-blue-400' },
      3: { label: 'MED', color: 'text-yellow-400' },
      4: { label: 'HIGH', color: 'text-orange-400' },
      5: { label: 'MAX', color: 'text-red-400' },
    };
    return configs[impact] || null;
  };

  const effortConfig = getEffortConfig(idea.effort);
  const impactConfig = getImpactConfig(idea.impact);

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
        className={`flex items-center gap-2 px-2 py-1.5 rounded-md border cursor-pointer transition-all duration-200 ease-out ${getStatusClasses()} ${
          isProcessing ? 'ring-2 ring-yellow-500/50' : ''
        }`}
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
          {impactConfig && (
            <div className="flex items-center gap-0.5" title={`Impact: ${impactConfig.label}`}>
              <ImpactIcon className={`w-3 h-3 ${impactConfig.color}`} />
            </div>
          )}

          {/* Effort Badge */}
          {effortConfig && (
            <div className="flex items-center gap-0.5" title={`Effort: ${effortConfig.label}`}>
              <EffortIcon className={`w-3 h-3 ${effortConfig.color}`} />
            </div>
          )}
        </div>

        {/* Title */}
        <span className="flex-1 min-w-0 text-xs text-gray-200 truncate font-medium">
          {idea.title}
        </span>
      </motion.div>

      {/* Context Menu */}
      <ContextMenu
        isOpen={showContextMenu}
        position={contextMenuPosition}
        onClose={() => setShowContextMenu(false)}
        items={[
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
