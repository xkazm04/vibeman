'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Lock,
  Play,
  CheckCircle,
  SkipForward,
  Clock,
  Target,
  ChevronRight,
} from 'lucide-react';
import { useThemeStore } from '@/stores/themeStore';
import type { LearningModule } from '@/stores/onboardingAcceleratorStore';

interface ModuleCardProps {
  module: LearningModule;
  onSelect: () => void;
  onStart?: () => void;
  onSkip?: () => void;
  isActive?: boolean;
}

export const ModuleCard: React.FC<ModuleCardProps> = ({
  module,
  onSelect,
  onStart,
  onSkip,
  isActive = false,
}) => {
  const { getThemeColors } = useThemeStore();
  const colors = getThemeColors();

  const statusConfig = {
    locked: { icon: Lock, color: 'text-gray-500', bg: 'bg-gray-500/10' },
    available: { icon: Play, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    in_progress: { icon: BookOpen, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    completed: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10' },
    skipped: { icon: SkipForward, color: 'text-gray-400', bg: 'bg-gray-500/10' },
  };

  const difficultyConfig = {
    beginner: { label: 'Beginner', color: 'text-green-400' },
    intermediate: { label: 'Intermediate', color: 'text-amber-400' },
    advanced: { label: 'Advanced', color: 'text-red-400' },
  };

  const config = statusConfig[module.status];
  const StatusIcon = config.icon;
  const isLocked = module.status === 'locked';

  return (
    <motion.div
      className={`
        relative rounded-lg border transition-all
        ${isActive ? `border-2 ${colors.border} ${colors.bg}` : 'border-gray-700/50 bg-gray-900/70'}
        ${isLocked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-800/70'}
      `}
      onClick={() => !isLocked && onSelect()}
      whileHover={!isLocked ? { scale: 1.01 } : {}}
      whileTap={!isLocked ? { scale: 0.99 } : {}}
      data-testid={`module-card-${module.id}`}
    >
      {/* Module number badge */}
      <div className={`absolute -top-2 -left-2 w-8 h-8 rounded-full flex items-center justify-center ${config.bg} border border-gray-700/50`}>
        <span className={`text-sm font-medium ${config.color}`}>
          {module.order_index + 1}
        </span>
      </div>

      <div className="p-4 pl-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 pr-4">
            <h3 className={`font-medium ${isLocked ? 'text-gray-500' : 'text-white'}`}>
              {module.title}
            </h3>
            <p className="text-sm text-gray-400 mt-1 line-clamp-2">
              {module.description}
            </p>
          </div>
          <div className={`p-2 rounded-lg ${config.bg}`}>
            <StatusIcon className={`w-4 h-4 ${config.color}`} />
          </div>
        </div>

        {/* Meta info */}
        <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{module.estimated_minutes} min</span>
          </div>
          <div className="flex items-center gap-1">
            <Target className="w-3 h-3" />
            <span>{module.relevance_score}% relevant</span>
          </div>
          <span className={difficultyConfig[module.difficulty].color}>
            {difficultyConfig[module.difficulty].label}
          </span>
        </div>

        {/* Key concepts preview */}
        {module.key_concepts.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {module.key_concepts.slice(0, 3).map((concept, i) => (
              <span
                key={i}
                className="px-2 py-0.5 text-xs rounded bg-gray-800/50 text-gray-400"
              >
                {concept.name}
              </span>
            ))}
            {module.key_concepts.length > 3 && (
              <span className="px-2 py-0.5 text-xs rounded bg-gray-800/50 text-gray-500">
                +{module.key_concepts.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        {!isLocked && (
          <div className="flex items-center gap-2 pt-2 border-t border-gray-700/30">
            {module.status === 'available' && onStart && (
              <motion.button
                onClick={(e) => {
                  e.stopPropagation();
                  onStart();
                }}
                className={`flex-1 px-3 py-1.5 rounded-lg bg-gradient-to-r ${colors.primary} text-white text-sm font-medium flex items-center justify-center gap-2`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                data-testid={`start-module-btn-${module.id}`}
              >
                <Play className="w-3 h-3" />
                Start
              </motion.button>
            )}
            {(module.status === 'available' || module.status === 'in_progress') && onSkip && (
              <motion.button
                onClick={(e) => {
                  e.stopPropagation();
                  onSkip();
                }}
                className="px-3 py-1.5 rounded-lg bg-gray-700/50 text-gray-400 text-sm flex items-center justify-center gap-2 hover:bg-gray-700 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                data-testid={`skip-module-btn-${module.id}`}
              >
                <SkipForward className="w-3 h-3" />
                Skip
              </motion.button>
            )}
            {module.status === 'in_progress' && (
              <motion.button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect();
                }}
                className={`flex-1 px-3 py-1.5 rounded-lg bg-gradient-to-r ${colors.primary} text-white text-sm font-medium flex items-center justify-center gap-2`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                data-testid={`continue-module-btn-${module.id}`}
              >
                Continue
                <ChevronRight className="w-3 h-3" />
              </motion.button>
            )}
            {module.status === 'completed' && (
              <span className="flex items-center gap-1 text-sm text-green-400">
                <CheckCircle className="w-4 h-4" />
                Completed
                {module.actual_minutes && (
                  <span className="text-gray-500 ml-2">
                    ({module.actual_minutes} min)
                  </span>
                )}
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};
