/**
 * API functions for Tinder-style idea evaluation
 */

import { DbIdea } from '@/app/db';

/**
 * Handle API response errors
 */
async function handleApiError(response: Response, defaultMessage: string): Promise<never> {
  try {
    const error = await response.json();
    const message = error.error || defaultMessage;
    const details = error.details ? ` - ${error.details}` : '';
    throw new Error(message + details);
  } catch (parseError) {
    // If JSON parsing fails, throw a generic error with status
    console.error('Failed to parse error response:', parseError);
    throw new Error(`${defaultMessage} (Status: ${response.status})`);
  }
}

/**
 * Fetch ideas in batches for Tinder evaluation
 */
export async function fetchIdeasBatch(
  projectId?: string,
  offset: number = 0,
  limit: number = 20
): Promise<{ ideas: DbIdea[]; hasMore: boolean; total: number }> {
  const params = new URLSearchParams({
    offset: offset.toString(),
    limit: limit.toString(),
    status: 'pending', // Only fetch pending ideas
  });

  if (projectId && projectId !== 'all') {
    params.append('projectId', projectId);
  }

  const response = await fetch(`/api/ideas/tinder?${params.toString()}`);

  if (!response.ok) {
    await handleApiError(response, 'Failed to fetch ideas');
  }

  return response.json();
}

/**
 * Accept an idea and generate requirement file
 */
export async function acceptIdea(
  ideaId: string,
  projectPath: string
): Promise<{ success: boolean; requirementName?: string; error?: string }> {
  const response = await fetch('/api/ideas/tinder/accept', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ideaId, projectPath }),
  });

  if (!response.ok) {
    await handleApiError(response, 'Failed to accept idea');
  }

  return response.json();
}

/**
 * Reject an idea
 */
export async function rejectIdea(ideaId: string, projectPath?: string): Promise<{ success: boolean }> {
  const response = await fetch('/api/ideas/tinder/reject', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ideaId, projectPath }),
  });

  if (!response.ok) {
    await handleApiError(response, 'Failed to reject idea');
  }

  return response.json();
}

/**
 * Delete an idea permanently
 */
export async function deleteIdea(ideaId: string): Promise<{ success: boolean }> {
  const response = await fetch(`/api/ideas?id=${ideaId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    await handleApiError(response, 'Failed to delete idea');
  }

  return response.json();
}
