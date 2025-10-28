'use client';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import type { ProjectRequirement } from '../lib/types';

interface QueueVisualizationProps {
  requirements: ProjectRequirement[];
  getRequirementId: (req: ProjectRequirement) => string;
}

export default function QueueVisualization({
  requirements,
  getRequirementId,
}: QueueVisualizationProps) {
  // Filter and categorize requirements
  const queuedItems = requirements.filter((r) => r.status === 'queued');
  const runningItems = requirements.filter((r) => r.status === 'running');
  const completedItems = requirements.filter((r) => r.status === 'completed');
  const failedItems = requirements.filter(
    (r) => r.status === 'failed' || r.status === 'session-limit'
  );

  // Combine for display: running, queued, recently completed/failed (last 3)
  const displayItems = [
    ...runningItems,
    ...queuedItems,
    ...completedItems.slice(-3),
    ...failedItems.slice(-3),
  ].slice(0, 8); // Limit to 8 items to prevent overflow

  if (displayItems.length === 0) {
    return null;
  }

  const getStatusIcon = (status: ProjectRequirement['status']) => {
    switch (status) {
      case 'running':
        return <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />;
      case 'completed':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
      case 'failed':
      case 'session-limit':
        return <XCircle className="w-3.5 h-3.5 text-red-400" />;
      case 'queued':
        return <Clock className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <AlertCircle className="w-3.5 h-3.5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: ProjectRequirement['status']) => {
    switch (status) {
      case 'running':
        return 'border-blue-500/50 bg-blue-500/10';
      case 'completed':
        return 'border-emerald-500/50 bg-emerald-500/10';
      case 'failed':
      case 'session-limit':
        return 'border-red-500/50 bg-red-500/10';
      case 'queued':
        return 'border-amber-500/50 bg-amber-500/10';
      default:
        return 'border-gray-600/50 bg-gray-700/10';
    }
  };

  const getStatusLabel = (status: ProjectRequirement['status']) => {
    switch (status) {
      case 'running':
        return 'Running';
      case 'completed':
        return 'Done';
      case 'failed':
        return 'Failed';
      case 'session-limit':
        return 'Limit';
      case 'queued':
        return 'Queued';
      default:
        return 'Idle';
    }
  };

  return (
    <div className="relative">
      {/* Ambient Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-900/5 via-purple-900/5 to-cyan-900/5 rounded-lg blur-xl" />

      <div className="relative bg-gray-900/40 backdrop-blur-sm border border-gray-800/30 rounded-lg p-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Execution Queue
            </span>
          </div>
          <div className="flex items-center gap-2 ml-auto text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-400" />
              {queuedItems.length}
            </span>
            <span className="flex items-center gap-1">
              <Loader2 className="w-3 h-3 text-blue-400" />
              {runningItems.length}
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              {completedItems.length}
            </span>
            {failedItems.length > 0 && (
              <span className="flex items-center gap-1">
                <XCircle className="w-3 h-3 text-red-400" />
                {failedItems.length}
              </span>
            )}
          </div>
        </div>

        {/* Queue Items */}
        <div className="flex items-center gap-2 overflow-x-hidden pb-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
          <AnimatePresence mode="popLayout">
            {displayItems.map((item) => {
              const itemId = getRequirementId(item);
              return (
                <motion.div
                  key={itemId}
                  initial={{ opacity: 0, scale: 0.8, x: -20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8, x: 20 }}
                  transition={{ duration: 0.2 }}
                  className={`
                    relative flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg border
                    transition-all duration-200
                    ${getStatusColor(item.status)}
                    min-w-[140px] max-w-[200px]
                  `}
                  title={`${item.projectName} / ${item.requirementName}`}
                >
                  {/* Status Icon */}
                  <div className="flex-shrink-0">{getStatusIcon(item.status)}</div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-gray-300 truncate">
                      {item.requirementName}
                    </div>
                    <div className="text-[10px] text-gray-500 truncate">
                      {item.projectName}
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex-shrink-0">
                    <span
                      className={`
                        text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded
                        ${
                          item.status === 'running'
                            ? 'bg-blue-500/20 text-blue-400'
                            : item.status === 'completed'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : item.status === 'failed' || item.status === 'session-limit'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }
                      `}
                    >
                      {getStatusLabel(item.status)}
                    </span>
                  </div>

                  {/* Running pulse effect */}
                  {item.status === 'running' && (
                    <motion.div
                      className="absolute inset-0 rounded-lg border-2 border-blue-500/30"
                      animate={{
                        opacity: [0.3, 0.6, 0.3],
                        scale: [1, 1.02, 1],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                    />
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Show indicator if there are more items */}
        {requirements.filter(
          (r) =>
            r.status === 'queued' ||
            r.status === 'running' ||
            r.status === 'completed' ||
            r.status === 'failed' ||
            r.status === 'session-limit'
        ).length > displayItems.length && (
          <div className="flex items-center justify-center mt-2">
            <span className="text-[10px] text-gray-600 font-medium">
              + {requirements.filter(
                (r) =>
                  r.status === 'queued' ||
                  r.status === 'running' ||
                  r.status === 'completed' ||
                  r.status === 'failed' ||
                  r.status === 'session-limit'
              ).length - displayItems.length}{' '}
              more
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
