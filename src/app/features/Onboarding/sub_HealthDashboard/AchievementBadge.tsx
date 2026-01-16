'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Footprints,
  Flag,
  CheckCircle2,
  Heart,
  HeartPulse,
  Sparkles,
  Zap,
  Trophy,
  Flame,
  Medal,
  Lock,
  Star,
} from 'lucide-react';
import type { Achievement } from '@/lib/health/healthCalculator';

interface AchievementBadgeProps {
  achievement: Achievement;
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
  animate?: boolean;
  index?: number;
}

const SIZE_CONFIG = {
  sm: { badge: 'w-12 h-12', icon: 'w-5 h-5', text: 'text-xs', padding: 'p-2' },
  md: { badge: 'w-16 h-16', icon: 'w-6 h-6', text: 'text-sm', padding: 'p-3' },
  lg: { badge: 'w-20 h-20', icon: 'w-8 h-8', text: 'text-base', padding: 'p-4' },
};

const CATEGORY_COLORS = {
  setup: { bg: 'bg-cyan-500/20', border: 'border-cyan-500/50', icon: 'text-cyan-400', glow: 'shadow-cyan-500/30' },
  milestone: { bg: 'bg-amber-500/20', border: 'border-amber-500/50', icon: 'text-amber-400', glow: 'shadow-amber-500/30' },
  streak: { bg: 'bg-orange-500/20', border: 'border-orange-500/50', icon: 'text-orange-400', glow: 'shadow-orange-500/30' },
  special: { bg: 'bg-purple-500/20', border: 'border-purple-500/50', icon: 'text-purple-400', glow: 'shadow-purple-500/30' },
};

const ICON_MAP: Record<string, React.ElementType> = {
  Footprints,
  Flag,
  CheckCircle2,
  Heart,
  HeartPulse,
  Sparkles,
  Zap,
  Trophy,
  Flame,
  Medal,
  Star,
};

export default function AchievementBadge({
  achievement,
  size = 'md',
  showProgress = true,
  animate = true,
  index = 0,
}: AchievementBadgeProps) {
  const config = SIZE_CONFIG[size];
  const colors = CATEGORY_COLORS[achievement.category];
  const Icon = ICON_MAP[achievement.icon] || Star;
  const isUnlocked = !!achievement.unlockedAt;
  const progress = (achievement.progress / achievement.maxProgress) * 100;

  return (
    <motion.div
      initial={animate ? { opacity: 0, scale: 0.8 } : undefined}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
      className="flex flex-col items-center gap-2"
    >
      {/* Badge */}
      <div className="relative group">
        {/* Glow Effect for Unlocked */}
        {isUnlocked && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            className={`absolute inset-0 rounded-full blur-xl ${colors.bg}`}
          />
        )}

        {/* Badge Container */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          className={`relative ${config.badge} ${config.padding} rounded-full
            ${isUnlocked
              ? `${colors.bg} ${colors.border} shadow-lg ${colors.glow}`
              : 'bg-gray-800/50 border-gray-700/50'
            } border-2 flex items-center justify-center
            transition-all duration-300`}
        >
          {/* Lock Overlay */}
          {!isUnlocked && (
            <div className="absolute inset-0 rounded-full bg-gray-900/60 flex items-center justify-center">
              <Lock className="w-4 h-4 text-gray-500" />
            </div>
          )}

          {/* Icon */}
          <Icon className={`${config.icon} ${isUnlocked ? colors.icon : 'text-gray-600'}`} />

          {/* Progress Ring (when partially complete) */}
          {!isUnlocked && showProgress && progress > 0 && (
            <svg
              className="absolute inset-0 w-full h-full transform -rotate-90"
              viewBox="0 0 100 100"
            >
              <circle
                cx="50"
                cy="50"
                r="46"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                className="text-gray-700/50"
              />
              <motion.circle
                cx="50"
                cy="50"
                r="46"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                className={colors.icon}
                initial={{ strokeDashoffset: 289 }}
                animate={{ strokeDashoffset: 289 - (289 * progress) / 100 }}
                transition={{ duration: 1, ease: 'easeOut' }}
                style={{ strokeDasharray: 289 }}
              />
            </svg>
          )}

          {/* Reward Points Badge */}
          {isUnlocked && achievement.rewardPoints && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3 }}
              className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full
                bg-amber-500 text-amber-900 text-[10px] font-bold
                shadow-lg shadow-amber-500/30"
            >
              +{achievement.rewardPoints}
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Name */}
      <span className={`${config.text} font-medium text-center
        ${isUnlocked ? 'text-white' : 'text-gray-500'}`}>
        {achievement.name}
      </span>

      {/* Progress Text */}
      {showProgress && !isUnlocked && (
        <span className="text-[10px] text-gray-500">
          {achievement.progress}/{achievement.maxProgress}
        </span>
      )}

      {/* Tooltip on Hover */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2
        opacity-0 group-hover:opacity-100 pointer-events-none
        transition-opacity duration-200 z-10">
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-2 min-w-[150px] shadow-xl">
          <p className="text-xs text-white font-medium">{achievement.name}</p>
          <p className="text-[10px] text-gray-400 mt-1">{achievement.description}</p>
          <p className="text-[10px] text-gray-500 mt-1">{achievement.requirement}</p>
          {isUnlocked && (
            <p className="text-[10px] text-green-400 mt-1">
              Unlocked!
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Achievement Grid Component
interface AchievementGridProps {
  achievements: Achievement[];
  columns?: number;
  showAll?: boolean;
}

export function AchievementGrid({
  achievements,
  columns = 5,
  showAll = false,
}: AchievementGridProps) {
  const displayedAchievements = showAll
    ? achievements
    : achievements.slice(0, columns * 2);

  const unlockedCount = achievements.filter(a => a.unlockedAt).length;
  const totalPoints = achievements
    .filter(a => a.unlockedAt)
    .reduce((sum, a) => sum + (a.rewardPoints || 0), 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-medium text-white">Achievements</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">
            {unlockedCount}/{achievements.length} unlocked
          </span>
          {totalPoints > 0 && (
            <span className="text-xs text-amber-400 font-medium">
              {totalPoints} pts
            </span>
          )}
        </div>
      </div>

      {/* Grid */}
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {displayedAchievements.map((achievement, index) => (
          <AchievementBadge
            key={achievement.id}
            achievement={achievement}
            size="sm"
            index={index}
          />
        ))}
      </div>
    </div>
  );
}
