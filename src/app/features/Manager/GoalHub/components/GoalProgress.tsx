/**
 * Goal Progress Component
 * Visual progress indicator for goal completion with segmented bar
 */

'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, Clock, Circle } from 'lucide-react';

interface GoalProgressProps {
  total: number;
  verified: number;
  inProgress: number;
}

export default function GoalProgress({ total, verified, inProgress }: GoalProgressProps) {
  const unverified = Math.max(0, total - verified - inProgress);
  const progress = total > 0 ? Math.round((verified / total) * 100) : 0;

  // Calculate segment widths as percentages
  const verifiedWidth = total > 0 ? (verified / total) * 100 : 0;
  const inProgressWidth = total > 0 ? (inProgress / total) * 100 : 0;

  if (total === 0) {
    return (
      <div className="flex items-center gap-3 py-2">
        <Circle className="w-4 h-4 text-gray-600" />
        <span className="text-sm text-gray-500">No hypotheses to track</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Segmented Progress Bar */}
      <div className="relative">
        <div className="h-3 bg-gray-800 rounded-full overflow-hidden flex">
          {/* Verified segment */}
          {verifiedWidth > 0 && (
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${verifiedWidth}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
            />
          )}
          {/* In Progress segment */}
          {inProgressWidth > 0 && (
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${inProgressWidth}%` }}
              transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
              className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400"
            />
          )}
        </div>

        {/* Progress percentage badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute -top-1 -right-1 px-2 py-0.5 bg-gray-900 border border-gray-700 rounded-full"
        >
          <span className={`text-xs font-bold ${progress >= 100 ? 'text-emerald-400' : 'text-white'}`}>
            {progress}%
          </span>
        </motion.div>
      </div>

      {/* Stats Pills */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-xs font-medium text-emerald-400">{verified}</span>
          <span className="text-xs text-emerald-400/70">verified</span>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded-full">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-xs font-medium text-cyan-400">{inProgress}</span>
          <span className="text-xs text-cyan-400/70">active</span>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-800 border border-gray-700 rounded-full">
          <Circle className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs font-medium text-gray-300">{unverified}</span>
          <span className="text-xs text-gray-500">pending</span>
        </div>
      </div>
    </div>
  );
}
