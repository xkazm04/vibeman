import { Goal } from '../../types';
import type { GoalResponse, GoalsListResponse, GoalMutationResponse } from '@/lib/api-types/goals';
import type { DbGoal } from '@/app/db/models/types';
import { safeResponseJson, parseApiResponse, GoalsListResponseSchema, GoalResponseSchema, GoalMutationResponseSchema } from '@/lib/apiResponseGuard';

// Query Keys
export const goalKeys = {
  all: ['goals'] as const,
  byProject: (projectId: string) => ['goals', projectId] as const,
};

/**
 * NAMING CONVENTION:
 * - Database layer uses snake_case: `order_index`, `project_id`, `context_id`
 * - Frontend layer uses camelCase: `order`, `projectId`, `contextId`
 * - API request params use camelCase: `orderIndex` (mapped to `order_index` in route)
 *
 * The mapping happens in two places:
 * 1. API route (route.ts): `orderIndex` param → `order_index` for DB
 * 2. This file: `order_index` from DB → `order` for frontend
 *
 * Response shapes are defined in `@/lib/api-types/goals` and shared
 * between the API routes and this consumer.
 */

/**
 * API request types for Goal operations
 * Uses camelCase consistently for all API calls
 */
export interface CreateGoalRequest {
  projectId: string;
  title: string;
  description?: string;
  status?: Goal['status'];
  /** Maps to `order_index` in database. Use this for ordering goals. */
  orderIndex?: number;
  contextId?: string;
}

export interface UpdateGoalRequest {
  id: string;
  title?: string;
  description?: string;
  status?: Goal['status'];
  /** Maps to `order_index` in database. Use this for reordering goals. */
  orderIndex?: number;
  contextId?: string;
}

/**
 * Convert database goal (snake_case) to app Goal type (camelCase)
 *
 * Key mapping: `order_index` (DB) → `order` (frontend)
 */
const convertDbGoalToGoal = (dbGoal: DbGoal): Goal => ({
  id: dbGoal.id,
  projectId: dbGoal.project_id,
  contextId: dbGoal.context_id || undefined,
  order: dbGoal.order_index,
  title: dbGoal.title,
  description: dbGoal.description || undefined,
  status: dbGoal.status,
  progress: dbGoal.progress ?? 0,
  targetDate: dbGoal.target_date ?? null,
  startedAt: dbGoal.started_at ?? null,
  completedAt: dbGoal.completed_at ?? null,
  githubItemId: dbGoal.github_item_id ?? null,
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

    const raw = await safeResponseJson(response, '/api/goals');
    const data = parseApiResponse(raw, GoalsListResponseSchema, '/api/goals');
    return (data.goals as unknown as DbGoal[]).map(convertDbGoalToGoal);
  },

  // Fetch a single goal by ID
  fetchGoalById: async (goalId: string): Promise<Goal> => {
    const response = await fetchNoCache(`/api/goals?id=${encodeURIComponent(goalId)}`);

    if (!response.ok) {
      throw new Error('Failed to fetch goal');
    }

    const raw = await safeResponseJson(response, '/api/goals');
    const data = parseApiResponse(raw, GoalResponseSchema, '/api/goals');
    return convertDbGoalToGoal(data.goal as unknown as DbGoal);
  },

  // Create a new goal
  createGoal: async (params: CreateGoalRequest): Promise<Goal> => {
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

    const raw = await safeResponseJson(response, '/api/goals POST');
    const data = parseApiResponse(raw, GoalMutationResponseSchema, '/api/goals POST');
    return convertDbGoalToGoal(data.goal as unknown as DbGoal);
  },

  // Update a goal
  updateGoal: async (params: UpdateGoalRequest): Promise<Goal> => {
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

    const raw = await safeResponseJson(response, '/api/goals PUT');
    const data = parseApiResponse(raw, GoalMutationResponseSchema, '/api/goals PUT');
    return convertDbGoalToGoal(data.goal as unknown as DbGoal);
  },

  // Delete a goal
  deleteGoal: async (goalId: string): Promise<void> => {
    const response = await deleteRequest(`/api/goals?id=${encodeURIComponent(goalId)}`);

    if (!response.ok) {
      throw new Error('Failed to delete goal');
    }
  },
};
