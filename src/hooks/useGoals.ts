import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Goal } from '../types';
import { goalApi, goalKeys } from '../lib/queries/goalQueries';

export const useGoals = (projectId: string | null) => {
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
      // Refetch goals after successful creation
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: goalKeys.byProject(projectId) });
      }
    },
  });

  // Mutation for updating goals
  const updateGoalMutation = useMutation({
    mutationFn: goalApi.updateGoal,
    onSuccess: () => {
      // Refetch goals after successful update
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: goalKeys.byProject(projectId) });
      }
    },
  });

  // Mutation for deleting goals
  const deleteGoalMutation = useMutation({
    mutationFn: goalApi.deleteGoal,
    onSuccess: () => {
      // Refetch goals after successful deletion
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: goalKeys.byProject(projectId) });
      }
    },
  });

  // Helper functions
  const createGoal = async (goalData: Omit<Goal, 'id'>) => {
    if (!projectId) return null;

    try {
      const result = await createGoalMutation.mutateAsync({
        projectId,
        title: goalData.title,
        description: goalData.description,
        status: goalData.status,
        orderIndex: goalData.order,
      });
      return result;
    } catch (error) {
      console.error('Error creating goal:', error);
      return null;
    }
  };

  const updateGoal = async (goalId: string, updates: Partial<Goal>) => {
    try {
      const result = await updateGoalMutation.mutateAsync({
        id: goalId,
        title: updates.title,
        description: updates.description,
        status: updates.status,
        orderIndex: updates.order,
      });
      return result;
    } catch (error) {
      console.error('Error updating goal:', error);
      return null;
    }
  };

  const deleteGoal = async (goalId: string) => {
    try {
      await deleteGoalMutation.mutateAsync(goalId);
      return true;
    } catch (error) {
      console.error('Error deleting goal:', error);
      return false;
    }
  };

  const reorderGoals = async (reorderedGoals: Goal[]) => {
    try {
      // Update order in database for each goal
      const updatePromises = reorderedGoals.map((goal, index) => 
        updateGoal(goal.id, { order: index + 1 })
      );
      
      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Error reordering goals:', error);
    }
  };

  // Convert query error to string
  const error = queryError ? 
    (queryError instanceof Error ? queryError.message : 'An error occurred') : 
    null;

  return {
    goals,
    loading,
    error,
    fetchGoals,
    createGoal,
    updateGoal,
    deleteGoal,
    reorderGoals,
    clearError: () => {
      // Clear error by refetching
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: goalKeys.byProject(projectId) });
      }
    },
    // Expose mutation states for advanced use cases
    isCreating: createGoalMutation.isPending,
    isUpdating: updateGoalMutation.isPending,
    isDeleting: deleteGoalMutation.isPending,
  };
}; 