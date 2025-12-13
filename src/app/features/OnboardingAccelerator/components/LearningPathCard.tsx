'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  GraduationCap,
  Clock,
  BookOpen,
  Play,
  Trash2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { useThemeStore } from '@/stores/themeStore';
import { animationPresets } from '@/lib/design-tokens';
import type { LearningPath } from '@/stores/onboardingAcceleratorStore';

interface LearningPathCardProps {
  path: LearningPath;
  onSelect: () => void;
  onDelete: () => void;
  onStart?: () => void;
}

export const LearningPathCard: React.FC<LearningPathCardProps> = ({
  path,
  onSelect,
  onDelete,
  onStart,
}) => {
  const { getThemeColors } = useThemeStore();
  const colors = getThemeColors();

  const statusColors = {
    draft: 'text-yellow-400 bg-yellow-500/10',
    active: 'text-cyan-400 bg-cyan-500/10',
    completed: 'text-green-400 bg-green-500/10',
    archived: 'text-gray-400 bg-gray-500/10',
  };

  const StatusIcon = path.status === 'completed' ? CheckCircle : path.status === 'active' ? Play : AlertCircle;

  return (
    <motion.div
      className="bg-gray-900/70 backdrop-blur-xl border border-gray-700/50 rounded-lg p-4 cursor-pointer hover:bg-gray-800/70 transition-colors"
      onClick={onSelect}
      {...animationPresets.card}
      data-testid={`learning-path-card-${path.id}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${colors.bg}`}>
            <GraduationCap className={`w-5 h-5 ${colors.text}`} />
          </div>
          <div>
            <h3 className="text-white font-medium">{path.developer_name}</h3>
            <p className="text-gray-400 text-sm">
              {path.assigned_work.length} assigned task{path.assigned_work.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 ${statusColors[path.status]}`}>
          <StatusIcon className="w-3 h-3" />
          {path.status}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Progress</span>
          <span>{path.progress_percentage}%</span>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            className={`h-full bg-gradient-to-r ${colors.primary}`}
            initial={{ width: 0 }}
            animate={{ width: `${path.progress_percentage}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center p-2 bg-gray-800/50 rounded-lg">
          <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
            <BookOpen className="w-3 h-3" />
            <span className="text-xs">Modules</span>
          </div>
          <p className="text-white font-medium">
            {path.completed_modules}/{path.total_modules}
          </p>
        </div>
        <div className="text-center p-2 bg-gray-800/50 rounded-lg">
          <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
            <Clock className="w-3 h-3" />
            <span className="text-xs">Est.</span>
          </div>
          <p className="text-white font-medium">
            {path.estimated_hours.toFixed(1)}h
          </p>
        </div>
        <div className="text-center p-2 bg-gray-800/50 rounded-lg">
          <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
            <Clock className="w-3 h-3" />
            <span className="text-xs">Actual</span>
          </div>
          <p className="text-white font-medium">
            {path.actual_hours.toFixed(1)}h
          </p>
        </div>
      </div>

      {/* Learning Speed Indicator */}
      {path.learning_speed !== 1.0 && (
        <div className="mb-3 flex items-center gap-2">
          <span className="text-xs text-gray-400">Learning pace:</span>
          <span className={`text-xs ${path.learning_speed > 1 ? 'text-green-400' : 'text-amber-400'}`}>
            {path.learning_speed > 1 ? 'Faster' : 'Slower'} than average
            ({(path.learning_speed * 100).toFixed(0)}%)
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t border-gray-700/50">
        {path.status === 'draft' && onStart && (
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              onStart();
            }}
            className={`flex-1 px-3 py-2 rounded-lg bg-gradient-to-r ${colors.primary} text-white text-sm font-medium flex items-center justify-center gap-2`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            data-testid={`start-path-btn-${path.id}`}
          >
            <Play className="w-4 h-4" />
            Start Learning
          </motion.button>
        )}
        {path.status === 'active' && (
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            className={`flex-1 px-3 py-2 rounded-lg bg-gradient-to-r ${colors.primary} text-white text-sm font-medium flex items-center justify-center gap-2`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            data-testid={`continue-path-btn-${path.id}`}
          >
            <Play className="w-4 h-4" />
            Continue
          </motion.button>
        )}
        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="px-3 py-2 rounded-lg bg-red-500/10 text-red-400 text-sm flex items-center justify-center gap-2 hover:bg-red-500/20 transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          data-testid={`delete-path-btn-${path.id}`}
        >
          <Trash2 className="w-4 h-4" />
        </motion.button>
      </div>
    </motion.div>
  );
};
