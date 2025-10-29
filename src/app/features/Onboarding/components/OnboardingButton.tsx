'use client';

import { motion } from 'framer-motion';
import { ClipboardList } from 'lucide-react';

interface OnboardingButtonProps {
  onClick: () => void;
  tasksCompleted: number;
  totalTasks: number;
}

export default function OnboardingButton({ onClick, tasksCompleted, totalTasks }: OnboardingButtonProps) {
  const progress = (tasksCompleted / totalTasks) * 100;

  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="relative group"
    >
      {/* Button container */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 hover:border-amber-400/50 transition-all duration-300">
        {/* Icon */}
        <div className="relative">
          <ClipboardList className="w-4 h-4 text-amber-400" />

          {/* Progress indicator badge */}
          {tasksCompleted < totalTasks && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full"
            >
              <div className="absolute inset-0 bg-orange-500 rounded-full animate-ping" />
            </motion.div>
          )}
        </div>

        {/* Text */}
        <span className="text-xs font-medium text-amber-200/90">
          Getting Started
        </span>

        {/* Progress bar */}
        <div className="w-12 h-1 bg-gray-700/50 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-amber-400 to-orange-400"
          />
        </div>
      </div>

      {/* Glow effect on hover */}
      <motion.div
        className="absolute inset-0 rounded-lg bg-amber-500/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"
      />
    </motion.button>
  );
}
