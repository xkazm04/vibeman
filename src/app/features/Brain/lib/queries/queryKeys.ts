/**
 * Brain query key factory
 * Centralized, type-safe query keys for all Brain data fetching.
 * Enables targeted cache invalidation and prevents key collisions.
 *
 * The `invalidateByKind` helper uses the Transformation type system to
 * invalidate all dependent query families when a transformation kind changes.
 */

import type { TransformationKind } from '@/app/db/models/brain.types';
import { getInvalidationKeys, getBatchInvalidationKeys } from '@/lib/brain/transformation';

export const brainKeys = {
  all: ['brain'] as const,

  // ── Signals ──────────────────────────────────────────────────────────
  signals: () => [...brainKeys.all, 'signals'] as const,
  signalsList: (projectId: string, types?: string[]) =>
    [...brainKeys.signals(), 'list', projectId, types] as const,
  signalsHeatmap: (projectId: string, days?: number) =>
    [...brainKeys.signals(), 'heatmap', projectId, days] as const,
  signalsCorrelations: (projectId: string, days?: number) =>
    [...brainKeys.signals(), 'correlations', projectId, days] as const,
  signalsRhythm: (projectId: string, days?: number) =>
    [...brainKeys.signals(), 'rhythm', projectId, days] as const,
  signalDetail: (projectId: string, contextId: string) =>
    [...brainKeys.signals(), 'detail', projectId, contextId] as const,
  signalsTimeline: (projectId: string, since: string) =>
    [...brainKeys.signals(), 'timeline', projectId, since] as const,

  // ── Insights ─────────────────────────────────────────────────────────
  insights: () => [...brainKeys.all, 'insights'] as const,
  insightsList: (projectId: string, scope?: string) =>
    [...brainKeys.insights(), 'list', projectId, scope] as const,
  insightsEffectiveness: (projectId: string) =>
    [...brainKeys.insights(), 'effectiveness', projectId] as const,
  insightsInfluence: (projectId: string) =>
    [...brainKeys.insights(), 'influence', projectId] as const,
  insightLineage: (insightId: string) =>
    [...brainKeys.insights(), 'lineage', insightId] as const,
  insightTags: (projectId: string | null, scope?: string) =>
    [...brainKeys.insights(), 'tags', projectId, scope] as const,

  // ── Correlations ────────────────────────────────────────────────────
  correlations: () => [...brainKeys.all, 'correlations'] as const,

  // ── Anomalies ───────────────────────────────────────────────────────
  anomalies: () => [...brainKeys.all, 'anomalies'] as const,

  // ── Effectiveness ───────────────────────────────────────────────────
  effectiveness: () => [...brainKeys.all, 'effectiveness'] as const,

  // ── Predictions ──────────────────────────────────────────────────────
  predictions: () => [...brainKeys.all, 'predictions'] as const,
  predictionsList: (projectId: string) =>
    [...brainKeys.predictions(), 'list', projectId] as const,

  // ── Reflections ──────────────────────────────────────────────────────
  reflections: () => [...brainKeys.all, 'reflections'] as const,
  reflectionHistory: (projectId: string | null, scope: string) =>
    [...brainKeys.reflections(), 'history', projectId, scope] as const,

  // ── Monitors ────────────────────────────────────────────────────────
  monitors: () => [...brainKeys.all, 'monitors'] as const,
  monitorsList: (projectId: string) =>
    [...brainKeys.monitors(), 'list', projectId] as const,

  // ── Polymorphic Invalidation ────────────────────────────────────────
  // Returns query key prefixes to invalidate when a transformation kind changes.
  // Usage with React Query: keys.forEach(k => queryClient.invalidateQueries({ queryKey: k }))

  /**
   * Get query key prefixes to invalidate for a single transformation kind.
   */
  invalidateByKind: (kind: TransformationKind) =>
    getInvalidationKeys(kind),

  /**
   * Get deduplicated query key prefixes for a batch of transformation kinds.
   */
  invalidateByKinds: (kinds: TransformationKind[]) =>
    getBatchInvalidationKeys(kinds),
};
