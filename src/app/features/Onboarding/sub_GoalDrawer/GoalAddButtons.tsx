'use client';

import { motion } from 'framer-motion';
import { Plus, Sparkles } from 'lucide-react';
import { Goal } from '@/types';

interface GoalAddButtonsProps {
  onAddGoal: () => void;
  onShowAIGoals: () => void;
  onGoalSelect?: (goal: Goal | 'add') => void;
}

export default function GoalAddButtons({
  onAddGoal,
  onShowAIGoals,
  onGoalSelect,
}: GoalAddButtonsProps) {
  const handleAddClick = () => {
    if (onGoalSelect) {
      onGoalSelect('add');
    } else {
      onAddGoal();
    }
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleAddClick}
        data-testid="add-goal-manual-btn"
        className="group p-4 border-2 border-dashed border-gray-600/50 hover:border-cyan-500/50 rounded-lg transition-all flex items-center justify-center gap-2"
      >
        <div className="p-1.5 bg-cyan-500/10 rounded-lg border border-cyan-500/30 group-hover:bg-cyan-500/20 transition-colors">
          <Plus className="w-4 h-4 text-cyan-400" />
        </div>
        <span className="text-sm font-medium text-gray-400 group-hover:text-cyan-400 transition-colors">
          Add Goal
        </span>
      </motion.button>

      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.75 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onShowAIGoals}
        data-testid="generate-ai-goals-btn"
        className="group p-4 border-2 border-dashed border-purple-600/50 hover:border-purple-500/50 rounded-lg transition-all flex items-center justify-center gap-2"
      >
        <div className="p-1.5 bg-purple-500/10 rounded-lg border border-purple-500/30 group-hover:bg-purple-500/20 transition-colors">
          <Sparkles className="w-4 h-4 text-purple-400" />
        </div>
        <span className="text-sm font-medium text-gray-400 group-hover:text-purple-400 transition-colors">
          AI Goals
        </span>
      </motion.button>
    </div>
  );
}
