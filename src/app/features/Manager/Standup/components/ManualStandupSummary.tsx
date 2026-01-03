/**
 * ManualStandupSummary Component
 * Summary shown after completing daily review
 */

'use client';

import { CheckCircle2, Plus, RefreshCw, Minus } from 'lucide-react';
import type { DailyReviewSummary } from '../lib/dailyReviewTypes';

interface ManualStandupSummaryProps {
  summary: DailyReviewSummary;
}

export function ManualStandupSummary({ summary }: ManualStandupSummaryProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="p-2 bg-emerald-500/20 rounded-lg">
        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
      </div>

      <div className="flex-1">
        <h3 className="text-sm font-medium text-gray-200">Daily Review Complete</h3>
        <p className="text-xs text-gray-500">
          {summary.totalProjects} projects reviewed
        </p>
      </div>

      <div className="flex items-center gap-3 text-xs">
        {summary.newGoals > 0 && (
          <div className="flex items-center gap-1 text-emerald-400">
            <Plus className="w-3.5 h-3.5" />
            <span>{summary.newGoals} new</span>
          </div>
        )}
        {summary.goalUpdates > 0 && (
          <div className="flex items-center gap-1 text-blue-400">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{summary.goalUpdates} updates</span>
          </div>
        )}
        {summary.noChanges > 0 && (
          <div className="flex items-center gap-1 text-gray-500">
            <Minus className="w-3.5 h-3.5" />
            <span>{summary.noChanges} unchanged</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default ManualStandupSummary;
