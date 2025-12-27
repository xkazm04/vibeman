/**
 * GoalsList Component
 * Displays grouped lists of goals by status
 */

'use client';

import { Circle, Clock, Target, Plus } from 'lucide-react';
import { GoalCard } from './GoalCard';
import type { GoalItem, GoalStatus } from '../types';

interface GoalsListProps {
  goals: GoalItem[];
  openGoals: GoalItem[];
  inProgressGoals: GoalItem[];
  expandedGoalId: string | null;
  editingGoalId: string | null;
  editingStatus: GoalStatus | null;
  onToggleExpand: (goalId: string) => void;
  onStartEdit: (goalId: string, status: GoalStatus) => void;
  onCancelEdit: () => void;
  onStatusChange: (status: GoalStatus) => void;
  onSaveStatus: () => void;
  onAddGoal: () => void;
}

export function GoalsList({
  goals,
  openGoals,
  inProgressGoals,
  expandedGoalId,
  editingGoalId,
  editingStatus,
  onToggleExpand,
  onStartEdit,
  onCancelEdit,
  onStatusChange,
  onSaveStatus,
  onAddGoal,
}: GoalsListProps) {
  if (goals.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-800/30 rounded-xl border border-gray-700/50">
        <Target className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-400 mb-2">No Active Goals</h3>
        <p className="text-gray-500 mb-4">This project has no open or in-progress goals</p>
        <button
          onClick={onAddGoal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg border border-purple-500/40 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add First Goal
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* In Progress Section */}
      {inProgressGoals.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            In Progress ({inProgressGoals.length})
          </h3>
          <div className="space-y-2">
            {inProgressGoals.map(goal => (
              <GoalCard
                key={goal.id}
                goal={goal}
                isExpanded={expandedGoalId === goal.id}
                isEditing={editingGoalId === goal.id}
                editingStatus={editingGoalId === goal.id ? editingStatus : null}
                onToggleExpand={() => onToggleExpand(goal.id)}
                onStartEdit={() => onStartEdit(goal.id, goal.status)}
                onCancelEdit={onCancelEdit}
                onStatusChange={onStatusChange}
                onSaveStatus={onSaveStatus}
              />
            ))}
          </div>
        </div>
      )}

      {/* Open Section */}
      {openGoals.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
            <Circle className="w-4 h-4 text-gray-400" />
            Open ({openGoals.length})
          </h3>
          <div className="space-y-2">
            {openGoals.map(goal => (
              <GoalCard
                key={goal.id}
                goal={goal}
                isExpanded={expandedGoalId === goal.id}
                isEditing={editingGoalId === goal.id}
                editingStatus={editingGoalId === goal.id ? editingStatus : null}
                onToggleExpand={() => onToggleExpand(goal.id)}
                onStartEdit={() => onStartEdit(goal.id, goal.status)}
                onCancelEdit={onCancelEdit}
                onStatusChange={onStatusChange}
                onSaveStatus={onSaveStatus}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
