'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Target,
  FileCheck,
  CheckCircle2,
  Lightbulb,
  ArrowRight,
  Sparkles,
  TrendingUp,
  GitBranch,
  Code,
  Zap,
} from 'lucide-react';

interface TabEmptyStateProps {
  tab: 'goals' | 'review';
  onAction?: () => void;
  className?: string;
}

/**
 * TabEmptyStates - Contextual empty states for Manager tabs
 *
 * Each tab gets a visual explanation of what should appear there.
 */
export default function TabEmptyState({
  tab,
  onAction,
  className = '',
}: TabEmptyStateProps) {
  if (tab === 'goals') {
    return <GoalHubEmptyState onAction={onAction} className={className} />;
  }
  return <ReviewEmptyState className={className} />;
}

/**
 * Goal Hub empty state - explains goal-driven development
 */
function GoalHubEmptyState({
  onAction,
  className = '',
}: {
  onAction?: () => void;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col items-center py-16 px-8 ${className}`}
    >
      {/* Icon */}
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1 }}
        className="relative mb-8"
      >
        <div className="absolute inset-0 bg-cyan-500/20 blur-2xl rounded-full" />
        <div className="relative p-6 bg-gradient-to-br from-cyan-500/20 to-blue-500/10 rounded-2xl border border-cyan-500/30">
          <Target className="w-12 h-12 text-cyan-400" />
        </div>
      </motion.div>

      {/* Title */}
      <h2 className="text-2xl font-bold text-white mb-3">Goal Hub</h2>
      <p className="text-gray-400 text-center max-w-md mb-8">
        Track strategic objectives and their progress. Goals break down into
        hypotheses that become tasks for AI implementation.
      </p>

      {/* Visual Flow */}
      <div className="flex items-center gap-4 mb-8">
        <FlowStep
          icon={Target}
          label="Set Goal"
          color="cyan"
          delay={0.2}
        />
        <FlowArrow delay={0.3} />
        <FlowStep
          icon={Lightbulb}
          label="Add Hypotheses"
          color="amber"
          delay={0.4}
        />
        <FlowArrow delay={0.5} />
        <FlowStep
          icon={Zap}
          label="AI Executes"
          color="purple"
          delay={0.6}
        />
        <FlowArrow delay={0.7} />
        <FlowStep
          icon={TrendingUp}
          label="Track Progress"
          color="green"
          delay={0.8}
        />
      </div>

      {/* Example Card */}
      <ExampleGoalCard />

      {/* CTA */}
      {onAction && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          onClick={onAction}
          className="mt-8 px-6 py-3 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400
                     rounded-lg border border-cyan-500/30 transition-colors flex items-center gap-2"
        >
          <Target className="w-4 h-4" />
          Create First Goal
        </motion.button>
      )}
    </motion.div>
  );
}

/**
 * Review tab empty state - explains implementation review
 */
function ReviewEmptyState({ className = '' }: { className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col items-center py-16 px-8 ${className}`}
    >
      {/* Icon */}
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1 }}
        className="relative mb-8"
      >
        <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full" />
        <div className="relative p-6 bg-gradient-to-br from-emerald-500/20 to-green-500/10 rounded-2xl border border-emerald-500/30">
          <CheckCircle2 className="w-12 h-12 text-emerald-400" />
        </div>
      </motion.div>

      {/* Title */}
      <h2 className="text-2xl font-bold text-white mb-3">All Caught Up!</h2>
      <p className="text-gray-400 text-center max-w-md mb-8">
        No implementations waiting for review. When AI completes tasks, they
        appear here for your approval before being finalized.
      </p>

      {/* Visual Flow */}
      <div className="flex items-center gap-4 mb-8">
        <FlowStep
          icon={Code}
          label="AI Implements"
          color="purple"
          delay={0.2}
        />
        <FlowArrow delay={0.3} />
        <FlowStep
          icon={FileCheck}
          label="Review Changes"
          color="cyan"
          delay={0.4}
        />
        <FlowArrow delay={0.5} />
        <FlowStep
          icon={GitBranch}
          label="Accept/Reject"
          color="amber"
          delay={0.6}
        />
        <FlowArrow delay={0.7} />
        <FlowStep
          icon={CheckCircle2}
          label="Done"
          color="green"
          delay={0.8}
        />
      </div>

      {/* Example Preview */}
      <ExampleReviewCard />
    </motion.div>
  );
}

/**
 * Flow step component for visual explanation
 */
function FlowStep({
  icon: Icon,
  label,
  color,
  delay,
}: {
  icon: React.ElementType;
  label: string;
  color: 'cyan' | 'amber' | 'purple' | 'green';
  delay: number;
}) {
  const colorClasses = {
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    green: 'bg-green-500/10 text-green-400 border-green-500/30',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="flex flex-col items-center gap-2"
    >
      <div className={`p-3 rounded-xl border ${colorClasses[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <span className="text-xs text-gray-500 whitespace-nowrap">{label}</span>
    </motion.div>
  );
}

/**
 * Arrow between flow steps
 */
function FlowArrow({ delay }: { delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
    >
      <ArrowRight className="w-4 h-4 text-gray-600" />
    </motion.div>
  );
}

/**
 * Example goal card for empty state
 */
function ExampleGoalCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 0.6, y: 0 }}
      transition={{ delay: 0.5 }}
      className="w-full max-w-md p-4 bg-gray-800/30 border border-gray-700/30 rounded-xl"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 bg-cyan-500/10 rounded-lg">
          <Target className="w-5 h-5 text-cyan-400" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-medium text-gray-300 mb-1">
            Implement user authentication
          </h4>
          <p className="text-xs text-gray-500 mb-2">
            Add login, signup, and session management
          </p>
          <div className="flex items-center gap-3">
            {/* Progress bar */}
            <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                initial={{ width: 0 }}
                animate={{ width: '40%' }}
                transition={{ delay: 0.8, duration: 0.5 }}
              />
            </div>
            <span className="text-xs text-gray-500">2/5</span>
          </div>
          {/* Hypotheses preview */}
          <div className="mt-3 space-y-1">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <CheckCircle2 className="w-3 h-3 text-green-400" />
              <span className="line-through">Create auth API routes</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <CheckCircle2 className="w-3 h-3 text-green-400" />
              <span className="line-through">Add JWT token handling</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Build login form UI</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Example review card for empty state
 */
function ExampleReviewCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 0.5, y: 0 }}
      transition={{ delay: 0.5 }}
      className="w-full max-w-md p-4 bg-gray-800/20 border border-gray-700/20 rounded-xl"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 bg-purple-500/10 rounded-lg">
          <GitBranch className="w-5 h-5 text-purple-400/60" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-medium text-gray-400 mb-1">
            Add dark mode toggle
          </h4>
          <p className="text-xs text-gray-600 mb-2">
            Modified 3 files, +47 -12 lines
          </p>
          {/* Diff preview */}
          <div className="font-mono text-[10px] bg-gray-900/50 rounded p-2 space-y-0.5">
            <div className="text-green-400/50">+ const [theme, setTheme] = useState('dark');</div>
            <div className="text-green-400/50">+ const toggleTheme = () =&gt; ...</div>
            <div className="text-red-400/50">- // TODO: implement theme</div>
          </div>
          {/* Action buttons preview */}
          <div className="mt-3 flex gap-2">
            <div className="flex-1 px-3 py-1.5 bg-green-500/10 text-green-400/50 text-xs rounded text-center">
              Accept
            </div>
            <div className="flex-1 px-3 py-1.5 bg-red-500/10 text-red-400/50 text-xs rounded text-center">
              Reject
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Compact empty state for inline use
 */
export function CompactEmptyState({
  message,
  icon: Icon = Sparkles,
  className = '',
}: {
  message: string;
  icon?: React.ElementType;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center py-8 ${className}`}>
      <Icon className="w-8 h-8 text-gray-600 mb-3" />
      <p className="text-sm text-gray-500 text-center">{message}</p>
    </div>
  );
}

/**
 * Standup empty state - for when no goals are in progress
 */
export function StandupEmptyState({
  onAddGoal,
  className = '',
}: {
  onAddGoal?: () => void;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col items-center py-12 px-6 ${className}`}
    >
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        className="relative mb-6"
      >
        <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full" />
        <div className="relative p-5 bg-amber-500/10 rounded-2xl border border-amber-500/20">
          <Sparkles className="w-10 h-10 text-amber-400" />
        </div>
      </motion.div>

      <h3 className="text-xl font-semibold text-white mb-2">No Active Goals</h3>
      <p className="text-gray-400 text-center max-w-sm mb-6">
        Standup evaluates your active goals and suggests next actions.
        Create a goal to get started with AI-powered planning.
      </p>

      {onAddGoal && (
        <button
          onClick={onAddGoal}
          className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400
                     rounded-lg border border-amber-500/30 transition-colors text-sm"
        >
          Create Goal
        </button>
      )}
    </motion.div>
  );
}
