'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Trash2, TrendingUp } from 'lucide-react';

interface SwipeProgressProps {
  total: number;
  reviewed: number;
  accepted: number;
  rejected: number;
  deleted?: number;
  className?: string;
}

/**
 * SwipeProgress - Shows tinder-style review progress
 */
export default function SwipeProgress({
  total,
  reviewed,
  accepted,
  rejected,
  deleted = 0,
  className = '',
}: SwipeProgressProps) {
  const remaining = total - reviewed;
  const percentComplete = total > 0 ? Math.round((reviewed / total) * 100) : 0;
  const acceptRate = reviewed > 0 ? Math.round((accepted / reviewed) * 100) : 0;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">
            {reviewed} of {total} reviewed
          </span>
          <span className="text-gray-500">{remaining} remaining</span>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
            initial={{ width: 0 }}
            animate={{ width: `${percentComplete}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex items-center justify-center gap-4">
        {/* Accepted */}
        <div className="flex items-center gap-1.5">
          <div className="p-1 bg-green-500/10 rounded">
            <CheckCircle className="w-3 h-3 text-green-400" />
          </div>
          <span className="text-sm font-medium text-green-400">{accepted}</span>
          <span className="text-xs text-gray-500">accepted</span>
        </div>

        {/* Rejected */}
        <div className="flex items-center gap-1.5">
          <div className="p-1 bg-red-500/10 rounded">
            <XCircle className="w-3 h-3 text-red-400" />
          </div>
          <span className="text-sm font-medium text-red-400">{rejected}</span>
          <span className="text-xs text-gray-500">rejected</span>
        </div>

        {/* Deleted */}
        {deleted > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="p-1 bg-gray-500/10 rounded">
              <Trash2 className="w-3 h-3 text-gray-400" />
            </div>
            <span className="text-sm font-medium text-gray-400">{deleted}</span>
            <span className="text-xs text-gray-500">deleted</span>
          </div>
        )}
      </div>

      {/* Accept Rate */}
      {reviewed > 0 && (
        <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
          <TrendingUp className="w-3 h-3" />
          <span>
            Accept rate: <span className="text-purple-400 font-medium">{acceptRate}%</span>
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Compact inline progress indicator
 */
export function SwipeProgressCompact({
  current,
  total,
  className = '',
}: {
  current: number;
  total: number;
  className?: string;
}) {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="w-20 h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-purple-500"
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
      <span className="text-xs text-gray-400 font-mono">
        {current}/{total}
      </span>
    </div>
  );
}

/**
 * Mini stats badges
 */
export function SwipeStatsBadges({
  accepted,
  rejected,
  className = '',
}: {
  accepted: number;
  rejected: number;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1 px-2 py-0.5 bg-green-500/10 rounded-full">
        <CheckCircle className="w-3 h-3 text-green-400" />
        <span className="text-xs font-medium text-green-400">{accepted}</span>
      </div>
      <div className="flex items-center gap-1 px-2 py-0.5 bg-red-500/10 rounded-full">
        <XCircle className="w-3 h-3 text-red-400" />
        <span className="text-xs font-medium text-red-400">{rejected}</span>
      </div>
    </div>
  );
}
