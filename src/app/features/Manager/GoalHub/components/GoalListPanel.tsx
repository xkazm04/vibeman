/**
 * GoalListPanel Component
 * Displays goals grouped by status with selection and right-click context menu
 */

'use client';

import { useState, useCallback } from 'react';
import { Target, Plus } from 'lucide-react';
import type { ExtendedGoal } from '@/app/db/models/goal-hub.types';
import GoalListItem from './GoalListItem';
import GoalContextMenu from './GoalContextMenu';

interface GoalListPanelProps {
  goals: ExtendedGoal[];
  activeGoal: ExtendedGoal | null;
  breakdownStatus?: Record<string, boolean>;
  onSelectGoal: (goal: ExtendedGoal) => void;
  onNewGoal: () => void;
  onGoalDetails?: (goal: ExtendedGoal) => void;
}

export default function GoalListPanel({
  goals,
  activeGoal,
  breakdownStatus = {},
  onSelectGoal,
  onNewGoal,
  onGoalDetails,
}: GoalListPanelProps) {
  const [contextMenu, setContextMenu] = useState<{
    goal: ExtendedGoal;
    x: number;
    y: number;
  } | null>(null);

  // Group goals by status
  const inProgressGoals = goals.filter((g) => g.status === 'in_progress');
  const openGoals = goals.filter((g) => g.status === 'open');
  const doneGoals = goals.filter((g) => g.status === 'done');

  const handleContextMenu = useCallback((goal: ExtendedGoal, event: React.MouseEvent) => {
    event.preventDefault();
    setContextMenu({
      goal,
      x: event.clientX,
      y: event.clientY,
    });
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleViewDetails = useCallback(() => {
    if (contextMenu && onGoalDetails) {
      onGoalDetails(contextMenu.goal);
    }
    setContextMenu(null);
  }, [contextMenu, onGoalDetails]);

  const renderGoalGroup = (
    title: string,
    titleColor: string,
    groupGoals: ExtendedGoal[]
  ) => {
    if (groupGoals.length === 0) return null;

    return (
      <div>
        <h4 className={`text-xs font-medium ${titleColor} uppercase tracking-wider mb-1.5`}>
          {title} ({groupGoals.length})
        </h4>
        <div className="space-y-1">
          {groupGoals.map((goal) => (
            <GoalListItem
              key={goal.id}
              goal={goal}
              isActive={activeGoal?.id === goal.id}
              hasBreakdown={breakdownStatus[goal.id] || false}
              onSelect={onSelectGoal}
              onContextMenu={handleContextMenu}
            />
          ))}
        </div>
      </div>
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
        {renderGoalGroup('In Progress', 'text-cyan-400', inProgressGoals)}
        {renderGoalGroup('Open', 'text-gray-500', openGoals)}
        {renderGoalGroup('Completed', 'text-emerald-400', doneGoals)}

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

      {/* Context Menu */}
      {contextMenu && (
        <GoalContextMenu
          goal={contextMenu.goal}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={handleCloseContextMenu}
          onViewDetails={handleViewDetails}
        />
      )}
    </div>
  );
}
