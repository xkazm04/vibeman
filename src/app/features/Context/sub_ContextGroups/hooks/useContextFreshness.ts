/**
 * Context freshness store — content-drift badges for context cards.
 *
 * Fetches the advisory audit (GET /api/contexts/audit) once per project and
 * exposes the set of context IDs flagged `content_stale` (a mapped file's
 * content changed since the context's metadata baseline). Many cards subscribe;
 * a TTL + in-flight guard collapses the storm into a single request per project.
 * Advisory only — a fetch failure silently yields "nothing stale".
 */
'use client';
import { useEffect } from 'react';
import { create } from 'zustand';
import { auditProject } from '../../lib';

/** Re-fetch freshness at most this often per project. */
const FRESHNESS_TTL_MS = 30_000;

interface FreshnessState {
  /** projectId → set of context IDs whose mapped files drifted on disk. */
  staleByProject: Record<string, Set<string>>;
  lastFetched: Record<string, number>;
  /** Guard so concurrent card mounts issue one request, not N. */
  inFlight: Set<string>;
  fetchFreshness: (projectId: string, force?: boolean) => Promise<void>;
}

export const useContextFreshnessStore = create<FreshnessState>((set, get) => ({
  staleByProject: {},
  lastFetched: {},
  inFlight: new Set<string>(),
  fetchFreshness: async (projectId, force = false) => {
    if (!projectId) return;
    const { lastFetched, inFlight } = get();
    if (inFlight.has(projectId)) return;
    if (!force && Date.now() - (lastFetched[projectId] ?? 0) < FRESHNESS_TTL_MS) return;
    inFlight.add(projectId);
    try {
      const report = await auditProject(projectId);
      const stale = new Set<string>();
      for (const f of report.findings) {
        if (f.code === 'content_stale' && f.contextId) stale.add(f.contextId);
      }
      set((s) => ({
        staleByProject: { ...s.staleByProject, [projectId]: stale },
        lastFetched: { ...s.lastFetched, [projectId]: Date.now() },
      }));
    } catch {
      // Advisory badge — a failed audit must never surface an error to the card.
    } finally {
      inFlight.delete(projectId);
    }
  },
}));

/**
 * True when `contextId` has content drift for `projectId`. Kicks off a (deduped,
 * TTL-guarded) freshness fetch on mount so the badge appears without any wiring
 * from parent components.
 */
export function useContextContentStale(
  projectId: string | undefined,
  contextId: string
): boolean {
  const fetchFreshness = useContextFreshnessStore((s) => s.fetchFreshness);
  const isStale = useContextFreshnessStore((s) =>
    projectId ? s.staleByProject[projectId]?.has(contextId) ?? false : false
  );
  useEffect(() => {
    if (projectId) void fetchFreshness(projectId);
  }, [projectId, fetchFreshness]);
  return isStale;
}
