'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { DbIdea } from '@/app/db';
import {
  getCategoryConfig,
  effortConfig,
  impactConfig,
  EffortIcon,
  ImpactIcon
} from '../lib/ideaConfig';
import { useProcessingIdea } from '../lib/ProcessingIdeaContext';

interface BufferItemProps {
  idea: DbIdea;
  onClick: () => void;
  onDelete: (ideaId: string) => void;
}

const BufferItem = React.memo(function BufferItem({ idea, onClick, onDelete }: BufferItemProps) {
  const { processingIdeaId } = useProcessingIdea();
  const [isHovered, setIsHovered] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const config = getCategoryConfig(idea.category);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening the modal
    if (showDeleteConfirm) {
      onDelete(idea.id);
    } else {
      setShowDeleteConfirm(true);
      // Auto-hide confirm after 3 seconds
      setTimeout(() => setShowDeleteConfirm(false), 3000);
    }
  };

  const isPending = idea.status === 'pending';
  const isAccepted = idea.status === 'accepted';
  const isProcessing = processingIdeaId === idea.id;

  return (
    <motion.div
      className={`relative group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-all ${
        isProcessing
          ? 'bg-yellow-900/30 hover:bg-yellow-900/40'
          : isPending
          ? 'bg-gray-800/40 hover:bg-gray-800/60'
          : isAccepted
          ? 'bg-green-900/20 hover:bg-green-900/30'
          : 'bg-gray-800/20 hover:bg-gray-800/40'
      } border-2 ${
        isProcessing
          ? 'border-yellow-500/70 shadow-lg shadow-yellow-500/50'
          : isPending
          ? 'border-gray-700/40 hover:border-gray-600/60'
          : isAccepted
          ? 'border-green-700/30 hover:border-green-600/50'
          : 'border-gray-700/20 hover:border-gray-700/40'
      }`}
      initial={{ opacity: 0, x: -10 }}
      animate={
        isProcessing
          ? {
              opacity: 1,
              x: 0,
              boxShadow: [
                '0 0 10px rgba(234, 179, 8, 0.3)',
                '0 0 20px rgba(234, 179, 8, 0.6)',
                '0 0 10px rgba(234, 179, 8, 0.3)',
              ],
            }
          : { opacity: 1, x: 0 }
      }
      transition={
        isProcessing
          ? {
              boxShadow: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
            }
          : {}
      }
      whileHover={{ x: 2 }}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Left: Icons/Indicators */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Category Emoji */}
        <span className="text-sm">{config.emoji}</span>

        {/* Impact Icon */}
        {idea.impact && (
          <ImpactIcon
            className={`w-3 h-3 ${impactConfig[idea.impact]?.color || 'text-gray-400'}`}
            title={`Impact: ${impactConfig[idea.impact]?.label}`}
          />
        )}

        {/* Effort Icon */}
        {idea.effort && (
          <EffortIcon
            className={`w-3 h-3 ${effortConfig[idea.effort]?.color || 'text-gray-400'}`}
            title={`Effort: ${effortConfig[idea.effort]?.label}`}
          />
        )}
      </div>

      {/* Middle: Title */}
      <div className="flex-1 min-w-0">
        <p className={`text-xs truncate ${
          isPending
            ? 'text-gray-200 font-medium'
            : isAccepted
            ? 'text-green-300/80'
            : 'text-gray-400'
        }`}>
          {idea.title}
        </p>
      </div>

      {/* Right: Delete Button */}
      <motion.button
        className={`flex-shrink-0 p-1 rounded transition-all ${
          showDeleteConfirm
            ? 'bg-red-500/20 text-red-400 opacity-100'
            : isHovered
            ? 'text-red-400 opacity-100'
            : 'text-gray-600 opacity-0 group-hover:opacity-60'
        } hover:bg-red-500/20 hover:opacity-100`}
        onClick={handleDeleteClick}
        title={showDeleteConfirm ? 'Click again to confirm' : 'Delete idea'}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <Trash2 className="w-3 h-3" />
      </motion.button>
    </motion.div>
  );
});

export default BufferItem;
