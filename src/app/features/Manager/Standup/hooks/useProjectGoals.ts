/**
 * useProjectGoals Hook
 * Manages goal fetching and state for project review
 */

import { useState, useEffect, useCallback } from 'react';
import type { GoalItem, GoalStatus } from '../types';
import { Goal } from '@/types';

interface UseProjectGoalsResult {
  goals: GoalItem[];
  openGoals: GoalItem[];
  inProgressGoals: GoalItem[];
  isLoading: boolean;
  expandedGoalId: string | null;
  editingGoalId: string | null;
  editingStatus: GoalStatus | null;
  setExpandedGoalId: (id: string | null) => void;
  startEditing: (goalId: string, currentStatus: GoalStatus) => void;
  cancelEditing: () => void;
  setEditingStatus: (status: GoalStatus) => void;
  saveStatus: () => Promise<void>;
  addGoal: (
    goalData: Omit<Goal, 'id' | 'order' | 'projectId'>,
    projectPath: string
  ) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useProjectGoals(projectId: string): UseProjectGoalsResult {
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editingStatus, setEditingStatus] = useState<GoalStatus | null>(null);

  // Fetch goals for this project
  const fetchGoals = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/goals?projectId=${projectId}`);
      if (response.ok) {
        const data = await response.json();
        const activeGoals = (data.goals || []).filter(
          (g: GoalItem) => g.status === 'open' || g.status === 'in_progress'
        );
        setGoals(activeGoals);
      }
    } catch (error) {
      console.error('Error fetching goals:', error);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const startEditing = useCallback((goalId: string, currentStatus: GoalStatus) => {
    setEditingGoalId(goalId);
    setEditingStatus(currentStatus);
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingGoalId(null);
    setEditingStatus(null);
  }, []);

  const saveStatus = useCallback(async () => {
    if (!editingGoalId || !editingStatus) return;

    try {
      const response = await fetch('/api/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingGoalId,
          status: editingStatus,
        }),
      });

      if (response.ok) {
        setGoals(prev =>
          prev.map(g =>
            g.id === editingGoalId ? { ...g, status: editingStatus } : g
          )
        );
        cancelEditing();
      }
    } catch (error) {
      console.error('Error updating goal:', error);
    }
  }, [editingGoalId, editingStatus, cancelEditing]);

  const addGoal = useCallback(
    async (
      goalData: Omit<Goal, 'id' | 'order' | 'projectId'>,
      projectPath: string
    ) => {
      try {
        const response = await fetch('/api/goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            title: goalData.title,
            description: goalData.description,
            status: goalData.status || 'open',
            contextId: goalData.contextId,
            createAnalysis: true,
            projectPath,
          }),
        });

        if (response.ok) {
          await fetchGoals();
        }
      } catch (error) {
        console.error('Error adding goal:', error);
      }
    },
    [projectId, fetchGoals]
  );

  const openGoals = goals.filter(g => g.status === 'open');
  const inProgressGoals = goals.filter(g => g.status === 'in_progress');

  return {
    goals,
    openGoals,
    inProgressGoals,
    isLoading,
    expandedGoalId,
    editingGoalId,
    editingStatus,
    setExpandedGoalId,
    startEditing,
    cancelEditing,
    setEditingStatus,
    saveStatus,
    addGoal,
    refetch: fetchGoals,
  };
}
