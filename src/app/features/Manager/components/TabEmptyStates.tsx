'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  FileCheck,
  CheckCircle2,
  ArrowRight,
  GitBranch,
  Code,
} from 'lucide-react';

interface TabEmptyStateProps {
  tab: 'review';
  className?: string;
}

/**
 * TabEmptyStates - Contextual empty states for Manager tabs
 */
export default function TabEmptyState({
  className = '',
}: TabEmptyStateProps) {
  return <ReviewEmptyState className={className} />;
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

