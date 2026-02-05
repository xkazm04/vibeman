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
          <span className="text-gray-400 transition-colors duration-200">
            {reviewed} of {total} reviewed
          </span>
          <span className="text-gray-500 transition-colors duration-200">{remaining} remaining</span>
        </div>
        <div className="h-2 bg-gray-800/80 rounded-full overflow-hidden shadow-inner ring-1 ring-gray-700/30">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-500 via-purple-400 to-pink-500 shadow-sm shadow-purple-500/40"
            initial={{ width: 0 }}
            animate={{ width: `${percentComplete}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex items-center justify-center gap-4">
        {/* Accepted */}
        <div className="flex items-center gap-1.5 transition-all duration-200 hover:scale-105">
          <div className="p-1 bg-green-500/10 rounded transition-colors duration-200 hover:bg-green-500/20">
            <CheckCircle className="w-3 h-3 text-green-400" />
          </div>
          <span className="text-sm font-medium text-green-400 tabular-nums">{accepted}</span>
          <span className="text-xs text-gray-500">accepted</span>
        </div>

        {/* Rejected */}
        <div className="flex items-center gap-1.5 transition-all duration-200 hover:scale-105">
          <div className="p-1 bg-red-500/10 rounded transition-colors duration-200 hover:bg-red-500/20">
            <XCircle className="w-3 h-3 text-red-400" />
          </div>
          <span className="text-sm font-medium text-red-400 tabular-nums">{rejected}</span>
          <span className="text-xs text-gray-500">rejected</span>
        </div>

        {/* Deleted */}
        {deleted > 0 && (
          <div className="flex items-center gap-1.5 transition-all duration-200 hover:scale-105">
            <div className="p-1 bg-gray-500/10 rounded transition-colors duration-200 hover:bg-gray-500/20">
              <Trash2 className="w-3 h-3 text-gray-400" />
            </div>
            <span className="text-sm font-medium text-gray-400 tabular-nums">{deleted}</span>
            <span className="text-xs text-gray-500">deleted</span>
          </div>
        )}
      </div>

      {/* Accept Rate */}
      {reviewed > 0 && (
        <div className="flex items-center justify-center gap-2 text-xs text-gray-500 transition-colors duration-200">
          <TrendingUp className="w-3 h-3" />
          <span>
            Accept rate: <span className="text-purple-400 font-medium tabular-nums">{acceptRate}%</span>
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
      <div className="flex items-center gap-1 px-2 py-0.5 bg-green-500/10 rounded-full transition-all duration-200 hover:bg-green-500/20 hover:scale-105">
        <CheckCircle className="w-3 h-3 text-green-400" />
        <span className="text-xs font-medium text-green-400 tabular-nums">{accepted}</span>
      </div>
      <div className="flex items-center gap-1 px-2 py-0.5 bg-red-500/10 rounded-full transition-all duration-200 hover:bg-red-500/20 hover:scale-105">
        <XCircle className="w-3 h-3 text-red-400" />
        <span className="text-xs font-medium text-red-400 tabular-nums">{rejected}</span>
      </div>
    </div>
  );
}
