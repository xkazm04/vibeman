'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  GitBranch,
  Clock,
  CheckCircle,
  XCircle,
  Play,
  Settings,
  MoreVertical,
  Zap,
  TestTube,
} from 'lucide-react';
import type { DbCIPipeline } from '@/app/db/models/autonomous-ci.types';
import BuildStatusBadge from './BuildStatusBadge';
import {
  getStatusColors,
  formatDuration,
  formatTimeAgo,
  calculatePipelineHealth,
  getHealthLabel,
  getTriggerLabel,
} from '../lib/ciHelpers';

interface PipelineCardProps {
  pipeline: DbCIPipeline;
  onSelect?: (id: string) => void;
  onStartBuild?: (id: string) => void;
  onConfigure?: (id: string) => void;
  isSelected?: boolean;
}

export default function PipelineCard({
  pipeline,
  onSelect,
  onStartBuild,
  onConfigure,
  isSelected,
}: PipelineCardProps) {
  const colors = getStatusColors(pipeline.last_build_status);
  const health = calculatePipelineHealth(
    pipeline.success_rate,
    pipeline.average_build_time,
    600000, // 10 minutes default max
    pipeline.flaky_tests_count
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.01 }}
      className={`relative p-4 rounded-xl border backdrop-blur-sm transition-all cursor-pointer ${
        isSelected
          ? 'bg-white/10 border-amber-500/50 ring-1 ring-amber-500/30'
          : 'bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20'
      }`}
      onClick={() => onSelect?.(pipeline.id)}
      data-testid={`pipeline-card-${pipeline.id}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg bg-gradient-to-br ${colors.gradient} bg-opacity-20`}
          >
            <GitBranch className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white truncate max-w-[200px]">
              {pipeline.name}
            </h3>
            <p className="text-xs text-gray-400">
              {getTriggerLabel(pipeline.trigger_type)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <BuildStatusBadge status={pipeline.last_build_status} size="sm" />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3 mb-3">
        <div className="text-center">
          <div className="text-lg font-bold text-white">
            {Math.round(pipeline.success_rate)}%
          </div>
          <div className="text-xs text-gray-500">Success</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-white">
            {pipeline.total_builds}
          </div>
          <div className="text-xs text-gray-500">Builds</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-white">
            {formatDuration(pipeline.average_build_time)}
          </div>
          <div className="text-xs text-gray-500">Avg Time</div>
        </div>
        <div className="text-center">
          <div
            className={`text-lg font-bold ${
              health >= 70 ? 'text-emerald-400' : health >= 50 ? 'text-amber-400' : 'text-red-400'
            }`}
          >
            {health}
          </div>
          <div className="text-xs text-gray-500">Health</div>
        </div>
      </div>

      {/* Coverage and flaky tests */}
      <div className="flex items-center gap-4 mb-3 text-sm">
        {pipeline.current_coverage !== null && (
          <div className="flex items-center gap-1.5">
            <TestTube className="w-4 h-4 text-cyan-400" />
            <span className="text-gray-300">{pipeline.current_coverage}% coverage</span>
          </div>
        )}
        {pipeline.flaky_tests_count > 0 && (
          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-amber-400">
              {pipeline.flaky_tests_count} flaky test{pipeline.flaky_tests_count > 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Last run and description */}
      {pipeline.last_run && (
        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
          <Clock className="w-3 h-3" />
          <span>Last run: {formatTimeAgo(pipeline.last_run)}</span>
        </div>
      )}

      {pipeline.description && (
        <p className="text-xs text-gray-400 line-clamp-2 mb-3">
          {pipeline.description}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-white/10">
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStartBuild?.(pipeline.id);
            }}
            disabled={pipeline.last_build_status === 'running'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
              bg-emerald-500/20 text-emerald-400 border border-emerald-500/40
              hover:bg-emerald-500/30 transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid={`start-build-btn-${pipeline.id}`}
          >
            <Play className="w-3.5 h-3.5" />
            Run
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onConfigure?.(pipeline.id);
            }}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
            data-testid={`configure-pipeline-btn-${pipeline.id}`}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* Health label */}
        <span
          className={`text-xs font-medium ${
            health >= 70 ? 'text-emerald-400' : health >= 50 ? 'text-amber-400' : 'text-red-400'
          }`}
        >
          {getHealthLabel(health)}
        </span>
      </div>

      {/* Active indicator */}
      {pipeline.is_active === 0 && (
        <div className="absolute top-2 right-2 px-2 py-0.5 rounded text-xs bg-gray-500/30 text-gray-400">
          Inactive
        </div>
      )}

      {/* Self-healing indicator */}
      {pipeline.is_self_healing === 1 && (
        <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-purple-500/20 text-purple-400 border border-purple-500/30">
          <Zap className="w-3 h-3" />
          Self-healing
        </div>
      )}
    </motion.div>
  );
}
