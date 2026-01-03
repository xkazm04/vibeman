/**
 * GoalListItem Component
 * Compact goal display with left-click selection and right-click modal
 */

'use client';

import { CheckCircle2, Clock, Circle, ChevronRight, FileCode, Lightbulb } from 'lucide-react';
import type { ExtendedGoal } from '@/app/db/models/goal-hub.types';

interface GoalListItemProps {
  goal: ExtendedGoal;
  isActive: boolean;
  hasBreakdown?: boolean;
  onSelect: (goal: ExtendedGoal) => void;
  onContextMenu: (goal: ExtendedGoal, event: React.MouseEvent) => void;
}

export default function GoalListItem({
  goal,
  isActive,
  hasBreakdown = false,
  onSelect,
  onContextMenu,
}: GoalListItemProps) {
  const getStatusIcon = (status: ExtendedGoal['status']) => {
    switch (status) {
      case 'done':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'in_progress':
        return <Clock className="w-4 h-4 text-cyan-400" />;
      default:
        return <Circle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: ExtendedGoal['status']) => {
    switch (status) {
      case 'done':
        return 'border-emerald-500/40 bg-emerald-500/5';
      case 'in_progress':
        return 'border-cyan-500/40 bg-cyan-500/5';
      default:
        return 'border-gray-700 bg-gray-900/50';
    }
  };

  const hasHypotheses = (goal.hypothesesTotal || 0) > 0;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onSelect(goal);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onContextMenu(goal, e);
  };

  return (
    <button
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      className={`w-full text-left py-1.5 px-2 rounded-lg border transition-colors ${
        isActive
          ? 'border-cyan-500 bg-cyan-500/10'
          : `${getStatusColor(goal.status)} hover:border-gray-600`
      }`}
    >
      <div className="flex items-center gap-2">
        {getStatusIcon(goal.status)}
        <div className="flex-1 min-w-0">
          <h4 className={`text-sm font-medium truncate ${isActive ? 'text-cyan-300' : 'text-white'}`}>
            {goal.title}
          </h4>
          {hasHypotheses && (
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-gray-500">
                {goal.hypothesesVerified}/{goal.hypothesesTotal}
              </span>
              <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden max-w-[80px]">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
                  style={{ width: `${goal.progress}%` }}
                />
              </div>
              <span className="text-xs text-gray-600">{goal.progress}%</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {hasBreakdown && (
            <span title="Breakdown file exists">
              <FileCode className="w-3 h-3 text-purple-400" />
            </span>
          )}
          {hasHypotheses && (
            <span title="Has hypotheses">
              <Lightbulb className="w-3 h-3 text-amber-400" />
            </span>
          )}
          {isActive && <ChevronRight className="w-4 h-4 text-cyan-400" />}
        </div>
      </div>
    </button>
  );
}
