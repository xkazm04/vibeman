/**
 * GoalsSummary Component
 * Summary cards showing goal counts by status
 */

'use client';

import { Circle, Clock } from 'lucide-react';

interface GoalsSummaryProps {
  openCount: number;
  inProgressCount: number;
}

export function GoalsSummary({ openCount, inProgressCount }: GoalsSummaryProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
        <div className="flex items-center gap-2 mb-1">
          <Circle className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-400">Open</span>
        </div>
        <div className="text-2xl font-bold text-white">{openCount}</div>
      </div>
      <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
        <div className="flex items-center gap-2 mb-1">
          <Clock className="w-4 h-4 text-amber-400" />
          <span className="text-sm text-gray-400">In Progress</span>
        </div>
        <div className="text-2xl font-bold text-white">{inProgressCount}</div>
      </div>
    </div>
  );
}
