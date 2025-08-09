import { useState, useEffect, useCallback } from 'react';
import { BackgroundTask, TaskCounts, QueueSettings } from '../types/backgroundTasks';

interface UseBackgroundTasksOptions {
  projectId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface BackgroundTasksState {
  tasks: BackgroundTask[];
  taskCounts: TaskCounts;
  isLoading: boolean;
  error: Error | null;
  isQueueActive: boolean;
  lastUpdated: Date | null;
  queueSettings: QueueSettings | null;
}

export function useBackgroundTasks(options: UseBackgroundTasksOptions = {}) {
  const { projectId, autoRefresh = false, refreshInterval = 5000 } = options;

  const [state, setState] = useState<BackgroundTasksState>({
    tasks: [],
    taskCounts: {
      pending: 0,
      processing: 0,
      completed: 0,
      error: 0,
      cancelled: 0
    },
    isLoading: false,
    error: null,
    isQueueActive: false,
    lastUpdated: null,
    queueSettings: null
  });

  const [refreshInterval_, setRefreshInterval_] = useState<NodeJS.Timeout | null>(null);

  // Fetch tasks from API
  const fetchTasks = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const params = new URLSearchParams();
      if (projectId) {
        params.append('projectId', projectId);
      }

      const response = await fetch(`/api/kiro/background-tasks?${params.toString()}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch background tasks');
      }

      setState(prev => ({
        ...prev,
        tasks: result.tasks || [],
        taskCounts: result.taskCounts || {
          pending: 0,
          processing: 0,
          completed: 0,
          error: 0,
          cancelled: 0
        },
        isQueueActive: result.queueSettings?.isActive || false,
        queueSettings: result.queueSettings || null,
        lastUpdated: new Date(),
        isLoading: false,
        error: null
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error : new Error('Unknown error occurred'),
        isLoading: false
      }));
    }
  }, [projectId]);

  // Create a new background task
  const createTask = useCallback(async (taskData: {
    projectId: string;
    projectName: string;
    projectPath: string;
    taskType: 'docs' | 'tasks' | 'goals' | 'context' | 'code';
    priority?: number;
    maxRetries?: number;
  }) => {
    try {
      const response = await fetch('/api/kiro/background-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to create background task');
      }

      // Refresh tasks after creating
      await fetchTasks();

      return result.task;
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to create background task');
    }
  }, [fetchTasks]);

  // Update task status
  const updateTask = useCallback(async (taskId: string, updates: {
    status?: 'pending' | 'processing' | 'completed' | 'error' | 'cancelled';
    errorMessage?: string;
    resultData?: any;
  }) => {
    try {
      const response = await fetch('/api/kiro/background-tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, ...updates })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to update background task');
      }

      // Refresh tasks after updating
      await fetchTasks();

      return result.task;
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to update background task');
    }
  }, [fetchTasks]);

  // Cancel a task
  const cancelTask = useCallback(async (taskId: string) => {
    try {
      const response = await fetch(`/api/kiro/background-tasks?taskId=${taskId}&action=cancel`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to cancel task');
      }

      // Refresh tasks after canceling
      await fetchTasks();

      return result.task;
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to cancel task');
    }
  }, [fetchTasks]);

  // Retry a task
  const retryTask = useCallback(async (taskId: string) => {
    try {
      const response = await fetch(`/api/kiro/background-tasks?taskId=${taskId}&action=retry`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to retry task');
      }

      // Refresh tasks after retrying
      await fetchTasks();

      return result.task;
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to retry task');
    }
  }, [fetchTasks]);

  // Delete a task
  const deleteTask = useCallback(async (taskId: string) => {
    try {
      const response = await fetch(`/api/kiro/background-tasks?taskId=${taskId}&action=delete`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete task');
      }

      // Refresh tasks after deleting
      await fetchTasks();

      return true;
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to delete task');
    }
  }, [fetchTasks]);

  // Clear completed tasks
  const clearCompleted = useCallback(async () => {
    try {
      const response = await fetch('/api/kiro/background-tasks?action=clear-completed', {
        method: 'DELETE'
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to clear completed tasks');
      }

      // Refresh tasks after clearing
      await fetchTasks();

      return true;
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to clear completed tasks');
    }
  }, [fetchTasks]);

  // Start auto-refresh
  const startAutoRefresh = useCallback(() => {
    if (refreshInterval_ || !autoRefresh) return;

    const interval = setInterval(fetchTasks, refreshInterval);
    setRefreshInterval_(interval);
  }, [refreshInterval_, autoRefresh, fetchTasks, refreshInterval]);

  // Stop auto-refresh
  const stopAutoRefresh = useCallback(() => {
    if (refreshInterval_) {
      clearInterval(refreshInterval_);
      setRefreshInterval_(null);
    }
  }, [refreshInterval_]);

  // Initial fetch and setup auto-refresh
  useEffect(() => {
    fetchTasks();

    if (autoRefresh) {
      startAutoRefresh();
    }

    return () => {
      stopAutoRefresh();
    };
  }, [fetchTasks, autoRefresh, startAutoRefresh, stopAutoRefresh]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshInterval_) {
        clearInterval(refreshInterval_);
      }
    };
  }, [refreshInterval_]);

  return {
    // State
    tasks: state.tasks,
    taskCounts: state.taskCounts,
    isLoading: state.isLoading,
    error: state.error,
    isQueueActive: state.isQueueActive,
    queueSettings: state.queueSettings,
    lastUpdated: state.lastUpdated,

    // Actions
    fetchTasks,
    createTask,
    updateTask,
    cancelTask,
    retryTask,
    deleteTask,
    clearCompleted,

    // Auto-refresh controls
    startAutoRefresh,
    stopAutoRefresh,
    isAutoRefreshing: refreshInterval_ !== null
  };
}