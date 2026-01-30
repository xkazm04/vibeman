/**
 * Questions API Client
 * Client-side functions for interacting with the Questions API
 */

import { DbQuestion } from '@/app/db';
import { Context, ContextGroup } from '@/lib/queries/contextQueries';

// ============================================================================
// API Response Types - Discriminated Unions for type-safe response handling
// ============================================================================

/**
 * Base success response shape for /api/contexts endpoint
 * Returns contexts and groups nested in data object
 */
interface ContextsApiSuccessResponse {
  success: true;
  data: {
    contexts: Context[];
    groups: ContextGroup[];
  };
}

/**
 * Base success response shape for /api/context-groups endpoint
 * Returns groups array directly in data
 */
interface ContextGroupsApiSuccessResponse {
  success: true;
  data: ContextGroup[];
}

/**
 * Error response shape for API failures
 */
interface ApiErrorResponse {
  success?: false;
  error: string;
}

/**
 * Type guard to check if contexts API response is successful
 * Validates the discriminated union at runtime
 */
function isContextsApiSuccess(response: unknown): response is ContextsApiSuccessResponse {
  if (typeof response !== 'object' || response === null) return false;
  const r = response as Record<string, unknown>;
  if (r.success !== true) return false;
  if (typeof r.data !== 'object' || r.data === null) return false;
  const data = r.data as Record<string, unknown>;
  return Array.isArray(data.contexts) && Array.isArray(data.groups);
}

/**
 * Type guard to check if context-groups API response is successful
 * Validates the discriminated union at runtime
 */
function isContextGroupsApiSuccess(response: unknown): response is ContextGroupsApiSuccessResponse {
  if (typeof response !== 'object' || response === null) return false;
  const r = response as Record<string, unknown>;
  return r.success === true && Array.isArray(r.data);
}

// ============================================================================
// Public Response Types
// ============================================================================

// SQLite-based context types - using camelCase Context type from contextQueries
export interface SqliteContextsResponse {
  success: boolean;
  contexts: Context[];
  groups: ContextGroup[];
  error?: string;
}

export interface GroupedContexts {
  group: ContextGroup;
  contexts: Context[];
}

export interface QuestionsResponse {
  success: boolean;
  questions: DbQuestion[];
  grouped: {
    contextMapId: string;
    contextMapTitle: string;
    questions: DbQuestion[];
  }[];
  counts: {
    pending: number;
    answered: number;
    total: number;
  };
}

export interface GenerateQuestionsResponse {
  success: boolean;
  requirementName: string;
  requirementPath: string;
  contextCount: number;
  expectedQuestions: number;
}

export interface ContextMapSetupResponse {
  success: boolean;
  skillPath: string;
  requirementPath: string;
  message: string;
}

/**
 * Fetch all questions for a project
 */
export async function fetchQuestions(
  projectId: string,
  options?: { status?: 'pending' | 'answered'; contextMapId?: string }
): Promise<QuestionsResponse> {
  const params = new URLSearchParams({ projectId });
  if (options?.status) params.append('status', options.status);
  if (options?.contextMapId) params.append('contextMapId', options.contextMapId);

  const response = await fetch(`/api/questions?${params.toString()}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch questions');
  }
  return response.json();
}

/**
 * Create a new question (typically called by Claude Code)
 */
export async function createQuestion(data: {
  project_id: string;
  context_map_id: string;
  context_map_title: string;
  question: string;
}): Promise<{ success: boolean; question: DbQuestion }> {
  const response = await fetch('/api/questions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create question');
  }
  return response.json();
}

/**
 * Answer a question (updates answer, marks as answered, auto-creates goal)
 */
export async function answerQuestion(
  questionId: string,
  answer: string
): Promise<{ success: boolean; question: DbQuestion; goal?: unknown; goalCreated: boolean }> {
  const response = await fetch(`/api/questions/${questionId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answer })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to answer question');
  }
  return response.json();
}

/**
 * Delete a question
 */
export async function deleteQuestion(questionId: string): Promise<{ success: boolean }> {
  const response = await fetch(`/api/questions/${questionId}`, {
    method: 'DELETE'
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete question');
  }
  return response.json();
}

/**
 * Generate Claude Code requirement for question generation
 * Uses SQLite context IDs to fetch context details from the database
 */
export async function generateQuestionRequirement(data: {
  projectId: string;
  projectName: string;
  projectPath: string;
  selectedContextIds: string[]; // SQLite context IDs
  questionsPerContext?: number;
}): Promise<GenerateQuestionsResponse> {
  const response = await fetch('/api/questions/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate requirement');
  }
  return response.json();
}

/**
 * Setup context map generator in target project
 * Copies the skill file and creates a requirement file
 */
export async function setupContextMapGenerator(projectPath: string): Promise<ContextMapSetupResponse> {
  const response = await fetch('/api/context-map/setup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectPath })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to setup context map generator');
  }
  return response.json();
}

/**
 * Fetch SQLite contexts and groups for a project
 * This replaces the JSON context map with proper database-backed contexts
 *
 * Returns camelCase Context and ContextGroup objects as transformed by the API layer.
 * Uses type guards to validate API response shapes at runtime.
 */
export async function fetchSqliteContexts(projectId: string): Promise<SqliteContextsResponse> {
  // Fetch contexts and groups in parallel
  const [contextsRes, groupsRes] = await Promise.all([
    fetch(`/api/contexts?projectId=${encodeURIComponent(projectId)}`),
    fetch(`/api/context-groups?projectId=${encodeURIComponent(projectId)}`)
  ]);

  if (!contextsRes.ok || !groupsRes.ok) {
    const error = !contextsRes.ok
      ? await contextsRes.json()
      : await groupsRes.json();
    return {
      success: false,
      contexts: [],
      groups: [],
      error: (error as ApiErrorResponse).error || 'Failed to fetch contexts'
    };
  }

  const contextsData: unknown = await contextsRes.json();
  const groupsData: unknown = await groupsRes.json();

  // Validate API response shapes using type guards
  if (!isContextsApiSuccess(contextsData)) {
    return {
      success: false,
      contexts: [],
      groups: [],
      error: 'Unexpected response shape from /api/contexts - expected { success: true, data: { contexts, groups } }'
    };
  }

  if (!isContextGroupsApiSuccess(groupsData)) {
    return {
      success: false,
      contexts: [],
      groups: [],
      error: 'Unexpected response shape from /api/context-groups - expected { success: true, data: ContextGroup[] }'
    };
  }

  // Type-safe access - no fallback chains needed
  return {
    success: true,
    contexts: contextsData.data.contexts,
    groups: groupsData.data
  };
}

/**
 * Group contexts by their context group
 * Returns an array of { group, contexts } for UI rendering
 *
 * Note: This function expects camelCase Context objects from the API.
 * The API layer transforms snake_case DB records to camelCase before returning.
 */
export function groupContextsByGroup(
  contexts: Context[],
  groups: ContextGroup[]
): GroupedContexts[] {
  // Create a map of group ID to group
  const groupMap = new Map(groups.map(g => [g.id, g]));

  // Group contexts by groupId (camelCase - consistent with API response format)
  const contextsByGroup = new Map<string, Context[]>();
  const ungroupedContexts: Context[] = [];

  for (const context of contexts) {
    const groupId = context.groupId;
    if (groupId && groupMap.has(groupId)) {
      const existing = contextsByGroup.get(groupId) || [];
      existing.push(context);
      contextsByGroup.set(groupId, existing);
    } else {
      ungroupedContexts.push(context);
    }
  }

  // Build result array, sorted by group position
  const result: GroupedContexts[] = [];

  // Add grouped contexts
  for (const group of groups.sort((a, b) => a.position - b.position)) {
    const groupContexts = contextsByGroup.get(group.id);
    if (groupContexts && groupContexts.length > 0) {
      result.push({
        group,
        contexts: groupContexts
      });
    }
  }

  // Add ungrouped contexts as a virtual group if any exist
  if (ungroupedContexts.length > 0) {
    result.push({
      group: {
        id: 'ungrouped',
        projectId: ungroupedContexts[0]?.projectId || '',
        name: 'Ungrouped',
        color: '#6B7280', // gray-500
        position: 999,
        type: null,
        icon: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      contexts: ungroupedContexts
    });
  }

  return result;
}
