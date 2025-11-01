/**
 * Scan Idea Scoreboard Component
 * Displays a compact scoreboard showing aggregated stats per scan type
 * instead of individual scan items to prevent overflow
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { getScanTypeConfig } from '../lib/ScanTypeConfig';
import { QueueItem, ContextQueueItem } from '../../lib/scanTypes';
import { ScanType } from '../lib/ScanTypeConfig';

interface ScanIdeaScoreboardProps {
  items: (QueueItem | ContextQueueItem)[];
  totalIdeas: number;
  type: 'scan' | 'context';
}

interface ScanTypeStats {
  scanType: ScanType;
  total: number;
  completed: number;
  running: number;
  failed: number;
  pending: number;
  totalIdeas: number;
}

export default function ScanIdeaScoreboard({ items, totalIdeas, type }: ScanIdeaScoreboardProps) {
  // Group items by scan type and calculate stats
  const scanTypeStats = React.useMemo(() => {
    const statsMap = new Map<ScanType, ScanTypeStats>();

    items.forEach(item => {
      const existing = statsMap.get(item.scanType) || {
        scanType: item.scanType,
        total: 0,
        completed: 0,
        running: 0,
        failed: 0,
        pending: 0,
        totalIdeas: 0,
      };

      existing.total++;

      if (item.status === 'completed') {
        existing.completed++;
        existing.totalIdeas += item.ideaCount || 0;
      } else if (item.status === 'running') {
        existing.running++;
      } else if (item.status === 'failed') {
        existing.failed++;
      } else {
        existing.pending++;
      }

      statsMap.set(item.scanType, existing);
    });

    return Array.from(statsMap.values());
  }, [items]);

  const totalCompleted = items.filter(i => i.status === 'completed').length;
  const totalFailed = items.filter(i => i.status === 'failed').length;
  const progressPercentage = ((totalCompleted + totalFailed) / items.length) * 100;

  return (
    <motion.div
      className="mt-3 w-full"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
    >
      {/* Stats Row */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-400">
          Processing {totalCompleted} / {items.length} scans
        </span>
        <span className="text-xs font-semibold text-blue-400">
          {totalIdeas} ideas generated
        </span>
      </div>

      {/* Progress Bar - Full Width Thin Bar */}
      <div className="w-full h-1.5 bg-gray-700/40 rounded-full overflow-hidden relative mb-3">
        {/* Animated gradient background */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-cyan-500/20"
          animate={{
            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'linear'
          }}
        />

        {/* Progress fill */}
        <motion.div
          className="relative h-full bg-gradient-to-r from-blue-500 via-blue-400 to-cyan-500 shadow-lg shadow-blue-500/50"
          initial={{ width: 0 }}
          animate={{ width: `${progressPercentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
        </motion.div>
      </div>

      {/* Scoreboard - Scan Type Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {scanTypeStats.map((stats, index) => {
          const config = getScanTypeConfig(stats.scanType);
          const isActive = stats.running > 0;
          const isComplete = stats.completed === stats.total;
          const hasFailed = stats.failed > 0;

          return (
            <motion.div
              key={stats.scanType}
              className={`relative px-3 py-2 rounded-lg border transition-all ${
                isActive
                  ? 'bg-blue-500/10 border-blue-500/40 shadow-lg shadow-blue-500/20'
                  : isComplete && !hasFailed
                  ? 'bg-green-500/10 border-green-500/40'
                  : hasFailed
                  ? 'bg-red-500/10 border-red-500/40'
                  : 'bg-gray-700/20 border-gray-600/40'
              }`}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.05 }}
            >
              {/* Header: Emoji + Label */}
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-lg">{config?.emoji || '📋'}</span>
                <span className="text-xs font-semibold text-gray-300 truncate">
                  {config?.label || stats.scanType}
                </span>
              </div>

              {/* Status Icons Row */}
              <div className="flex items-center gap-1.5 mb-1.5">
                {stats.running > 0 && (
                  <div className="flex items-center gap-0.5">
                    <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />
                    <span className="text-[10px] font-mono text-blue-400">{stats.running}</span>
                  </div>
                )}
                {stats.completed > 0 && (
                  <div className="flex items-center gap-0.5">
                    <CheckCircle className="w-3 h-3 text-green-400" />
                    <span className="text-[10px] font-mono text-green-400">{stats.completed}</span>
                  </div>
                )}
                {stats.failed > 0 && (
                  <div className="flex items-center gap-0.5">
                    <XCircle className="w-3 h-3 text-red-400" />
                    <span className="text-[10px] font-mono text-red-400">{stats.failed}</span>
                  </div>
                )}
              </div>

              {/* Ideas Count */}
              {stats.totalIdeas > 0 && (
                <div className="text-xs font-bold text-cyan-400">
                  +{stats.totalIdeas} ideas
                </div>
              )}

              {/* Progress mini-bar */}
              <div className="mt-2 h-1 bg-gray-700/40 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full ${
                    isActive
                      ? 'bg-blue-400'
                      : isComplete && !hasFailed
                      ? 'bg-green-400'
                      : hasFailed
                      ? 'bg-red-400'
                      : 'bg-gray-500'
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${(stats.completed + stats.failed) / stats.total * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
