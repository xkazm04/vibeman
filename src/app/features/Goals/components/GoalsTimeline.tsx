'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Target,
  CheckCircle,
  Circle,
  Clock,
  Calendar,
  ChevronRight,
} from 'lucide-react';

export interface TimelineGoal {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  createdAt: string;
  completedAt?: string;
  contextName?: string;
  projectName?: string;
}

interface GoalsTimelineProps {
  goals: TimelineGoal[];
  onGoalClick?: (goalId: string) => void;
  showDates?: boolean;
  maxItems?: number;
  className?: string;
}

const statusConfig = {
  pending: {
    icon: Circle,
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-500/30',
    label: 'Pending',
  },
  in_progress: {
    icon: Clock,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    label: 'In Progress',
  },
  completed: {
    icon: CheckCircle,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    label: 'Completed',
  },
  blocked: {
    icon: Circle,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    label: 'Blocked',
  },
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function GoalsTimeline({
  goals,
  onGoalClick,
  showDates = true,
  maxItems,
  className = '',
}: GoalsTimelineProps) {
  const displayedGoals = maxItems ? goals.slice(0, maxItems) : goals;

  if (goals.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-8 ${className}`}>
        <Target className="w-10 h-10 text-gray-600 mb-3" />
        <p className="text-sm text-gray-400">No goals yet</p>
        <p className="text-xs text-gray-500 mt-1">Create your first goal to get started</p>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-700" />

      {/* Goals */}
      <div className="space-y-4">
        {displayedGoals.map((goal, index) => {
          const config = statusConfig[goal.status];
          const Icon = config.icon;

          return (
            <motion.div
              key={goal.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative pl-10"
            >
              {/* Timeline node */}
              <div
                className={`absolute left-2 w-5 h-5 rounded-full flex items-center justify-center ${config.bgColor} border-2 ${config.borderColor}`}
              >
                <Icon className={`w-3 h-3 ${config.color}`} />
              </div>

              {/* Goal card */}
              <motion.button
                onClick={() => onGoalClick?.(goal.id)}
                disabled={!onGoalClick}
                className={`
                  w-full text-left p-3 rounded-lg border transition-all
                  ${config.bgColor} ${config.borderColor}
                  ${onGoalClick ? 'cursor-pointer hover:bg-gray-700/50' : 'cursor-default'}
                `}
                whileHover={onGoalClick ? { x: 4 } : undefined}
                whileTap={onGoalClick ? { scale: 0.98 } : undefined}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-200 truncate">
                      {goal.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      {goal.projectName && (
                        <span className="text-xs text-gray-500">{goal.projectName}</span>
                      )}
                      {goal.contextName && (
                        <>
                          <ChevronRight className="w-3 h-3 text-gray-600" />
                          <span className="text-xs text-gray-500">{goal.contextName}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {showDates && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 flex-shrink-0">
                      <Calendar className="w-3 h-3" />
                      {formatDate(goal.completedAt || goal.createdAt)}
                    </div>
                  )}
                </div>
              </motion.button>
            </motion.div>
          );
        })}
      </div>

      {/* Show more indicator */}
      {maxItems && goals.length > maxItems && (
        <div className="relative pl-10 mt-4">
          <div className="absolute left-2 w-5 h-5 rounded-full flex items-center justify-center bg-gray-700">
            <span className="text-xs text-gray-400">+{goals.length - maxItems}</span>
          </div>
          <span className="text-xs text-gray-500">more goals</span>
        </div>
      )}
    </div>
  );
}

/**
 * Compact horizontal timeline for dashboards
 */
export function GoalsProgressBar({
  total,
  completed,
  inProgress,
  className = '',
}: {
  total: number;
  completed: number;
  inProgress: number;
  className?: string;
}) {
  if (total === 0) return null;

  const completedPercent = (completed / total) * 100;
  const inProgressPercent = (inProgress / total) * 100;

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="h-2 w-full bg-gray-700 rounded-full overflow-hidden flex">
        <motion.div
          className="h-full bg-green-500"
          initial={{ width: 0 }}
          animate={{ width: `${completedPercent}%` }}
          transition={{ duration: 0.5 }}
        />
        <motion.div
          className="h-full bg-blue-500"
          initial={{ width: 0 }}
          animate={{ width: `${inProgressPercent}%` }}
          transition={{ duration: 0.5, delay: 0.2 }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-400">
        <span>{completed} completed</span>
        <span>{total - completed - inProgress} pending</span>
      </div>
    </div>
  );
}

export default GoalsTimeline;
