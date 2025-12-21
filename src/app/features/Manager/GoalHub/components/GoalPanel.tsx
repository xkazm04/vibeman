/**
 * Goal Panel Component
 * Displays compact list of goals with selection and status indicators
 */

'use client';

import { Target, ChevronRight, Plus, CheckCircle2, Clock, Circle, FileCode, Lightbulb } from 'lucide-react';
import type { ExtendedGoal } from '@/app/db/models/goal-hub.types';

interface GoalPanelProps {
  goals: ExtendedGoal[];
  activeGoal: ExtendedGoal | null;
  breakdownStatus?: Record<string, boolean>; // goalId -> hasBreakdownFile
  onSelectGoal: (goal: ExtendedGoal) => void;
  onNewGoal: () => void;
}

export default function GoalPanel({
  goals,
  activeGoal,
  breakdownStatus = {},
  onSelectGoal,
  onNewGoal,
}: GoalPanelProps) {
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

  // Group goals by status
  const inProgressGoals = goals.filter((g) => g.status === 'in_progress');
  const openGoals = goals.filter((g) => g.status === 'open');
  const doneGoals = goals.filter((g) => g.status === 'done');

  const renderGoalItem = (goal: ExtendedGoal) => {
    const isActive = activeGoal?.id === goal.id;
    const hasBreakdown = breakdownStatus[goal.id] || false;
    const hasHypotheses = (goal.hypothesesTotal || 0) > 0;

    return (
      <button
        key={goal.id}
        onClick={() => onSelectGoal(goal)}
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
          {/* Status indicators */}
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
            {isActive && (
              <ChevronRight className="w-4 h-4 text-cyan-400" />
            )}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 sticky top-24">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <Target className="w-4 h-4 text-cyan-400" />
          Goals
        </h3>
        <button
          onClick={onNewGoal}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto">
        {/* In Progress */}
        {inProgressGoals.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-cyan-400 uppercase tracking-wider mb-1.5">
              In Progress ({inProgressGoals.length})
            </h4>
            <div className="space-y-1">
              {inProgressGoals.map(renderGoalItem)}
            </div>
          </div>
        )}

        {/* Open */}
        {openGoals.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
              Open ({openGoals.length})
            </h4>
            <div className="space-y-1">
              {openGoals.map(renderGoalItem)}
            </div>
          </div>
        )}

        {/* Done */}
        {doneGoals.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-emerald-400 uppercase tracking-wider mb-1.5">
              Completed ({doneGoals.length})
            </h4>
            <div className="space-y-1">
              {doneGoals.map(renderGoalItem)}
            </div>
          </div>
        )}

        {/* Empty State */}
        {goals.length === 0 && (
          <div className="text-center py-8">
            <Target className="w-8 h-8 text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No goals yet</p>
            <button
              onClick={onNewGoal}
              className="mt-3 text-sm text-cyan-400 hover:text-cyan-300"
            >
              Create your first goal
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
