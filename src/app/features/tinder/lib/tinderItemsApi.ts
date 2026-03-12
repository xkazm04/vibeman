/**
 * API functions for unified Tinder-style evaluation (Ideas + Directions).
 *
 * Write operations (accept/reject/delete) go through the unified
 * POST /api/tinder/actions endpoint. Read operations use their
 * dedicated GET endpoints.
 */

import {
  TinderItem,
  TinderFilterMode,
  TinderItemsResponse,
  isIdeaItem,
  isDirectionItem,
  isDirectionPairItem,
  getTinderItemId,
} from './tinderTypes';
import type { CategoryCount, ScanTypeCount, ContextCountItem } from './tinderTypes';

// ---------------------------------------------------------------------------
// In-flight dedup (prevents double-submission on rapid clicks)
// ---------------------------------------------------------------------------

const INFLIGHT_TTL_MS = 30_000;
const inflightActions = new Map<string, Promise<ActionResult>>();
const inflightTimers = new Map<string, ReturnType<typeof setTimeout>>();

function trackInflight(key: string, promise: Promise<ActionResult>): void {
  inflightActions.set(key, promise);
  const timer = setTimeout(() => {
    inflightActions.delete(key);
    inflightTimers.delete(key);
  }, INFLIGHT_TTL_MS);
  inflightTimers.set(key, timer);
}

function clearInflight(key: string): void {
  inflightActions.delete(key);
  const timer = inflightTimers.get(key);
  if (timer) {
    clearTimeout(timer);
    inflightTimers.delete(key);
  }
}

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Unified action types
// ---------------------------------------------------------------------------

type ItemType = 'idea' | 'direction' | 'direction_pair';
type ActionType = 'accept' | 'reject' | 'delete';

export interface PrerequisiteIdea {
  id: string;
  title: string;
  status: string;
  category: string;
}

/** Result from any tinder action (accept/reject/delete) */
export interface ActionResult {
  success: boolean;
  requirementName?: string;
  requirementPath?: string;
  error?: string;
  prerequisites?: PrerequisiteIdea[];
  unlocks?: PrerequisiteIdea[];
  rejectedCount?: number;
  deletedCount?: number;
}

/** @deprecated Use ActionResult instead */
export type AcceptResult = ActionResult;

// ---------------------------------------------------------------------------
// Core unified action caller
// ---------------------------------------------------------------------------

async function tinderAction(
  itemType: ItemType,
  itemId: string,
  action: ActionType,
  projectPath?: string,
  metadata?: Record<string, unknown>
): Promise<ActionResult> {
  const response = await fetch('/api/tinder/actions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itemType, itemId, action, projectPath, metadata }),
  });

  // 409 Conflict (already processed) is treated as success
  if (response.status === 409) {
    return { success: true };
  }

  if (!response.ok) {
    await handleApiError(response, `Failed to ${action} ${itemType}`);
  }

  return response.json();
}

/** Resolve item type string from a TinderItem */
function resolveItemType(item: TinderItem): ItemType {
  if (isIdeaItem(item)) return 'idea';
  if (isDirectionPairItem(item)) return 'direction_pair';
  if (isDirectionItem(item)) return 'direction';
  throw new Error('Unknown item type');
}

// ---------------------------------------------------------------------------
// Read operations (unchanged — use dedicated GET endpoints)
// ---------------------------------------------------------------------------

/**
 * Fetch tinder items (ideas and/or directions) in batches.
 * Uses keyset pagination via `afterId` cursor instead of offset.
 */
export async function fetchTinderItems(
  projectId: string | undefined,
  itemType: TinderFilterMode = 'both',
  afterId: string | null = null,
  limit: number = 20,
  category?: string | null,
  effortRange?: [number, number] | null,
  riskRange?: [number, number] | null,
  sortOrder: 'asc' | 'desc' = 'asc',
  scanType?: string | null,
  contextId?: string | null,
): Promise<TinderItemsResponse> {
  const params = new URLSearchParams({
    limit: limit.toString(),
    itemType,
    sortOrder,
  });

  if (afterId) {
    params.append('after_id', afterId);
  }

  if (projectId && projectId !== 'all') {
    params.append('projectId', projectId);
  }

  if (category && itemType === 'ideas') {
    params.append('category', category);
  }

  if (scanType) {
    params.append('scanType', scanType);
  }

  if (contextId) {
    params.append('contextId', contextId);
  }

  if (effortRange) {
    params.append('effortMin', effortRange[0].toString());
    params.append('effortMax', effortRange[1].toString());
  }
  if (riskRange) {
    params.append('riskMin', riskRange[0].toString());
    params.append('riskMax', riskRange[1].toString());
  }

  const response = await fetch(`/api/tinder/items?${params.toString()}`);

  if (!response.ok) {
    await handleApiError(response, 'Failed to fetch items');
  }

  return response.json();
}

export interface CategoriesResponse {
  categories: CategoryCount[];
  total: number;
}

export interface ScanTypesResponse {
  scanTypes: ScanTypeCount[];
  total: number;
}

export async function fetchScanTypes(
  projectId?: string,
  status: string = 'pending'
): Promise<ScanTypesResponse> {
  const params = new URLSearchParams({ status });

  if (projectId && projectId !== 'all') {
    params.append('projectId', projectId);
  }

  const response = await fetch(`/api/ideas/scan-types?${params.toString()}`);

  if (!response.ok) {
    await handleApiError(response, 'Failed to fetch scan types');
  }

  return response.json();
}

export interface ContextCountsResponse {
  contexts: ContextCountItem[];
  total: number;
}

export async function fetchContextCounts(
  projectId?: string,
  status: string = 'pending'
): Promise<ContextCountsResponse> {
  const params = new URLSearchParams({ status });

  if (projectId && projectId !== 'all') {
    params.append('projectId', projectId);
  }

  const response = await fetch(`/api/ideas/context-counts?${params.toString()}`);

  if (!response.ok) {
    await handleApiError(response, 'Failed to fetch context counts');
  }

  return response.json();
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

// ---------------------------------------------------------------------------
// Write operations — unified via /api/tinder/actions
// ---------------------------------------------------------------------------

/**
 * Accept a tinder item (idea or direction).
 * For directions: concurrent calls for the same ID coalesce into one request.
 * 409 Conflict (already accepted) is treated as success.
 */
export async function acceptTinderItem(
  item: TinderItem,
  projectPath: string
): Promise<ActionResult> {
  const itemType = resolveItemType(item);
  const itemId = getTinderItemId(item);
  const key = `accept:${itemType}:${itemId}`;

  // Deduplicate concurrent calls
  const existing = inflightActions.get(key);
  if (existing) return existing;

  const promise = tinderAction(itemType, itemId, 'accept', projectPath);
  trackInflight(key, promise);

  try {
    return await promise;
  } finally {
    clearInflight(key);
  }
}

/**
 * Reject a tinder item (idea or direction).
 */
export async function rejectTinderItem(
  item: TinderItem,
  projectPath?: string,
  rejectionReason?: string
): Promise<ActionResult> {
  const itemType = resolveItemType(item);
  const itemId = getTinderItemId(item);
  return tinderAction(itemType, itemId, 'reject', projectPath, { rejectionReason });
}

/**
 * Delete a tinder item (idea or direction).
 */
export async function deleteTinderItem(item: TinderItem): Promise<ActionResult> {
  const itemType = resolveItemType(item);
  const itemId = getTinderItemId(item);
  return tinderAction(itemType, itemId, 'delete');
}

/**
 * Accept one variant from a direction pair.
 * Concurrent calls for the same pairId coalesce into one request.
 * 409 Conflict (already processed) is treated as success.
 */
export async function acceptPairVariant(
  pairId: string,
  variant: 'A' | 'B',
  projectPath: string
): Promise<ActionResult> {
  const key = `accept:direction_pair:${pairId}:${variant}`;
  const existing = inflightActions.get(key);
  if (existing) return existing;

  const promise = tinderAction('direction_pair', pairId, 'accept', projectPath, { variant });
  trackInflight(key, promise);

  try {
    return await promise;
  } finally {
    clearInflight(key);
  }
}

/**
 * Reject both directions in a pair.
 */
export async function rejectDirectionPair(pairId: string): Promise<ActionResult> {
  return tinderAction('direction_pair', pairId, 'reject');
}

/**
 * Delete both directions in a pair.
 */
export async function deleteDirectionPair(pairId: string): Promise<ActionResult> {
  return tinderAction('direction_pair', pairId, 'delete');
}

// ---------------------------------------------------------------------------
// Idea-specific helpers (used by useTinderIdeas hook)
// Thin wrappers around tinderAction for consumers that work with raw idea IDs
// rather than TinderItem objects.
// ---------------------------------------------------------------------------

/**
 * Fetch pending ideas in batches (ideas-only read path).
 */
export async function fetchIdeasBatch(
  projectId?: string,
  offset: number = 0,
  limit: number = 20
): Promise<{ ideas: import('@/app/db').DbIdea[]; hasMore: boolean; total: number }> {
  const params = new URLSearchParams({
    offset: offset.toString(),
    limit: limit.toString(),
    status: 'pending',
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
 * Accept a single idea by ID and project path.
 */
export async function acceptIdeaById(
  ideaId: string,
  projectPath: string
): Promise<ActionResult> {
  return tinderAction('idea', ideaId, 'accept', projectPath);
}

/**
 * Reject a single idea by ID.
 */
export async function rejectIdeaById(
  ideaId: string,
  projectPath?: string
): Promise<ActionResult> {
  return tinderAction('idea', ideaId, 'reject', projectPath);
}

/**
 * Delete a single idea by ID.
 */
export async function deleteIdeaById(ideaId: string): Promise<ActionResult> {
  return tinderAction('idea', ideaId, 'delete');
}

// ---------------------------------------------------------------------------
// Flush (bulk delete)
// ---------------------------------------------------------------------------

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
