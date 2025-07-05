'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Brain, RefreshCw } from 'lucide-react';
import { Goal } from '../../../types';
import { useAnalysisStore } from '../../../stores/analysisStore';

interface GoalsActionsProps {
  selectedGoal: Goal | null;
  onAddGoal: () => void;
  onAnalyzeGoal: () => void;
  onRefresh: () => void;
}

export default function GoalsActions({
  selectedGoal,
  onAddGoal,
  onAnalyzeGoal,
  onRefresh
}: GoalsActionsProps) {
  const { isActive } = useAnalysisStore();

  return (
    <div className="flex items-center space-x-3">
      {/* Refresh Button */}
      <motion.button
        whileHover={{ scale: 1.05, y: -1 }}
        whileTap={{ scale: 0.95 }}
        onClick={onRefresh}
        className="p-3 bg-gradient-to-r from-slate-800/60 to-slate-900/60 hover:from-slate-700/70 hover:to-slate-800/70 border border-slate-600/40 rounded-lg transition-all duration-300 group shadow-lg"
        title="Refresh goals"
      >
        <RefreshCw className="w-4 h-4 text-slate-300 group-hover:text-white transition-colors duration-300" />
      </motion.button>

      {/* Add Goal Button */}
      <motion.button
        whileHover={{ scale: 1.05, y: -1 }}
        whileTap={{ scale: 0.95 }}
        onClick={onAddGoal}
        className="p-3 bg-gradient-to-r from-slate-800/60 to-slate-900/60 hover:from-slate-700/70 hover:to-slate-800/70 border border-slate-600/40 rounded-lg transition-all duration-300 group shadow-lg"
        title="Add new goal"
      >
        <Plus className="w-4 h-4 text-slate-300 group-hover:text-white transition-colors duration-300" />
      </motion.button>

      {/* Analyze Goal Button */}
      <motion.button
        whileHover={{ scale: !isActive && selectedGoal ? 1.05 : 1, y: !isActive && selectedGoal ? -1 : 0 }}
        whileTap={{ scale: !isActive && selectedGoal ? 0.95 : 1 }}
        onClick={onAnalyzeGoal}
        disabled={!selectedGoal || isActive}
        className={`p-3 bg-gradient-to-r from-slate-800/60 to-slate-900/60 hover:from-slate-700/70 hover:to-slate-800/70 border border-slate-600/40 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group shadow-lg ${
          isActive ? 'animate-pulse' : ''
        }`}
        title={isActive ? "Analysis in progress..." : "Analyze goal"}
      >
        <motion.div
          animate={isActive ? { scale: [1, 1.2, 1] } : {}}
          transition={isActive ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : {}}
        >
          <Brain className={`w-4 h-4 transition-colors duration-300 ${
            isActive 
              ? 'text-purple-400' 
              : 'text-slate-300 group-hover:text-white'
          }`} />
        </motion.div>
      </motion.button>
    </div>
  );
} 