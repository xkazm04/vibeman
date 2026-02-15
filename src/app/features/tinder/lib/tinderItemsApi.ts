/**
 * API functions for unified Tinder-style evaluation (Ideas + Directions)
 */

import {
  TinderItem,
  TinderFilterMode,
  TinderItemsResponse,
  isIdeaItem,
  isDirectionItem
} from './tinderTypes';

// In-flight accept tracking to prevent double-submission for directions.
// Key is directionId, value is the pending promise.
const inflightTinderAccepts = new Map<string, Promise<{ success: boolean; requirementName?: string; error?: string }>>();

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
    if (parseError instanceof Error && parseError.message.includes(' - ')) {
      throw parseError;
    }
    throw new Error(`${defaultMessage} (Status: ${response.status})`);
  }
}

/**
 * Fetch tinder items (ideas and/or directions) in batches
 */
export async function fetchTinderItems(
  projectId: string | undefined,
  itemType: TinderFilterMode = 'both',
  offset: number = 0,
  limit: number = 20,
  category?: string | null
): Promise<TinderItemsResponse> {
  const params = new URLSearchParams({
    offset: offset.toString(),
    limit: limit.toString(),
    itemType,
  });

  if (projectId && projectId !== 'all') {
    params.append('projectId', projectId);
  }

  // Add category filter for ideas
  if (category && itemType === 'ideas') {
    params.append('category', category);
  }

  const response = await fetch(`/api/tinder/items?${params.toString()}`);

  if (!response.ok) {
    await handleApiError(response, 'Failed to fetch items');
  }

  return response.json();
}

/**
 * Fetch idea categories with counts for filtering
 */
export interface CategoryCount {
  category: string;
  count: number;
}

export interface CategoriesResponse {
  categories: CategoryCount[];
  total: number;
}

export async function fetchIdeaCategories(
  projectId?: string,
  status: string = 'pending'
): Promise<CategoriesResponse> {
  const params = new URLSearchParams({ status });

  if (projectId && projectId !== 'all') {
    params.append('projectId', projectId);
  }

  const response = await fetch(`/api/ideas/categories?${params.toString()}`);

  if (!response.ok) {
    await handleApiError(response, 'Failed to fetch categories');
  }

  return response.json();
}

/**
 * Accept a tinder item (idea or direction).
 * Dispatches to the correct endpoint based on item type.
 *
 * For directions: concurrent calls for the same ID coalesce into one request.
 * 409 Conflict (already accepted) is treated as success.
 */
export async function acceptTinderItem(
  item: TinderItem,
  projectPath: string
): Promise<{ success: boolean; requirementName?: string; error?: string }> {
  if (isIdeaItem(item)) {
    // Accept idea via existing endpoint
    const response = await fetch('/api/ideas/tinder/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ideaId: item.data.id, projectPath }),
    });

    if (!response.ok) {
      await handleApiError(response, 'Failed to accept idea');
    }

    return response.json();
  } else if (isDirectionItem(item)) {
    const directionId = item.data.id;

    // Deduplicate concurrent calls for the same direction
    const existing = inflightTinderAccepts.get(directionId);
    if (existing) return existing;

    const promise = performAcceptDirection(directionId, projectPath);
    inflightTinderAccepts.set(directionId, promise);

    try {
      return await promise;
    } finally {
      inflightTinderAccepts.delete(directionId);
    }
  }

  throw new Error('Unknown item type');
}

async function performAcceptDirection(
  directionId: string,
  projectPath: string
): Promise<{ success: boolean; requirementName?: string; error?: string }> {
  const response = await fetch(`/api/directions/${directionId}/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectPath }),
  });

  // 409 Conflict means direction was already accepted — treat as success
  if (response.status === 409) {
    return { success: true };
  }

  if (!response.ok) {
    await handleApiError(response, 'Failed to accept direction');
  }

  return response.json();
}

/**
 * Reject a tinder item (idea or direction)
 * Dispatches to the correct endpoint based on item type
 */
export async function rejectTinderItem(
  item: TinderItem,
  projectPath?: string
): Promise<{ success: boolean }> {
  if (isIdeaItem(item)) {
    // Reject idea via existing endpoint
    const response = await fetch('/api/ideas/tinder/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ideaId: item.data.id, projectPath }),
    });

    if (!response.ok) {
      await handleApiError(response, 'Failed to reject idea');
    }

    return response.json();
  } else if (isDirectionItem(item)) {
    // Reject direction via PUT to update status
    const response = await fetch(`/api/directions/${item.data.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'rejected' }),
    });

    if (!response.ok) {
      await handleApiError(response, 'Failed to reject direction');
    }

    return { success: true };
  }

  throw new Error('Unknown item type');
}

/**
 * Delete a tinder item (idea or direction)
 * Dispatches to the correct endpoint based on item type
 */
export async function deleteTinderItem(item: TinderItem): Promise<{ success: boolean }> {
  if (isIdeaItem(item)) {
    // Delete idea
    const response = await fetch(`/api/ideas?id=${item.data.id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      await handleApiError(response, 'Failed to delete idea');
    }

    return response.json();
  } else if (isDirectionItem(item)) {
    // Delete direction
    const response = await fetch(`/api/directions/${item.data.id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      await handleApiError(response, 'Failed to delete direction');
    }

    return { success: true };
  }

  throw new Error('Unknown item type');
}

// In-flight pair accept tracking to prevent double-submission.
const inflightPairAccepts = new Map<string, Promise<{ success: boolean; requirementName?: string; error?: string }>>();

/**
 * Accept one variant from a direction pair.
 * Concurrent calls for the same pairId coalesce into one request.
 * 409 Conflict (already processed) is treated as success.
 */
export async function acceptPairVariant(
  pairId: string,
  variant: 'A' | 'B',
  projectPath: string
): Promise<{ success: boolean; requirementName?: string; error?: string }> {
  const key = `${pairId}:${variant}`;
  const existing = inflightPairAccepts.get(key);
  if (existing) return existing;

  const promise = (async () => {
    const response = await fetch(`/api/directions/pair/${pairId}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variant, projectPath }),
    });

    if (response.status === 409) {
      return { success: true };
    }

    if (!response.ok) {
      await handleApiError(response, 'Failed to accept direction variant');
    }

    return response.json();
  })();

  inflightPairAccepts.set(key, promise);
  try {
    return await promise;
  } finally {
    inflightPairAccepts.delete(key);
  }
}

/**
 * Reject both directions in a pair
 */
export async function rejectDirectionPair(pairId: string): Promise<{ success: boolean }> {
  const response = await fetch(`/api/directions/pair/${pairId}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    await handleApiError(response, 'Failed to reject direction pair');
  }

  return response.json();
}

/**
 * Delete both directions in a pair
 */
export async function deleteDirectionPair(pairId: string): Promise<{ success: boolean }> {
  const response = await fetch(`/api/directions/pair/${pairId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    await handleApiError(response, 'Failed to delete direction pair');
  }

  return response.json();
}

/**
 * Flush (permanently delete) pending items based on filter mode
 */
export async function flushTinderItems(
  projectId: string,
  itemType: TinderFilterMode
): Promise<{
  success: boolean;
  deletedCount: number;
  details: { ideas: number; directions: number };
  message: string;
}> {
  const response = await fetch('/api/tinder/flush', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, itemType }),
  });

  if (!response.ok) {
    await handleApiError(response, 'Failed to flush items');
  }

  return response.json();
}
