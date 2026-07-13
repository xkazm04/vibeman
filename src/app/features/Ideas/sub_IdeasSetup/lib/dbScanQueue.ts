/**
 * DB-idea scan path (client).
 *
 * The primary Ideas-screen scan routes through the scan QUEUE so it produces
 * `ideas` rows the user can SEE as cards (Buffer/Kanban) — as opposed to the
 * Claude-Code path (executeClaudeCodeScan) which only writes requirement .md
 * files for TaskRunner and no idea rows.
 *
 * Flow: nudge the worker awake (it is not auto-started at boot) → enqueue one
 * queue item per (scanType × context) → poll the queue until every item is
 * terminal, reporting progress. Callers invalidate the ideas React-Query cache
 * on completion so the new cards appear.
 */

import type { ScanType } from '../../lib/scanTypes';

export interface DbScanQueueRequest {
  scanType: ScanType;
  contextId?: string;
}

export interface DbScanProgress {
  done: number;
  total: number;
  currentLabel: string;
  errors: number;
}

/** Terminal queue statuses — nothing more will happen to the item. */
const TERMINAL_STATUSES = new Set(['completed', 'failed', 'cancelled']);

/**
 * Expand the selected scan types × contexts into individual queue requests.
 * With no contexts selected, each scan type runs once at project scope
 * (contextId undefined). Pure + exported for unit testing.
 */
export function buildScanQueueRequests(
  scanTypes: ScanType[],
  contextIds: string[]
): DbScanQueueRequest[] {
  const targets: Array<string | undefined> = contextIds.length > 0 ? contextIds : [undefined];
  const requests: DbScanQueueRequest[] = [];
  for (const scanType of scanTypes) {
    for (const contextId of targets) {
      requests.push({ scanType, contextId });
    }
  }
  return requests;
}

/** Count how many of the given ids are in a terminal state, and tally errors. */
export function summarizeQueueProgress(
  queueItems: Array<{ id: string; status: string; scan_type?: string }>,
  enqueuedIds: string[]
): { done: number; errors: number; runningLabel: string } {
  const byId = new Map(queueItems.map(i => [i.id, i]));
  let done = 0;
  let errors = 0;
  let runningLabel = '';
  for (const id of enqueuedIds) {
    const item = byId.get(id);
    if (!item) continue;
    if (TERMINAL_STATUSES.has(item.status)) {
      done++;
      if (item.status === 'failed') errors++;
    } else if (!runningLabel && item.status === 'running') {
      runningLabel = item.scan_type ?? '';
    }
  }
  return { done, errors, runningLabel };
}

/**
 * Best-effort: ensure the scan-queue worker is running. The worker is not
 * auto-started at boot (only by watcher events or this endpoint), so enqueuing
 * without this would leave items sitting 'queued' forever.
 */
export async function ensureScanWorkerRunning(): Promise<void> {
  try {
    await fetch('/api/scan-queue/worker', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
  } catch {
    // Non-fatal — the enqueue below still nudges the worker via notifyNewItem.
  }
}

/**
 * Enqueue DB-idea scans. Returns the created queue item ids.
 * Throws if nothing could be enqueued.
 */
export async function enqueueDbScans(params: {
  projectId: string;
  requests: DbScanQueueRequest[];
  autoMergeEnabled?: boolean;
  signal?: AbortSignal;
}): Promise<string[]> {
  const { projectId, requests, autoMergeEnabled, signal } = params;

  await ensureScanWorkerRunning();

  const ids: string[] = [];
  for (const req of requests) {
    if (signal?.aborted) break;
    const res = await fetch('/api/scan-queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        scanType: req.scanType,
        contextId: req.contextId,
        triggerType: 'manual',
        autoMergeEnabled: autoMergeEnabled ?? false,
      }),
      signal,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || err?.error || `Failed to enqueue ${req.scanType} (HTTP ${res.status})`);
    }
    const data = await res.json();
    if (data?.queueItem?.id) ids.push(data.queueItem.id as string);
  }

  if (ids.length === 0) {
    throw new Error('No scans could be enqueued');
  }
  return ids;
}

/**
 * Poll the scan queue until every enqueued id reaches a terminal state.
 * Reports progress via onProgress. Resolves with the final error count.
 */
export async function pollScanQueueUntilDone(params: {
  projectId: string;
  enqueuedIds: string[];
  onProgress: (progress: DbScanProgress) => void;
  signal?: AbortSignal;
  intervalMs?: number;
  now?: () => number;
}): Promise<{ errors: number; completed: boolean }> {
  const { projectId, enqueuedIds, onProgress, signal, intervalMs = 1500 } = params;
  const total = enqueuedIds.length;

  // Emit an initial 0/total tick so the UI shows the bar immediately.
  onProgress({ done: 0, total, currentLabel: '', errors: 0 });

  while (!signal?.aborted) {
    let queueItems: Array<{ id: string; status: string; scan_type?: string }> = [];
    try {
      const res = await fetch(`/api/scan-queue?projectId=${encodeURIComponent(projectId)}`, { signal });
      if (res.ok) {
        const data = await res.json();
        queueItems = data.queueItems ?? [];
      }
    } catch {
      // Transient fetch error — keep polling.
    }

    const { done, errors, runningLabel } = summarizeQueueProgress(queueItems, enqueuedIds);
    onProgress({ done, total, currentLabel: runningLabel, errors });

    if (done >= total) {
      return { errors, completed: true };
    }

    await new Promise<void>(resolve => setTimeout(resolve, intervalMs));
  }

  return { errors: 0, completed: false };
}
