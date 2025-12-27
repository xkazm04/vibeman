/**
 * AutomationStats Component
 * Mini stats display for automation metrics
 */

'use client';

import type { AutomationStatus } from '../types';
import { formatTimeUntil } from '../utils';

interface AutomationStatsProps {
  status: AutomationStatus | null;
}

export function AutomationStats({ status }: AutomationStatsProps) {
  return (
    <>
      {/* Stats Mini */}
      <div className="flex items-center gap-3 text-xs">
        <span className="text-gray-500">
          <span className="text-purple-400 font-medium">
            {status?.stats.goalsEvaluated || 0}
          </span>{' '}
          eval
        </span>
        <span className="text-gray-500">
          <span className="text-emerald-400 font-medium">
            {status?.stats.statusesUpdated || 0}
          </span>{' '}
          upd
        </span>
        <span className="text-gray-500">
          <span className="text-blue-400 font-medium">
            {status?.stats.tasksCreated || 0}
          </span>{' '}
          tasks
        </span>
      </div>

      {/* Next Run / Status */}
      <div className="text-xs text-gray-500">
        {status?.running ? (
          <span>
            Next: <span className="text-gray-300">{formatTimeUntil(status.nextRun)}</span>
          </span>
        ) : (
          <span className="text-gray-600">Paused</span>
        )}
      </div>
    </>
  );
}
