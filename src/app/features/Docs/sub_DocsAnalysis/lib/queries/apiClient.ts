/**
 * API client functions for DocsAnalysis
 * Handles all HTTP requests to the backend
 */

import type { ContextGroup, Context } from '@/stores/contextStore';
import type { ContextGroupRelationship } from '@/lib/queries/contextQueries';

/**
 * Fetch project contexts and groups
 */
export async function fetchProjectContextData(projectId: string): Promise<{
  groups: ContextGroup[];
  contexts: Context[];
}> {
  const response = await fetch(`/api/contexts?projectId=${encodeURIComponent(projectId)}`);

  if (!response.ok) {
    throw new Error('Failed to fetch contexts and groups');
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch contexts');
  }

  // API returns { success, data: { contexts, groups } }
  return {
    groups: data.data?.groups || [],
    contexts: data.data?.contexts || [],
  };
}

/**
 * Fetch context group relationships
 */
export async function fetchRelationships(projectId: string): Promise<ContextGroupRelationship[]> {
  const response = await fetch(
    `/api/context-group-relationships?projectId=${encodeURIComponent(projectId)}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch relationships');
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch relationships');
  }

  return data.data || [];
}

/**
 * Update a context group
 */
export async function updateGroupApi(
  groupId: string,
  updates: { name?: string; type?: 'pages' | 'client' | 'server' | 'external' | null }
): Promise<ContextGroup> {
  const response = await fetch('/api/context-groups', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ groupId, updates }),
  });

  if (!response.ok) {
    throw new Error('Failed to update group');
  }

  const data = await response.json();
  return data.group;
}

/**
 * Create a relationship between groups
 */
export async function createRelationshipApi(data: {
  projectId: string;
  sourceGroupId: string;
  targetGroupId: string;
}): Promise<ContextGroupRelationship> {
  const response = await fetch('/api/context-group-relationships', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create relationship');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Delete a relationship
 */
export async function deleteRelationshipApi(relationshipId: string): Promise<boolean> {
  const response = await fetch(
    `/api/context-group-relationships?relationshipId=${encodeURIComponent(relationshipId)}`,
    { method: 'DELETE' }
  );

  if (!response.ok) {
    throw new Error('Failed to delete relationship');
  }

  return true;
}
