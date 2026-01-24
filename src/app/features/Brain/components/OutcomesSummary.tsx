/**
 * Outcomes Summary Panel
 * Shows recent direction implementation outcomes and statistics
 */

'use client';

import { Target, CheckCircle, XCircle, RotateCcw, Clock } from 'lucide-react';
import { useBrainStore } from '@/stores/brainStore';

interface Props {
  isLoading: boolean;
}

export default function OutcomesSummary({ isLoading }: Props) {
  const { outcomeStats, recentOutcomes } = useBrainStore();

  if (isLoading) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-green-400" />
          <h2 className="text-lg font-semibold text-zinc-200">Implementation Outcomes</h2>
        </div>
        <div className="animate-pulse space-y-3">
          <div className="h-16 bg-zinc-800 rounded" />
          <div className="h-4 bg-zinc-800 rounded w-1/2" />
        </div>
      </div>
    );
  }

  const successRate = outcomeStats.total > 0
    ? Math.round((outcomeStats.successful / outcomeStats.total) * 100)
    : 0;

  return (
    <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-5 h-5 text-green-400" />
        <h2 className="text-lg font-semibold text-zinc-200">Implementation Outcomes</h2>
      </div>

      {outcomeStats.total === 0 ? (
        <p className="text-zinc-500 text-sm">
          No implementation outcomes tracked yet. Outcomes will appear here after directions are executed.
        </p>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 rounded-lg bg-zinc-800/30">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-xs text-zinc-500">Successful</span>
              </div>
              <span className="text-xl font-semibold text-green-400">
                {outcomeStats.successful}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-zinc-800/30">
              <div className="flex items-center gap-2 mb-1">
                <XCircle className="w-4 h-4 text-red-400" />
                <span className="text-xs text-zinc-500">Failed</span>
              </div>
              <span className="text-xl font-semibold text-red-400">
                {outcomeStats.failed}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-zinc-800/30">
              <div className="flex items-center gap-2 mb-1">
                <RotateCcw className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-zinc-500">Reverted</span>
              </div>
              <span className="text-xl font-semibold text-amber-400">
                {outcomeStats.reverted}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-zinc-800/30">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-zinc-400" />
                <span className="text-xs text-zinc-500">Pending</span>
              </div>
              <span className="text-xl font-semibold text-zinc-400">
                {outcomeStats.pending}
              </span>
            </div>
          </div>

          {/* Success Rate Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-zinc-500">Success Rate</span>
              <span className="text-xs font-medium text-zinc-300">{successRate}%</span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  successRate >= 80
                    ? 'bg-green-500'
                    : successRate >= 50
                    ? 'bg-amber-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${successRate}%` }}
              />
            </div>
          </div>

          {/* Recent Outcomes */}
          {recentOutcomes.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-zinc-400 mb-2">Recent</h3>
              <div className="space-y-1">
                {recentOutcomes.slice(0, 3).map((outcome) => (
                  <div
                    key={outcome.id}
                    className="flex items-center gap-2 text-xs"
                  >
                    {outcome.execution_success ? (
                      <CheckCircle className="w-3 h-3 text-green-400" />
                    ) : outcome.was_reverted ? (
                      <RotateCcw className="w-3 h-3 text-amber-400" />
                    ) : (
                      <XCircle className="w-3 h-3 text-red-400" />
                    )}
                    <span className="text-zinc-500 truncate">
                      {outcome.direction_id.slice(0, 20)}...
                    </span>
                    {outcome.user_satisfaction && (
                      <span className="ml-auto text-zinc-600">
                        {outcome.user_satisfaction}/5
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
