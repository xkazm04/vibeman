/**
 * Signal Session Clusterer
 *
 * Detects contiguous bursts of related activity and compresses them into
 * composite "session_cluster" signals. Uses a sliding-window algorithm
 * on signal timestamps with configurable gap threshold.
 *
 * Clustering rule (first sprint):
 *   When 5+ signals of the same type arrive within 10 minutes,
 *   create a composite entry with count and time range.
 *
 * A cluster boundary is detected when silence exceeds the gap threshold
 * (default 5 min). Only unclustered signals (cluster_id IS NULL) are
 * considered.
 */

import { getHotWritesDatabase } from '@/app/db/hot-writes';
import { selectAll } from '@/app/db/repositories/repository.utils';
import type { DbBehavioralSignal, SessionClusterSignalData } from '@/app/db/models/brain.types';
import type { BehavioralSignalType } from '@/types/signals';
import { SignalType } from '@/types/signals';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface ClusterConfig {
  /** Minimum number of same-type signals to form a cluster */
  minSignals: number;
  /** Maximum time window (ms) to look back for clustering candidates */
  windowMs: number;
  /** Gap threshold (ms) — silence longer than this splits sessions */
  gapMs: number;
}

const DEFAULT_CONFIG: ClusterConfig = {
  minSignals: 5,
  windowMs: 10 * 60 * 1000,   // 10 minutes
  gapMs: 5 * 60 * 1000,       // 5 minutes
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Attempt to cluster recent unclustered signals for a project + signal type.
 *
 * Called as a post-write hook after a signal is recorded. If enough
 * signals of the same type have accumulated within the window, they
 * are compressed into a single session_cluster composite.
 *
 * @returns The cluster signal ID if one was created, or null
 */
export function tryClusterSignals(
  projectId: string,
  signalType: BehavioralSignalType,
  config: Partial<ClusterConfig> = {}
): string | null {
  // Don't cluster cluster signals (prevent recursion)
  if (signalType === SignalType.SESSION_CLUSTER) return null;

  const cfg = { ...DEFAULT_CONFIG, ...config };
  const db = getHotWritesDatabase();

  const windowStart = new Date(Date.now() - cfg.windowMs).toISOString();

  // Fetch recent unclustered signals of this type, ordered by timestamp
  const candidates = selectAll<DbBehavioralSignal>(
    db,
    `SELECT * FROM behavioral_signals
     WHERE project_id = ?
       AND signal_type = ?
       AND cluster_id IS NULL
       AND timestamp >= ?
     ORDER BY timestamp ASC`,
    projectId,
    signalType,
    windowStart
  );

  if (candidates.length < cfg.minSignals) return null;

  // Run sliding-window session detection
  const sessions = detectSessions(candidates, cfg.gapMs);

  // Find the first session that meets the minimum signal threshold
  const clusterableSession = sessions.find(s => s.length >= cfg.minSignals);
  if (!clusterableSession) return null;

  return createCluster(db, projectId, signalType, clusterableSession);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Split a sorted array of signals into sessions using gap-based detection.
 * A new session starts when the gap between consecutive signals exceeds gapMs.
 */
function detectSessions(
  sortedSignals: DbBehavioralSignal[],
  gapMs: number
): DbBehavioralSignal[][] {
  if (sortedSignals.length === 0) return [];

  const sessions: DbBehavioralSignal[][] = [[sortedSignals[0]]];

  for (let i = 1; i < sortedSignals.length; i++) {
    const prev = new Date(sortedSignals[i - 1].timestamp).getTime();
    const curr = new Date(sortedSignals[i].timestamp).getTime();

    if (curr - prev > gapMs) {
      // Gap exceeded — start new session
      sessions.push([sortedSignals[i]]);
    } else {
      sessions[sessions.length - 1].push(sortedSignals[i]);
    }
  }

  return sessions;
}

/**
 * Create a session_cluster composite signal from a group of child signals.
 * - Inserts the composite signal
 * - Updates child signals with cluster_id reference
 * Returns the cluster signal ID.
 */
function createCluster(
  db: ReturnType<typeof getHotWritesDatabase>,
  projectId: string,
  dominantType: BehavioralSignalType,
  children: DbBehavioralSignal[]
): string {
  const clusterId = `cluster_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const startTime = children[0].timestamp;
  const endTime = children[children.length - 1].timestamp;
  const startMs = new Date(startTime).getTime();
  const endMs = new Date(endTime).getTime();
  const durationMs = Math.max(endMs - startMs, 1);
  const intensity = children.length / (durationMs / 60_000); // signals/min

  // Collect unique files touched across child signals
  const filesTouched = new Set<string>();
  for (const child of children) {
    try {
      const data = JSON.parse(child.data);
      // Git signals
      if (Array.isArray(data.filesChanged)) {
        data.filesChanged.forEach((f: string) => filesTouched.add(f));
      }
      // Implementation signals
      if (Array.isArray(data.filesCreated)) {
        data.filesCreated.forEach((f: string) => filesTouched.add(f));
      }
      if (Array.isArray(data.filesModified)) {
        data.filesModified.forEach((f: string) => filesTouched.add(f));
      }
    } catch {
      // Ignore unparseable data
    }
  }

  // Aggregate weight from children (average)
  const totalWeight = children.reduce((sum, c) => sum + c.weight, 0);
  const avgWeight = totalWeight / children.length;

  // Build summary
  const mins = Math.round(durationMs / 60_000);
  const summary = `${children.length} ${dominantType} signals over ${mins || '<1'}min` +
    (filesTouched.size > 0 ? `, ${filesTouched.size} files` : '');

  const clusterData: SessionClusterSignalData = {
    childSignalIds: children.map(c => c.id),
    dominantType,
    signalCount: children.length,
    startTime,
    endTime,
    durationMs,
    intensity: Math.round(intensity * 100) / 100,
    filesTouched: Array.from(filesTouched).slice(0, 50), // cap at 50
    summary,
  };

  // Use context from the majority of children
  const contextCounts = new Map<string, { id: string; name: string; count: number }>();
  for (const child of children) {
    if (child.context_id) {
      const key = child.context_id;
      const existing = contextCounts.get(key);
      if (existing) {
        existing.count++;
      } else {
        contextCounts.set(key, { id: child.context_id, name: child.context_name || '', count: 1 });
      }
    }
  }
  let dominantContext: { id: string; name: string } | null = null;
  let maxCount = 0;
  for (const entry of contextCounts.values()) {
    if (entry.count > maxCount) {
      maxCount = entry.count;
      dominantContext = { id: entry.id, name: entry.name };
    }
  }

  // Use the midpoint timestamp for the cluster signal
  const midpointMs = startMs + Math.floor(durationMs / 2);
  const clusterTimestamp = new Date(midpointMs).toISOString();

  const insertCluster = db.prepare(`
    INSERT INTO behavioral_signals (
      id, project_id, signal_type, context_id, context_name,
      data, weight, timestamp, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  const updateChildren = db.prepare(`
    UPDATE behavioral_signals SET cluster_id = ? WHERE id = ?
  `);

  const runTransaction = db.transaction(() => {
    insertCluster.run(
      clusterId,
      projectId,
      SignalType.SESSION_CLUSTER,
      dominantContext?.id ?? null,
      dominantContext?.name ?? null,
      JSON.stringify(clusterData),
      Math.round(avgWeight * 100) / 100,
      clusterTimestamp
    );

    for (const child of children) {
      updateChildren.run(clusterId, child.id);
    }
  });

  runTransaction();

  return clusterId;
}
