import { useState, useEffect, useCallback } from 'react';
import { Goal } from '@/types';
import { Database } from '@/lib/supabase';

type DbGoal = Database['public']['Tables']['goals']['Row'];

// Convert database goal to app Goal type
const convertDbGoalToGoal = (dbGoal: DbGoal): Goal => ({
  id: dbGoal.id,
  order: dbGoal.order_index,
  title: dbGoal.title,
  description: dbGoal.description || undefined,
  status: dbGoal.status
});

export const useGoals = (projectId: string | null) => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGoals = useCallback(async () => {
    if (!projectId) {
      setGoals([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/goals?projectId=${encodeURIComponent(projectId)}&_t=${Date.now()}`, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch goals');
      }

      const data = await response.json();
      const convertedGoals = data.goals.map(convertDbGoalToGoal);
      setGoals(convertedGoals);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch goals');
      console.error('Error fetching goals:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const createGoal = useCallback(async (goalData: Omit<Goal, 'id'>) => {
    if (!projectId) return null;

    try {
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          title: goalData.title,
          description: goalData.description,
          status: goalData.status,
          orderIndex: goalData.order
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create goal');
      }

      const data = await response.json();
      const newGoal = convertDbGoalToGoal(data.goal);
      
      setGoals(prev => [...prev, newGoal].sort((a, b) => a.order - b.order));
      return newGoal;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create goal');
      console.error('Error creating goal:', err);
      return null;
    }
  }, [projectId]);

  const updateGoal = useCallback(async (goalId: string, updates: Partial<Goal>) => {
    try {
      const response = await fetch('/api/goals', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: goalId,
          title: updates.title,
          description: updates.description,
          status: updates.status,
          orderIndex: updates.order
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update goal');
      }

      const data = await response.json();
      const updatedGoal = convertDbGoalToGoal(data.goal);
      
      setGoals(prev => 
        prev.map(goal => 
          goal.id === goalId ? updatedGoal : goal
        ).sort((a, b) => a.order - b.order)
      );
      
      return updatedGoal;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update goal');
      console.error('Error updating goal:', err);
      return null;
    }
  }, []);

  const deleteGoal = useCallback(async (goalId: string) => {
    try {
      const response = await fetch(`/api/goals?id=${encodeURIComponent(goalId)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete goal');
      }

      setGoals(prev => prev.filter(goal => goal.id !== goalId));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete goal');
      console.error('Error deleting goal:', err);
      return false;
    }
  }, []);

  const reorderGoals = useCallback(async (reorderedGoals: Goal[]) => {
    // Optimistic update
    setGoals(reorderedGoals);

    try {
      // Update order in database
      const updatePromises = reorderedGoals.map((goal, index) => 
        updateGoal(goal.id, { order: index + 1 })
      );
      
      await Promise.all(updatePromises);
    } catch (err) {
      // Revert on error
      fetchGoals();
      setError(err instanceof Error ? err.message : 'Failed to reorder goals');
      console.error('Error reordering goals:', err);
    }
  }, [updateGoal, fetchGoals]);

  // Fetch goals when projectId changes
  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  return {
    goals,
    loading,
    error,
    fetchGoals,
    createGoal,
    updateGoal,
    deleteGoal,
    reorderGoals,
    clearError: () => setError(null)
  };
}; 