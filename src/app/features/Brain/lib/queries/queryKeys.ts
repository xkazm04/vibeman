/**
 * Brain query key factory
 * Centralized, type-safe query keys for all Brain data fetching.
 * Enables targeted cache invalidation and prevents key collisions.
 */

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

  // ── Predictions ──────────────────────────────────────────────────────
  predictions: () => [...brainKeys.all, 'predictions'] as const,
  predictionsList: (projectId: string) =>
    [...brainKeys.predictions(), 'list', projectId] as const,

  // ── Reflections ──────────────────────────────────────────────────────
  reflections: () => [...brainKeys.all, 'reflections'] as const,
  reflectionHistory: (projectId: string | null, scope: string) =>
    [...brainKeys.reflections(), 'history', projectId, scope] as const,
};
