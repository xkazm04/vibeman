/**
 * Manager Service Layer
 *
 * Centralizes all data-fetching for the Manager feature. Components import
 * from here instead of calling `fetch` inline, giving us:
 *   - typed responses
 *   - consistent error handling
 *   - a single place to change URLs or add caching later
 */

import type { ApiResponse } from '@/types/api';
import type {
  EnrichedImplementationLog,
  FlowAnalysisData,
  LogEntry,
} from './types';
import type { ContextGroupRelationship } from '@/lib/queries/contextQueries';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

class ManagerServiceError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'ManagerServiceError';
  }
}

async function fetchApi<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ManagerServiceError(
      body.error || `Request failed: ${res.status}`,
      res.status,
    );
  }
  return res.json() as Promise<T>;
}

async function fetchApiResponse<T>(url: string, init?: RequestInit): Promise<T> {
  const data = await fetchApi<ApiResponse<T>>(url, init);
  if (!data.success) {
    throw new ManagerServiceError(data.error);
  }
  return data.data;
}

// ---------------------------------------------------------------------------
// Implementation Logs
// ---------------------------------------------------------------------------

export async function fetchUntestedLogs(
  projectId?: string | null,
): Promise<EnrichedImplementationLog[]> {
  const url = projectId
    ? `/api/implementation-logs/untested?projectId=${encodeURIComponent(projectId)}`
    : '/api/implementation-logs/untested';
  return fetchApiResponse<EnrichedImplementationLog[]>(url);
}

export async function fetchLogsBatch(ids: string[]): Promise<LogEntry[]> {
  return fetchApiResponse<LogEntry[]>('/api/implementation-logs/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
}

export async function fetchFlowAnalysis(
  projectId: string,
): Promise<FlowAnalysisData> {
  return fetchApiResponse<FlowAnalysisData>(
    `/api/implementation-logs/flow-analysis?projectId=${encodeURIComponent(projectId)}`,
  );
}

// ---------------------------------------------------------------------------
// Context Group Relationships
// ---------------------------------------------------------------------------

export async function fetchContextGroupRelationships(
  projectId: string,
): Promise<ContextGroupRelationship[]> {
  const data = await fetchApiResponse<ContextGroupRelationship[]>(
    `/api/context-group-relationships?projectId=${encodeURIComponent(projectId)}`,
  );
  return data || [];
}

// ---------------------------------------------------------------------------
// Contexts
// ---------------------------------------------------------------------------

export async function fetchContextDescription(
  contextId: string,
  projectId?: string,
): Promise<string | undefined> {
  const params = new URLSearchParams({ contextId });
  if (projectId) params.append('projectId', projectId);

  try {
    const data = await fetchApi<{ data?: { description?: string } }>(
      `/api/contexts/detail?${params.toString()}`,
    );
    return data.data?.description || undefined;
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Requirements
// ---------------------------------------------------------------------------

export async function createRequirement(
  projectPath: string,
  requirementName: string,
  content: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await fetchApi<{ success: boolean }>('/api/claude-code/requirement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectPath, requirementName, content }),
    });
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
