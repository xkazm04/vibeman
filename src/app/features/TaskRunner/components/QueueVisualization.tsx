'use client';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import type { ProjectRequirement } from '../lib/types';
import {
  isRequirementQueued,
  isRequirementRunning,
  isRequirementCompleted,
  isRequirementFailed,
  getRequirementStatusLabel,
  categorizeRequirementsByStatus,
} from '../lib/types';

interface QueueVisualizationProps {
  requirements: ProjectRequirement[];
  getRequirementId: (req: ProjectRequirement) => string;
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
  return getRequirementStatusLabel(status);
};

const categorizeRequirements = (requirements: ProjectRequirement[]) => {
  return categorizeRequirementsByStatus(requirements);
};

const getDisplayItems = (categorized: ReturnType<typeof categorizeRequirements>) => {
  return [
    ...categorized.running,
    ...categorized.queued,
    ...categorized.completed.slice(-3),
    ...categorized.failed.slice(-3),
  ].slice(0, 8); // Limit to 8 items to prevent overflow
};

export default function QueueVisualization({
  requirements,
  getRequirementId,
}: QueueVisualizationProps) {
  // Filter and categorize requirements
  const categorized = categorizeRequirements(requirements);
  const displayItems = getDisplayItems(categorized);

  if (displayItems.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      {/* Ambient Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-900/5 via-purple-900/5 to-cyan-900/5 rounded-lg blur-xl" />

      <div className="relative bg-gray-900/40 backdrop-blur-sm border border-gray-800/30 rounded-lg p-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Execution Queue
            </span>
          </div>
          <div className="flex items-center gap-2 ml-auto text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-400" />
              {categorized.queued.length}
            </span>
            <span className="flex items-center gap-1">
              <Loader2 className="w-3 h-3 text-blue-400" />
              {categorized.running.length}
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              {categorized.completed.length}
            </span>
            {categorized.failed.length > 0 && (
              <span className="flex items-center gap-1">
                <XCircle className="w-3 h-3 text-red-400" />
                {categorized.failed.length}
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
                    <div className="text-sm font-medium text-gray-300 truncate">
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
                          isRequirementRunning(item.status)
                            ? 'bg-blue-500/20 text-blue-400'
                            : isRequirementCompleted(item.status)
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : isRequirementFailed(item.status)
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }
                      `}
                    >
                      {getStatusLabel(item.status)}
                    </span>
                  </div>

                  {/* Running pulse effect */}
                  {isRequirementRunning(item.status) && (
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
        {(() => {
          const activeRequirements = requirements.filter(
            (r) =>
              isRequirementQueued(r.status) ||
              isRequirementRunning(r.status) ||
              isRequirementCompleted(r.status) ||
              isRequirementFailed(r.status)
          );
          return activeRequirements.length > displayItems.length && (
            <div className="flex items-center justify-center mt-2">
              <span className="text-[10px] text-gray-600 font-medium">
                + {activeRequirements.length - displayItems.length} more
              </span>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
