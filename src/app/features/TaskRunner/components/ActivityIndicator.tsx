'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { memo } from 'react';
import type { TaskActivity, ActivityEvent } from '../lib/activityClassifier.types';
import {
  getActivityIcon,
  getActivityLabel,
  getPhaseIcon,
  getPhaseLabel,
} from '../lib/activityClassifier';

interface ActivityIndicatorProps {
  activity: TaskActivity | null;
  compact?: boolean;
}

/**
 * Displays current Claude Code activity with icon, label, and target
 */
export const ActivityIndicator = memo(function ActivityIndicator({
  activity,
  compact = false,
}: ActivityIndicatorProps) {
  if (!activity) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span className="opacity-50">Waiting for activity...</span>
      </div>
    );
  }

  const { currentActivity, phase, toolCounts } = activity;

  if (compact) {
    return (
      <CompactActivityIndicator
        currentActivity={currentActivity}
        phase={phase}
      />
    );
  }

  return (
    <div className="space-y-2">
      {/* Current Activity */}
      <CurrentActivityDisplay activity={currentActivity} />

      {/* Phase Badge */}
      <div className="flex items-center gap-2">
        <PhaseBadge phase={phase} />
        <ToolCountBadges toolCounts={toolCounts} />
      </div>
    </div>
  );
});

/**
 * Compact version for inline display
 */
function CompactActivityIndicator({
  currentActivity,
  phase,
}: {
  currentActivity: ActivityEvent | null;
  phase: TaskActivity['phase'];
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-gray-500">{getPhaseIcon(phase)}</span>
      {currentActivity ? (
        <motion.span
          key={currentActivity.timestamp.toISOString()}
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-gray-400 truncate max-w-[400px]"
          title={currentActivity.target}
        >
          {getActivityIcon(currentActivity.type)} {currentActivity.target || getActivityLabel(currentActivity.type)}
        </motion.span>
      ) : (
        <span className="text-gray-500">Idle</span>
      )}
    </div>
  );
}

/**
 * Displays the current activity with animation
 */
function CurrentActivityDisplay({ activity }: { activity: ActivityEvent | null }) {
  return (
    <div className="min-h-[24px]">
      <AnimatePresence mode="wait">
        {activity ? (
          <motion.div
            key={activity.timestamp.toISOString()}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2"
          >
            <ActivityIcon type={activity.type} />
            <span className="text-sm text-gray-300">
              {getActivityLabel(activity.type)}
            </span>
            {activity.target && (
              <span
                className="text-xs text-gray-500 truncate max-w-[180px]"
                title={activity.target}
              >
                {activity.target}
              </span>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-gray-500"
          >
            <span className="text-sm">Idle</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Animated activity icon based on type
 */
function ActivityIcon({ type }: { type: ActivityEvent['type'] }) {
  const icon = getActivityIcon(type);

  // Add animation based on activity type
  const animationProps = {
    reading: { animate: { opacity: [1, 0.5, 1] }, transition: { duration: 1.5, repeat: Infinity } },
    editing: { animate: { scale: [1, 1.1, 1] }, transition: { duration: 0.8, repeat: Infinity } },
    searching: { animate: { rotate: [0, 360] }, transition: { duration: 2, repeat: Infinity, ease: 'linear' as const } },
    executing: { animate: { rotate: [0, 180, 360] }, transition: { duration: 1, repeat: Infinity } },
    planning: { animate: { y: [0, -2, 0] }, transition: { duration: 1, repeat: Infinity } },
    thinking: { animate: { opacity: [1, 0.3, 1] }, transition: { duration: 2, repeat: Infinity } },
    writing: { animate: { scale: [1, 1.05, 1] }, transition: { duration: 0.6, repeat: Infinity } },
    idle: {},
  }[type] || {};

  return (
    <motion.span
      className="text-base"
      {...animationProps}
    >
      {icon}
    </motion.span>
  );
}

/**
 * Phase badge showing current execution phase
 */
function PhaseBadge({ phase }: { phase: TaskActivity['phase'] }) {
  const colorClasses = {
    analyzing: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    planning: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    implementing: 'bg-green-500/20 text-green-400 border-green-500/30',
    validating: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    idle: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  }[phase];

  return (
    <span className={`px-2 py-0.5 text-xs rounded border ${colorClasses}`}>
      {getPhaseIcon(phase)} {getPhaseLabel(phase)}
    </span>
  );
}

/**
 * Tool usage count badges
 */
function ToolCountBadges({ toolCounts }: { toolCounts: Record<string, number> }) {
  const entries = Object.entries(toolCounts);
  if (entries.length === 0) return null;

  // Show top 3 tools by count
  const topTools = entries
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <div className="flex items-center gap-1">
      {topTools.map(([tool, count]) => (
        <span
          key={tool}
          className="px-1.5 py-0.5 text-[10px] bg-gray-700/50 text-gray-400 rounded"
          title={`${tool}: ${count} calls`}
        >
          {tool} ({count})
        </span>
      ))}
    </div>
  );
}

export default ActivityIndicator;
