'use client';

import React, { createContext, useContext, useCallback, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Goal } from '@/types';
import { goalApi, goalKeys } from '@/lib/queries/goalQueries';

/**
 * GoalContext State
 */
interface GoalContextState {
  // Data
  goals: Goal[];
  loading: boolean;
  error: string | null;

  // Query states
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;

  // Actions
  fetchGoals: () => void;
  fetchGoalById: (goalId: string) => Promise<Goal | null>;
  createGoal: (goalData: Omit<Goal, 'id' | 'order'>) => Promise<Goal | null>;
  updateGoal: (goalId: string, updates: Partial<Goal>) => Promise<Goal | null>;
  deleteGoal: (goalId: string) => Promise<boolean>;
  reorderGoals: (reorderedGoals: Goal[]) => Promise<void>;
  clearError: () => void;
}

/**
 * Default context value
 */
const defaultContextValue: GoalContextState = {
  goals: [],
  loading: false,
  error: null,
  isCreating: false,
  isUpdating: false,
  isDeleting: false,
  fetchGoals: () => {},
  fetchGoalById: async () => null,
  createGoal: async () => null,
  updateGoal: async () => null,
  deleteGoal: async () => false,
  reorderGoals: async () => {},
  clearError: () => {},
};

/**
 * Create the context
 */
const GoalContext = createContext<GoalContextState>(defaultContextValue);

/**
 * GoalProvider props
 */
interface GoalProviderProps {
  projectId: string | null;
  children: ReactNode;
}

/**
 * GoalProvider Component
 *
 * Provides centralized goal state management for all goal-related components.
 * Uses React Query for data fetching and caching.
 */
export function GoalProvider({ projectId, children }: GoalProviderProps) {
  const queryClient = useQueryClient();

  // Query for fetching goals
  const {
    data: goals = [],
    isLoading: loading,
    error: queryError,
    refetch: fetchGoals,
  } = useQuery({
    queryKey: goalKeys.byProject(projectId || ''),
    queryFn: () => goalApi.fetchGoals(projectId!),
    enabled: !!projectId,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 35 * 60 * 1000, // 35 minutes
  });

  // Mutation for creating goals
  const createGoalMutation = useMutation({
    mutationFn: goalApi.createGoal,
    onSuccess: () => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: goalKeys.byProject(projectId) });
      }
    },
  });

  // Mutation for updating goals
  const updateGoalMutation = useMutation({
    mutationFn: goalApi.updateGoal,
    onSuccess: () => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: goalKeys.byProject(projectId) });
      }
    },
  });

  // Mutation for deleting goals
  const deleteGoalMutation = useMutation({
    mutationFn: goalApi.deleteGoal,
    onSuccess: () => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: goalKeys.byProject(projectId) });
      }
    },
  });

  // Action: Fetch a goal by ID
  const fetchGoalById = useCallback(async (goalId: string): Promise<Goal | null> => {
    try {
      const goal = await goalApi.fetchGoalById(goalId);
      return goal;
    } catch (error) {
      return null;
    }
  }, []);

  // Action: Create a new goal
  const createGoal = useCallback(async (goalData: Omit<Goal, 'id' | 'order'>): Promise<Goal | null> => {
    if (!projectId) return null;

    try {
      const result = await createGoalMutation.mutateAsync({
        projectId,
        title: goalData.title,
        description: goalData.description,
        status: goalData.status,
        contextId: goalData.contextId,
      });
      return result;
    } catch (error) {
      return null;
    }
  }, [projectId, createGoalMutation]);

  // Action: Update a goal
  const updateGoal = useCallback(async (goalId: string, updates: Partial<Goal>): Promise<Goal | null> => {
    try {
      const result = await updateGoalMutation.mutateAsync({
        id: goalId,
        title: updates.title,
        description: updates.description,
        status: updates.status,
        orderIndex: updates.order,
        contextId: updates.contextId,
      });
      return result;
    } catch (error) {
      return null;
    }
  }, [updateGoalMutation]);

  // Action: Delete a goal
  const deleteGoal = useCallback(async (goalId: string): Promise<boolean> => {
    try {
      await deleteGoalMutation.mutateAsync(goalId);
      return true;
    } catch (error) {
      return false;
    }
  }, [deleteGoalMutation]);

  // Action: Reorder goals
  const reorderGoals = useCallback(async (reorderedGoals: Goal[]): Promise<void> => {
    try {
      // Update order in database for each goal
      const updatePromises = reorderedGoals.map((goal, index) =>
        updateGoal(goal.id, { order: index + 1 })
      );

      await Promise.all(updatePromises);
    } catch (error) {
      // Silently fail - errors are handled by individual updateGoal calls
    }
  }, [updateGoal]);

  // Action: Clear error
  const clearError = useCallback(() => {
    if (projectId) {
      queryClient.invalidateQueries({ queryKey: goalKeys.byProject(projectId) });
    }
  }, [projectId, queryClient]);

  // Convert query error to string
  const error = queryError ?
    (queryError instanceof Error ? queryError.message : 'An error occurred') :
    null;

  // Context value
  const contextValue: GoalContextState = {
    goals,
    loading,
    error,
    isCreating: createGoalMutation.isPending,
    isUpdating: updateGoalMutation.isPending,
    isDeleting: deleteGoalMutation.isPending,
    fetchGoals,
    fetchGoalById,
    createGoal,
    updateGoal,
    deleteGoal,
    reorderGoals,
    clearError,
  };

  return (
    <GoalContext.Provider value={contextValue}>
      {children}
    </GoalContext.Provider>
  );
}

/**
 * useGoalContext Hook
 *
 * Access goal state and actions from any component within GoalProvider.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { goals, loading, createGoal } = useGoalContext();
 *
 *   const handleCreate = async () => {
 *     await createGoal({ title: 'New Goal', status: 'open' });
 *   };
 *
 *   return <div>{goals.length} goals</div>;
 * }
 * ```
 */
export function useGoalContext(): GoalContextState {
  const context = useContext(GoalContext);

  if (context === defaultContextValue && process.env.NODE_ENV === 'development') {
    console.warn('useGoalContext must be used within a GoalProvider');
  }

  return context;
}

/**
 * Export the context for advanced use cases
 */
export { GoalContext };
