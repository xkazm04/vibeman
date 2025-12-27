/**
 * CompletionScreen Component
 * Success screen after completing all project reviews
 */

'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, RotateCcw } from 'lucide-react';

interface CompletionScreenProps {
  projectsCount: number;
  onRestart: () => void;
}

export function CompletionScreen({ projectsCount, onRestart }: CompletionScreenProps) {
  return (
    <motion.div
      key="complete"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex flex-col items-center justify-center py-20"
    >
      <div className="p-4 bg-emerald-500/20 rounded-full border border-emerald-500/40 mb-6">
        <CheckCircle2 className="w-16 h-16 text-emerald-400" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">Standup Complete!</h2>
      <p className="text-gray-400 mb-8">
        You've reviewed goals for all {projectsCount} projects
      </p>
      <button
        onClick={onRestart}
        className="flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
      >
        <RotateCcw className="w-4 h-4" />
        Start Over
      </button>
    </motion.div>
  );
}
