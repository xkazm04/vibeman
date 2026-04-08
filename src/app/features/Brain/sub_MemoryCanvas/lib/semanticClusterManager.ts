/**
 * Semantic Cluster Manager
 *
 * Orchestrates the clustering web worker — debounces requests, applies
 * results to groups, and triggers insight fusion on convergence events.
 */

import type { Group, SemanticSubCluster, ConvergenceEvent } from './types';
import type { SemanticWorkerInput, SemanticWorkerOutput } from './semanticClustering.worker';
import { filterNovelConvergences, crystallizeInsights, clearFusionCache } from './insightFusion';

export interface ClusteringResult {
  /** Updated groups with semanticClusters populated */
  groups: Group[];
  /** Cross-context convergence events */
  convergenceEvents: ConvergenceEvent[];
}

export class SemanticClusterManager {
  private worker: Worker | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingResolve: ((result: ClusteringResult) => void) | null = null;
  private lastEventFingerprint = '';
  private _convergenceEvents: ConvergenceEvent[] = [];
  private projectId: string | null = null;

  get convergenceEvents(): ConvergenceEvent[] {
    return this._convergenceEvents;
  }

  setProjectId(id: string) {
    if (this.projectId !== id) {
      clearFusionCache();
    }
    this.projectId = id;
  }

  /**
   * Request semantic clustering for the given groups.
   * Debounced — only the last call within 500ms actually runs.
   * Returns a promise that resolves when clustering is complete.
   */
  requestClustering(groups: Group[]): Promise<ClusteringResult> | null {
    // Build fingerprint to skip redundant work
    const fingerprint = groups
      .map(g => `${g.id}:${g.events.length}`)
      .sort()
      .join('|');

    if (fingerprint === this.lastEventFingerprint) {
      return null; // No change
    }
    this.lastEventFingerprint = fingerprint;

    // Cancel any pending work
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    return new Promise<ClusteringResult>((resolve) => {
      this.pendingResolve = resolve;

      this.debounceTimer = setTimeout(() => {
        this.runClustering(groups);
      }, 500);
    });
  }

  private runClustering(groups: Group[]): void {
    // Terminate previous worker if still running
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    // Prepare signal summaries from all groups
    const signals: SemanticWorkerInput['signals'] = [];

    for (const group of groups) {
      for (const evt of group.events) {
        if (evt.summary && evt.summary.length > 5) {
          signals.push({
            id: evt.id,
            groupId: group.id,
            contextName: group.name,
            summary: evt.summary,
            weight: evt.weight,
            timestamp: evt.timestamp,
          });
        }
      }
    }

    // Not enough signals to cluster
    if (signals.length < 4) {
      this._convergenceEvents = [];
      this.pendingResolve?.({ groups, convergenceEvents: [] });
      this.pendingResolve = null;
      return;
    }

    this.worker = new Worker(
      new URL('./semanticClustering.worker.ts', import.meta.url),
      { type: 'module' },
    );

    this.worker.onmessage = (e: MessageEvent<SemanticWorkerOutput>) => {
      if (e.data.type !== 'complete') return;

      const { groupClusters, convergenceEvents } = e.data;

      // Apply clusters to groups
      const groupMap = new Map<string, Group>();
      for (const g of groups) groupMap.set(g.id, g);

      for (const gc of groupClusters) {
        const group = groupMap.get(gc.groupId);
        if (group) {
          group.semanticClusters = gc.clusters;
        }
      }

      this._convergenceEvents = convergenceEvents;

      // Trigger insight fusion for novel convergences (async, fire-and-forget)
      if (this.projectId) {
        const novel = filterNovelConvergences(convergenceEvents);
        if (novel.length > 0) {
          crystallizeInsights(novel, this.projectId).catch(() => {});
        }
      }

      this.pendingResolve?.({ groups, convergenceEvents });
      this.pendingResolve = null;

      this.worker?.terminate();
      this.worker = null;
    };

    this.worker.onerror = (err) => {
      console.error('[SemanticClusterManager] Worker error:', err);
      this._convergenceEvents = [];
      this.pendingResolve?.({ groups, convergenceEvents: [] });
      this.pendingResolve = null;
      this.worker?.terminate();
      this.worker = null;
    };

    const input: SemanticWorkerInput = {
      type: 'cluster',
      signals,
    };

    this.worker.postMessage(input);
  }

  destroy(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.pendingResolve = null;
    this._convergenceEvents = [];
  }
}
