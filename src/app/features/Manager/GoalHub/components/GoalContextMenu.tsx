/**
 * GoalContextMenu Component
 * Right-click context menu for goal actions
 */

'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Eye, CheckCircle2, Trash2 } from 'lucide-react';
import type { ExtendedGoal } from '@/app/db/models/goal-hub.types';

interface GoalContextMenuProps {
  goal: ExtendedGoal;
  x: number;
  y: number;
  onClose: () => void;
  onViewDetails: () => void;
}

export default function GoalContextMenu({
  goal,
  x,
  y,
  onClose,
  onViewDetails,
}: GoalContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Adjust position to keep menu in viewport
  const adjustedX = Math.min(x, window.innerWidth - 200);
  const adjustedY = Math.min(y, window.innerHeight - 150);

  return (
    <motion.div
      ref={menuRef}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.1 }}
      className="fixed z-50 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 min-w-[160px]"
      style={{ left: adjustedX, top: adjustedY }}
    >
      <div className="px-3 py-1.5 border-b border-gray-700">
        <p className="text-xs text-gray-400 truncate max-w-[140px]">{goal.title}</p>
      </div>

      <button
        onClick={onViewDetails}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700/50 transition-colors"
      >
        <Eye className="w-4 h-4" />
        View Details
      </button>

      {goal.status !== 'done' && (
        <button
          onClick={() => {
            // TODO: Implement complete action
            onClose();
          }}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-emerald-400 hover:bg-gray-700/50 transition-colors"
        >
          <CheckCircle2 className="w-4 h-4" />
          Mark Complete
        </button>
      )}

      <button
        onClick={() => {
          // TODO: Implement delete action
          onClose();
        }}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-gray-700/50 transition-colors"
      >
        <Trash2 className="w-4 h-4" />
        Delete
      </button>
    </motion.div>
  );
}
