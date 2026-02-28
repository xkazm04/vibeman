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
// Entries auto-expire after INFLIGHT_TTL_MS to prevent stale promises on unmount/navigation.
const INFLIGHT_TTL_MS = 30_000;
const inflightTinderAccepts = new Map<string, Promise<AcceptResult>>();
const inflightTinderTimers = new Map<string, ReturnType<typeof setTimeout>>();

function trackInflight<T>(map: Map<string, Promise<T>>, timers: Map<string, ReturnType<typeof setTimeout>>, key: string, promise: Promise<T>): void {
  map.set(key, promise);
  // Auto-cleanup after TTL in case the await is abandoned (e.g., navigation/unmount)
  const timer = setTimeout(() => {
    map.delete(key);
    timers.delete(key);
  }, INFLIGHT_TTL_MS);
  timers.set(key, timer);
}

function clearInflight<T>(map: Map<string, Promise<T>>, timers: Map<string, ReturnType<typeof setTimeout>>, key: string): void {
  map.delete(key);
  const timer = timers.get(key);
  if (timer) {
    clearTimeout(timer);
    timers.delete(key);
  }
}

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
import type { CategoryCount } from './tinderTypes';

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
export interface PrerequisiteIdea {
  id: string;
  title: string;
  status: string;
  category: string;
}

export interface AcceptResult {
  success: boolean;
  requirementName?: string;
  error?: string;
  prerequisites?: PrerequisiteIdea[];
  unlocks?: PrerequisiteIdea[];
}

export async function acceptTinderItem(
  item: TinderItem,
  projectPath: string
): Promise<AcceptResult> {
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
    trackInflight(inflightTinderAccepts, inflightTinderTimers, directionId, promise);

    try {
      return await promise;
    } finally {
      clearInflight(inflightTinderAccepts, inflightTinderTimers, directionId);
    }
  }

  throw new Error('Unknown item type');
}

async function performAcceptDirection(
  directionId: string,
  projectPath: string
): Promise<AcceptResult> {
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
  projectPath?: string,
  rejectionReason?: string
): Promise<{ success: boolean }> {
  if (isIdeaItem(item)) {
    // Reject idea via existing endpoint (with optional reason)
    const response = await fetch('/api/ideas/tinder/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ideaId: item.data.id, projectPath, rejectionReason }),
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
const inflightPairAccepts = new Map<string, Promise<AcceptResult>>();
const inflightPairTimers = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Accept one variant from a direction pair.
 * Concurrent calls for the same pairId coalesce into one request.
 * 409 Conflict (already processed) is treated as success.
 */
export async function acceptPairVariant(
  pairId: string,
  variant: 'A' | 'B',
  projectPath: string
): Promise<AcceptResult> {
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

  trackInflight(inflightPairAccepts, inflightPairTimers, key, promise);
  try {
    return await promise;
  } finally {
    clearInflight(inflightPairAccepts, inflightPairTimers, key);
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
