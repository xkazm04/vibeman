/**
 * Questions API Client
 * Client-side functions for interacting with the Questions API
 */

import { DbQuestion, DbContext, DbContextGroup } from '@/app/db';

// SQLite-based context types
export interface SqliteContextsResponse {
  success: boolean;
  contexts: DbContext[];
  groups: DbContextGroup[];
  error?: string;
}

export interface GroupedContexts {
  group: DbContextGroup;
  contexts: DbContext[];
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
      error: error.error || 'Failed to fetch contexts'
    };
  }

  const contextsData = await contextsRes.json();
  const groupsData = await groupsRes.json();

  return {
    success: true,
    contexts: contextsData.data?.contexts || contextsData.contexts || [],
    groups: groupsData.data || groupsData.groups || []
  };
}

/**
 * Group contexts by their context group
 * Returns an array of { group, contexts } for UI rendering
 */
export function groupContextsByGroup(
  contexts: DbContext[],
  groups: DbContextGroup[]
): GroupedContexts[] {
  // Create a map of group ID to group
  const groupMap = new Map(groups.map(g => [g.id, g]));

  // Group contexts by group_id (handle both snake_case DB and camelCase API response)
  const contextsByGroup = new Map<string, DbContext[]>();
  const ungroupedContexts: DbContext[] = [];

  for (const context of contexts) {
    // Support both snake_case (direct DB) and camelCase (API response) property names
    const groupId = context.group_id || (context as unknown as { groupId?: string }).groupId;
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
        project_id: ungroupedContexts[0]?.project_id || '',
        name: 'Ungrouped',
        color: '#6B7280', // gray-500
        accent_color: null,
        position: 999,
        type: null,
        icon: null,
        created_at: '',
        updated_at: ''
      },
      contexts: ungroupedContexts
    });
  }

  return result;
}
