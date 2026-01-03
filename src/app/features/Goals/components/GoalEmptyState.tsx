'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Target,
  Plus,
  CheckCircle2,
  Circle,
  Clock,
  ArrowRight,
  Lightbulb
} from 'lucide-react';

interface GoalEmptyStateProps {
  onAddGoal: () => void;
  className?: string;
}

/**
 * Example goals that teach the user what goals look like
 */
const EXAMPLE_GOALS = [
  {
    title: 'Implement user authentication',
    status: 'in_progress' as const,
    description: 'Add login, signup, and session management',
  },
  {
    title: 'Optimize database queries',
    status: 'pending' as const,
    description: 'Reduce load times by 50%',
  },
  {
    title: 'Add dark mode support',
    status: 'completed' as const,
    description: 'Theme switching with persistence',
  },
];

const statusConfig = {
  pending: {
    icon: Circle,
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-500/20',
  },
  in_progress: {
    icon: Clock,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
  },
  completed: {
    icon: CheckCircle2,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/20',
  },
};

/**
 * GoalEmptyState - Enhanced empty state that teaches by example
 *
 * Shows ghosted example goals to illustrate what the interface will look like
 * when populated, making it immediately clear what goals are for.
 */
export default function GoalEmptyState({ onAddGoal, className = '' }: GoalEmptyStateProps) {
  return (
    <div className={`flex flex-col items-center py-8 px-4 ${className}`}>
      {/* Icon with glow */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative mb-6"
      >
        <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full" />
        <div className="relative p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20">
          <Target className="w-8 h-8 text-blue-400" />
        </div>
      </motion.div>

      {/* Headline */}
      <motion.h3
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-lg font-semibold text-gray-200 mb-2"
      >
        Define your project objectives
      </motion.h3>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="text-sm text-gray-400 text-center max-w-xs mb-6"
      >
        Goals help prioritize work and track progress. Here&apos;s what your goals could look like:
      </motion.p>

      {/* Example goals preview - ghosted style */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-sm space-y-2 mb-6"
      >
        {EXAMPLE_GOALS.map((goal, index) => {
          const config = statusConfig[goal.status];
          const Icon = config.icon;

          return (
            <motion.div
              key={goal.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 0.5, x: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className={`
                p-3 rounded-lg border ${config.borderColor} ${config.bgColor}
                opacity-50 pointer-events-none
              `}
            >
              <div className="flex items-start gap-3">
                <Icon className={`w-4 h-4 ${config.color} mt-0.5 flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-300 truncate">{goal.title}</p>
                  <p className="text-xs text-gray-500 truncate">{goal.description}</p>
                </div>
              </div>
            </motion.div>
          );
        })}

        {/* Fade gradient overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-gray-900/80 to-transparent pointer-events-none" />
      </motion.div>

      {/* Call to action */}
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        onClick={onAddGoal}
        className="group flex items-center gap-2 px-5 py-2.5 bg-blue-500/20 hover:bg-blue-500/30
                   text-blue-400 rounded-xl border border-blue-500/30 transition-all"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Plus className="w-4 h-4" />
        <span className="font-medium">Create your first goal</span>
        <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
      </motion.button>

      {/* Tip */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="flex items-center gap-2 mt-6 text-xs text-gray-500"
      >
        <Lightbulb className="w-3.5 h-3.5 text-amber-500/60" />
        <span>Tip: Start with a small, achievable goal</span>
      </motion.div>
    </div>
  );
}

/**
 * Compact version for inline use
 */
export function GoalEmptyStateCompact({ onAddGoal }: { onAddGoal: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl border border-gray-700/50"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-500/10 rounded-lg">
          <Target className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-300">No goals defined</p>
          <p className="text-xs text-gray-500">Create a goal to track progress</p>
        </div>
      </div>
      <button
        onClick={onAddGoal}
        className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-sm
                   rounded-lg border border-blue-500/30 transition-colors"
      >
        Add Goal
      </button>
    </motion.div>
  );
}
