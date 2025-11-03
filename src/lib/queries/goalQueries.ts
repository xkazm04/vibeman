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
  context_id: string | null;
  order_index: number;
  title: string;
  description: string | null;
  status: 'open' | 'in_progress' | 'done' | 'rejected' | 'undecided';
  created_at: string;
  updated_at: string;
}

/**
 * Convert database goal to app Goal type
 */
const convertDbGoalToGoal = (dbGoal: DbGoal): Goal => ({
  id: dbGoal.id,
  projectId: dbGoal.project_id,
  contextId: dbGoal.context_id || undefined,
  order: dbGoal.order_index,
  title: dbGoal.title,
  description: dbGoal.description || undefined,
  status: dbGoal.status,
  created_at: dbGoal.created_at,
  updated_at: dbGoal.updated_at,
});

/**
 * Create cache-busting URL
 */
function createNoCacheUrl(url: string): string {
  return `${url}&_t=${Date.now()}`;
}

/**
 * Execute fetch with cache bypass
 */
async function fetchNoCache(url: string): Promise<Response> {
  return fetch(createNoCacheUrl(url), {
    cache: 'no-cache',
    headers: {
      'Cache-Control': 'no-cache'
    }
  });
}

/**
 * Execute POST request with JSON body
 */
async function postJSON(url: string, body: unknown): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

/**
 * Execute PUT request with JSON body
 */
async function putJSON(url: string, body: unknown): Promise<Response> {
  return fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

/**
 * Execute DELETE request
 */
async function deleteRequest(url: string): Promise<Response> {
  return fetch(url, {
    method: 'DELETE',
  });
}

// API Functions
export const goalApi = {
  // Fetch goals for a project
  fetchGoals: async (projectId: string): Promise<Goal[]> => {
    const response = await fetchNoCache(`/api/goals?projectId=${encodeURIComponent(projectId)}`);

    if (!response.ok) {
      throw new Error('Failed to fetch goals');
    }

    const data = await response.json();
    return data.goals.map(convertDbGoalToGoal);
  },

  // Fetch a single goal by ID
  fetchGoalById: async (goalId: string): Promise<Goal> => {
    const response = await fetchNoCache(`/api/goals?id=${encodeURIComponent(goalId)}`);

    if (!response.ok) {
      throw new Error('Failed to fetch goal');
    }

    const data = await response.json();
    return convertDbGoalToGoal(data.goal);
  },

  // Create a new goal
  createGoal: async (params: {
    projectId: string;
    title: string;
    description?: string;
    status?: 'open' | 'in_progress' | 'done' | 'rejected' | 'undecided';
    orderIndex?: number;
    contextId?: string;
  }): Promise<Goal> => {
    const response = await postJSON('/api/goals', {
      projectId: params.projectId,
      title: params.title,
      description: params.description,
      status: params.status || 'open',
      orderIndex: params.orderIndex,
      contextId: params.contextId
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
    status?: 'open' | 'in_progress' | 'done' | 'rejected' | 'undecided';
    orderIndex?: number;
    contextId?: string;
  }): Promise<Goal> => {
    const response = await putJSON('/api/goals', {
      id: params.id,
      title: params.title,
      description: params.description,
      status: params.status,
      orderIndex: params.orderIndex,
      contextId: params.contextId
    });

    if (!response.ok) {
      throw new Error('Failed to update goal');
    }

    const data = await response.json();
    return convertDbGoalToGoal(data.goal);
  },

  // Delete a goal
  deleteGoal: async (goalId: string): Promise<void> => {
    const response = await deleteRequest(`/api/goals?id=${encodeURIComponent(goalId)}`);

    if (!response.ok) {
      throw new Error('Failed to delete goal');
    }
  },
};
