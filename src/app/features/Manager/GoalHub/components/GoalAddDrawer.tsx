/**
 * GoalAddDrawer Component
 * Drawer for adding new goals
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import GoalAddPanel from '@/app/features/Onboarding/sub_GoalDrawer/GoalAddPanel';
import type { ExtendedGoal } from '@/app/db/models/goal-hub.types';

interface GoalAddDrawerProps {
  isOpen: boolean;
  projectId: string;
  projectPath: string;
  onClose: () => void;
  onGoalCreated: (goal: ExtendedGoal) => void;
}

export default function GoalAddDrawer({
  isOpen,
  projectId,
  projectPath,
  onClose,
  onGoalCreated,
}: GoalAddDrawerProps) {
  const handleSubmit = async (newGoal: { title: string; description?: string }) => {
    try {
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newGoal,
          projectId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.goal) {
          onGoalCreated(data.goal);
        }
      }
    } catch (err) {
      console.error('Failed to create goal:', err);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 top-0 h-full w-full max-w-xl bg-gray-900/95 backdrop-blur-xl border-l border-gray-700/50 shadow-2xl overflow-y-auto"
          >
            <div className="relative p-8">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full bg-gray-800/50 hover:bg-gray-700/50 transition-colors z-10"
              >
                <X className="w-5 h-5 text-gray-400 hover:text-white" />
              </button>
              <GoalAddPanel
                projectId={projectId}
                onSubmit={handleSubmit}
                onClose={onClose}
                projectPath={projectPath}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
