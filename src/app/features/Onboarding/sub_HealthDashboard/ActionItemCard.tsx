'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  Clock,
  TrendingUp,
  ChevronRight,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Lightbulb,
  Wrench,
  Shield,
  TestTube2,
  Target,
  Code2,
  Settings,
} from 'lucide-react';
import type { ActionItem, EffortLevel, ImpactLevel } from '@/lib/health/healthCalculator';
import type { HealthScoreCategory } from '@/app/db/models/project-health.types';

interface ActionItemCardProps {
  action: ActionItem;
  onExecuteQuickFix?: (actionId: string, quickFixId: string) => Promise<void>;
  onMarkComplete?: (actionId: string) => void;
  onSkip?: (actionId: string) => void;
  isExecuting?: boolean;
  index?: number;
}

const EFFORT_CONFIG: Record<EffortLevel, { label: string; color: string; bgColor: string }> = {
  quick: { label: '< 5 min', color: 'text-green-400', bgColor: 'bg-green-500/10 border-green-500/30' },
  medium: { label: '5-30 min', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10 border-yellow-500/30' },
  significant: { label: '30+ min', color: 'text-orange-400', bgColor: 'bg-orange-500/10 border-orange-500/30' },
};

const IMPACT_CONFIG: Record<ImpactLevel, { label: string; color: string; bgColor: string }> = {
  high: { label: 'High Impact', color: 'text-red-400', bgColor: 'bg-red-500/10 border-red-500/30' },
  medium: { label: 'Medium Impact', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10 border-yellow-500/30' },
  low: { label: 'Low Impact', color: 'text-gray-400', bgColor: 'bg-gray-500/10 border-gray-500/30' },
};

const CATEGORY_ICONS: Record<HealthScoreCategory | 'setup', React.ElementType> = {
  idea_backlog: Lightbulb,
  tech_debt: Wrench,
  security: Shield,
  test_coverage: TestTube2,
  goal_completion: Target,
  code_quality: Code2,
  setup: Settings,
};

const CATEGORY_COLORS: Record<HealthScoreCategory | 'setup', string> = {
  idea_backlog: 'text-amber-400',
  tech_debt: 'text-orange-400',
  security: 'text-red-400',
  test_coverage: 'text-green-400',
  goal_completion: 'text-blue-400',
  code_quality: 'text-purple-400',
  setup: 'text-cyan-400',
};

export default function ActionItemCard({
  action,
  onExecuteQuickFix,
  onMarkComplete,
  onSkip,
  isExecuting = false,
  index = 0,
}: ActionItemCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [localExecuting, setLocalExecuting] = useState(false);

  const effort = EFFORT_CONFIG[action.effort];
  const impact = IMPACT_CONFIG[action.impact];
  const CategoryIcon = CATEGORY_ICONS[action.category];
  const categoryColor = CATEGORY_COLORS[action.category];

  const handleQuickFix = async () => {
    if (!action.quickFixAvailable || !action.quickFixId || !onExecuteQuickFix) return;

    setLocalExecuting(true);
    try {
      await onExecuteQuickFix(action.id, action.quickFixId);
    } finally {
      setLocalExecuting(false);
    }
  };

  const executing = isExecuting || localExecuting;
  const isCompleted = action.status === 'completed';
  const isSkipped = action.status === 'skipped';

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative group rounded-xl border transition-all duration-200
        ${isCompleted
          ? 'bg-green-500/5 border-green-500/20 opacity-60'
          : isSkipped
          ? 'bg-gray-800/30 border-gray-700/30 opacity-40'
          : 'bg-gray-800/50 border-gray-700/50 hover:border-gray-600/50 hover:bg-gray-800/70'
        }`}
    >
      {/* Priority Indicator */}
      {action.priority >= 8 && !isCompleted && !isSkipped && (
        <div className="absolute -top-1 -right-1">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"
          />
        </div>
      )}

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          {/* Category Icon */}
          <div className={`p-2 rounded-lg bg-gray-700/50 ${categoryColor}`}>
            <CategoryIcon className="w-4 h-4" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className={`font-medium text-sm ${isCompleted ? 'text-green-400 line-through' : 'text-white'}`}>
                {action.title}
              </h4>
              {isCompleted && (
                <CheckCircle2 className="w-4 h-4 text-green-400" />
              )}
            </div>

            <p className="text-xs text-gray-400 mt-1 line-clamp-2">
              {action.description}
            </p>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {/* Effort Badge */}
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${effort.bgColor}`}>
                <Clock className={`w-3 h-3 ${effort.color}`} />
                <span className={effort.color}>{effort.label}</span>
              </span>

              {/* Impact Badge */}
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${impact.bgColor}`}>
                <TrendingUp className={`w-3 h-3 ${impact.color}`} />
                <span className={impact.color}>{impact.label}</span>
              </span>

              {/* Score Gain */}
              {action.estimatedScoreGain > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-cyan-500/10 border border-cyan-500/30">
                  <span className="text-cyan-400">+{action.estimatedScoreGain} pts</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <AnimatePresence>
          {(isHovered || action.quickFixAvailable) && !isCompleted && !isSkipped && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 pt-3 border-t border-gray-700/50"
            >
              <div className="flex items-center gap-2">
                {/* Quick Fix Button */}
                {action.quickFixAvailable && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleQuickFix}
                    disabled={executing}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg
                      bg-gradient-to-r from-cyan-500/20 to-blue-500/20
                      border border-cyan-500/30 hover:border-cyan-500/50
                      text-cyan-400 text-xs font-medium
                      transition-all duration-200
                      disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {executing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Executing...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5" />
                        <span>Quick Fix</span>
                      </>
                    )}
                  </motion.button>
                )}

                {/* Mark Complete */}
                {onMarkComplete && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onMarkComplete(action.id)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg
                      bg-green-500/10 border border-green-500/30 hover:border-green-500/50
                      text-green-400 text-xs font-medium
                      transition-all duration-200"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Done</span>
                  </motion.button>
                )}

                {/* Skip Button */}
                {onSkip && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onSkip(action.id)}
                    className="flex items-center justify-center p-2 rounded-lg
                      bg-gray-700/50 border border-gray-600/30 hover:border-gray-500/50
                      text-gray-400 text-xs
                      transition-all duration-200"
                    title="Skip this action"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </motion.button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
