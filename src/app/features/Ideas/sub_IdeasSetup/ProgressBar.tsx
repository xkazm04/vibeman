/**
 * Progress Bar Component
 * Displays progress for scanning operations with individual item status
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, XCircle } from 'lucide-react';
import { getScanTypeConfig } from './lib/ScanTypeConfig';
import { QueueItem, ContextQueueItem } from '../lib/scanTypes';

interface ProgressBarProps {
  items: (QueueItem | ContextQueueItem)[];
  totalIdeas: number;
  type: 'scan' | 'context';
}

export default function ProgressBar({ items, totalIdeas, type }: ProgressBarProps) {
  const completedCount = items.filter(s => s.status === 'completed').length;
  const failedCount = items.filter(s => s.status === 'failed').length;
  const totalCount = items.length;
  const progressPercentage = ((completedCount + failedCount) / totalCount) * 100;

  return (
    <motion.div
      className="mt-3 w-full"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
    >
      {/* Stats Row */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-gray-400">
          Processing {completedCount} / {totalCount} scans
        </span>
        <span className="text-sm font-semibold text-blue-400">
          {totalIdeas} ideas generated
        </span>
      </div>
      
      {/* Progress Bar - Full Width Thin Bar */}
      <div className="w-full h-2 bg-gray-700/40 rounded-full overflow-hidden relative">
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
        
        {/* Segment separators */}
        {items.map((_, index) => {
          if (index === 0) return null;
          const position = (index / totalCount) * 100;
          return (
            <div
              key={`separator-${index}`}
              className="absolute top-0 bottom-0 w-[2px] bg-gray-900/60"
              style={{ left: `${position}%` }}
            />
          );
        })}
      </div>
      
      {/* Individual Item Status */}
      <div className="flex flex-wrap gap-2 mt-3">
        {items.map((item, index) => {
          const isContextItem = 'contextName' in item;
          const scanConfig = getScanTypeConfig(item.scanType);

          // For context items: show "Context - ScanType", for scan items: show "ScanType"
          const label = isContextItem
            ? `${item.contextName} - ${scanConfig?.label || item.scanType}`
            : scanConfig?.label || item.scanType;
          const emoji = scanConfig?.emoji || '📋';

          return (
            <motion.div
              key={`${isContextItem ? item.contextId : item.scanType}-${item.scanType}-${index}`}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                item.status === 'completed'
                  ? 'bg-green-500/20 border-green-500/40 text-green-300'
                  : item.status === 'failed'
                  ? 'bg-red-500/20 border-red-500/40 text-red-300'
                  : item.status === 'running'
                  ? 'bg-blue-500/20 border-blue-500/40 text-blue-300 shadow-lg shadow-blue-500/20'
                  : 'bg-gray-700/40 border-gray-600/40 text-gray-400'
              }`}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.05 }}
            >
              <span className="text-base">{emoji}</span>
              <span className="max-w-[200px] truncate">{label}</span>
              {item.status === 'running' && (
                <Loader2 className="w-3 h-3 animate-spin ml-1" />
              )}
              {item.status === 'completed' && item.ideaCount !== undefined && (
                <span className="ml-1 font-bold text-green-400">+{item.ideaCount}</span>
              )}
              {item.status === 'failed' && (
                <XCircle className="w-3 h-3 ml-1" />
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
