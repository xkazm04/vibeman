'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  GitCommit,
  User,
  FileCode,
  TestTube,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import type { DbBuildExecution } from '@/app/db/models/autonomous-ci.types';
import BuildStatusBadge from './BuildStatusBadge';
import {
  formatDuration,
  formatTimeAgo,
  formatTestResults,
  getTriggerLabel,
} from '../lib/ciHelpers';

interface BuildHistoryListProps {
  builds: DbBuildExecution[];
  onSelectBuild?: (build: DbBuildExecution) => void;
  showPipeline?: boolean;
  maxItems?: number;
}

export default function BuildHistoryList({
  builds,
  onSelectBuild,
  showPipeline = false,
  maxItems,
}: BuildHistoryListProps) {
  const displayBuilds = maxItems ? builds.slice(0, maxItems) : builds;

  if (builds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center" data-testid="build-history-empty">
        <GitCommit className="w-12 h-12 text-gray-500 mb-4" />
        <h3 className="text-lg font-medium text-gray-300 mb-1">No Builds Yet</h3>
        <p className="text-sm text-gray-500 max-w-sm">
          Start your first build to see the history here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2" data-testid="build-history-list">
      {displayBuilds.map((build, index) => (
        <motion.div
          key={build.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.03 }}
          onClick={() => onSelectBuild?.(build)}
          className={`p-3 rounded-lg border transition-all ${
            onSelectBuild
              ? 'cursor-pointer hover:bg-white/8 hover:border-white/20'
              : ''
          } ${
            build.was_predicted_failure
              ? 'bg-amber-500/5 border-amber-500/20'
              : 'bg-white/5 border-white/10'
          }`}
          data-testid={`build-item-${build.id}`}
        >
          <div className="flex items-start justify-between gap-4">
            {/* Left side - Build info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <BuildStatusBadge status={build.status} size="sm" />
                <span className="text-sm font-medium text-white">
                  #{build.build_number}
                </span>
                <span className="text-xs text-gray-500">
                  {getTriggerLabel(build.trigger)}
                </span>
                {build.was_predicted_failure === 1 && (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-amber-500/20 text-amber-400">
                    <AlertTriangle className="w-3 h-3" />
                    Predicted
                  </span>
                )}
              </div>

              {/* Commit info */}
              {(build.branch || build.commit_sha) && (
                <div className="flex items-center gap-3 text-xs text-gray-400 mb-1">
                  {build.branch && (
                    <span className="flex items-center gap-1">
                      <GitCommit className="w-3 h-3" />
                      {build.branch}
                    </span>
                  )}
                  {build.commit_sha && (
                    <code className="text-gray-500">
                      {build.commit_sha.slice(0, 7)}
                    </code>
                  )}
                  {build.author && (
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {build.author}
                    </span>
                  )}
                </div>
              )}

              {/* Commit message */}
              {build.commit_message && (
                <p className="text-sm text-gray-300 truncate mb-1">
                  {build.commit_message}
                </p>
              )}

              {/* Test results */}
              {build.test_count > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <TestTube className="w-3 h-3 text-gray-400" />
                  <span className="text-gray-400">
                    {formatTestResults(
                      build.test_count,
                      build.test_passed,
                      build.test_failures,
                      build.test_skipped
                    )}
                  </span>
                  {build.test_coverage !== null && (
                    <span className="text-cyan-400">
                      {build.test_coverage}% coverage
                    </span>
                  )}
                </div>
              )}

              {/* Error message */}
              {build.error_message && (
                <p className="text-xs text-red-400 mt-1 truncate">
                  {build.error_message}
                </p>
              )}
            </div>

            {/* Right side - Timing */}
            <div className="flex flex-col items-end gap-1 text-right shrink-0">
              <span className="text-sm font-medium text-white">
                {formatDuration(build.duration_ms)}
              </span>
              <span className="text-xs text-gray-500">
                {formatTimeAgo(build.created_at)}
              </span>
              {onSelectBuild && (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
            </div>
          </div>
        </motion.div>
      ))}

      {maxItems && builds.length > maxItems && (
        <div className="text-center py-2">
          <span className="text-xs text-gray-500">
            +{builds.length - maxItems} more builds
          </span>
        </div>
      )}
    </div>
  );
}
