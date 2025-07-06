import { Goal } from '../../types';

// Query Keys
export const goalKeys = {
  all: ['goals'] as const,
  byProject: (projectId: string) => ['goals', projectId] as const,
};

// Database goal structure (as returned by the API)
interface DbGoal {
  id: string;
  project_id: string;
  order_index: number;
  title: string;
  description: string | null;
  status: 'open' | 'in_progress' | 'done';
  created_at: string;
  updated_at: string;
}

// Convert database goal to app Goal type
const convertDbGoalToGoal = (dbGoal: DbGoal): Goal => ({
  id: dbGoal.id,
  order: dbGoal.order_index,
  title: dbGoal.title,
  description: dbGoal.description || undefined,
  status: dbGoal.status,
  created_at: dbGoal.created_at,
  updated_at: dbGoal.updated_at,
});

// API Functions
export const goalApi = {
  // Fetch goals for a project
  fetchGoals: async (projectId: string): Promise<Goal[]> => {
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
    return data.goals.map(convertDbGoalToGoal);
  },

  // Create a new goal
  createGoal: async (params: {
    projectId: string;
    title: string;
    description?: string;
    status?: 'open' | 'in_progress' | 'done';
    orderIndex?: number;
  }): Promise<Goal> => {
    const response = await fetch('/api/goals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId: params.projectId,
        title: params.title,
        description: params.description,
        status: params.status || 'open',
        orderIndex: params.orderIndex
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create goal');
    }

    const data = await response.json();
    return convertDbGoalToGoal(data.goal);
  },

  // Update a goal
  updateGoal: async (params: {
    id: string;
    title?: string;
    description?: string;
    status?: 'open' | 'in_progress' | 'done';
    orderIndex?: number;
  }): Promise<Goal> => {
    const response = await fetch('/api/goals', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: params.id,
        title: params.title,
        description: params.description,
        status: params.status,
        orderIndex: params.orderIndex
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to update goal');
    }

    const data = await response.json();
    return convertDbGoalToGoal(data.goal);
  },

  // Delete a goal
  deleteGoal: async (goalId: string): Promise<void> => {
    const response = await fetch(`/api/goals?id=${encodeURIComponent(goalId)}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete goal');
    }
  },
}; 