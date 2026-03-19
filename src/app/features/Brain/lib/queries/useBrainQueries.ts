/**
 * Brain React Query hooks
 * Custom hooks wrapping useQuery/useMutation for all Brain data fetching.
 * Replaces useAbortableFetch + useState pattern across Brain components.
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CACHE_PRESETS } from '@/lib/cache/cache-config';
import { brainKeys } from './queryKeys';
import {
  fetchHeatmap,
  fetchSignalCorrelations,
  fetchBehavioralCorrelations,
  fetchRhythm,
  fetchTemporal,
  fetchSignals,
  fetchEffectiveness,
  fetchInfluence,
  fetchInsights,
  fetchPredictions,
  dismissPrediction,
  recordPredictionClick,
  fetchReflectionHistory,
  dismissInsight,
  snoozeInsight,
  linkEvidence,
  fetchEvidenceRefs,
} from './apiClient';

// ── Signal queries ───────────────────────────────────────────────────────────

export function useHeatmap(projectId: string | undefined, days = 90) {
  return useQuery({
    queryKey: brainKeys.signalsHeatmap(projectId ?? '', days),
    queryFn: () => fetchHeatmap(projectId!, days),
    enabled: !!projectId,
    ...CACHE_PRESETS.brainData,
  });
}

export function useCorrelations(projectId: string | undefined, days = 30) {
  return useQuery({
    queryKey: brainKeys.signalsCorrelations(projectId ?? '', days),
    queryFn: () => fetchSignalCorrelations(projectId!, days),
    enabled: !!projectId,
    ...CACHE_PRESETS.brainData,
  });
}

export function useBehavioralCorrelations(projectId: string | undefined, windowDays = 14, topN = 5) {
  return useQuery({
    queryKey: [...brainKeys.signalsCorrelations(projectId ?? '', windowDays), 'behavioral', topN],
    queryFn: () => fetchBehavioralCorrelations(projectId!, windowDays, topN),
    enabled: !!projectId,
    ...CACHE_PRESETS.brainData,
  });
}

export function useTemporal(projectId: string | undefined, days = 30) {
  return useQuery({
    queryKey: [...brainKeys.signals(), 'temporal', projectId ?? '', days],
    queryFn: () => fetchTemporal(projectId!, days),
    enabled: !!projectId,
    ...CACHE_PRESETS.brainData,
  });
}

export function useRhythm(projectId: string | undefined, days = 30) {
  return useQuery({
    queryKey: brainKeys.signalsRhythm(projectId ?? '', days),
    queryFn: () => fetchRhythm(projectId!, days),
    enabled: !!projectId,
    ...CACHE_PRESETS.brainData,
  });
}

export function useSignals(projectId: string | undefined, options?: { types?: string[]; limit?: number; contextId?: string }) {
  return useQuery({
    queryKey: brainKeys.signalsList(projectId ?? '', options?.types),
    queryFn: () => fetchSignals(projectId!, options),
    enabled: !!projectId,
    ...CACHE_PRESETS.brainData,
  });
}

export function useContextSignals(projectId: string | undefined, contextId: string | undefined) {
  return useQuery({
    queryKey: brainKeys.signalDetail(projectId ?? '', contextId ?? ''),
    queryFn: () => fetchSignals(projectId!, { contextId: contextId!, limit: 50 }),
    enabled: !!projectId && !!contextId,
    ...CACHE_PRESETS.brainData,
  });
}

// ── Insight queries ──────────────────────────────────────────────────────────

export function useEffectiveness(projectId: string | undefined) {
  return useQuery({
    queryKey: brainKeys.insightsEffectiveness(projectId ?? ''),
    queryFn: () => fetchEffectiveness(projectId!),
    enabled: !!projectId,
    ...CACHE_PRESETS.brainInsights,
  });
}

export function useInfluence(projectId: string | undefined) {
  return useQuery({
    queryKey: brainKeys.insightsInfluence(projectId ?? ''),
    queryFn: () => fetchInfluence(projectId!),
    enabled: !!projectId,
    ...CACHE_PRESETS.brainInsights,
  });
}

export function useInsights(projectId: string | undefined, scope = 'project') {
  return useQuery({
    queryKey: brainKeys.insightsList(projectId ?? '', scope),
    queryFn: () => fetchInsights(projectId!, scope),
    enabled: !!projectId,
    ...CACHE_PRESETS.brainInsights,
  });
}

// ── Prediction queries ───────────────────────────────────────────────────────

export function usePredictions(projectId: string | null | undefined) {
  return useQuery({
    queryKey: brainKeys.predictionsList(projectId ?? ''),
    queryFn: () => fetchPredictions(projectId!),
    enabled: !!projectId,
    ...CACHE_PRESETS.brainInsights,
  });
}

// ── Reflection queries ───────────────────────────────────────────────────────

export function useReflectionHistory(projectId: string | null, scope = 'project', limit = 20) {
  return useQuery({
    queryKey: brainKeys.reflectionHistory(projectId, scope),
    queryFn: () => fetchReflectionHistory(projectId, scope, limit),
    enabled: scope === 'global' || !!projectId,
    ...CACHE_PRESETS.reflectionHistory,
  });
}

// ── Mutations ────────────────────────────────────────────────────────────────

export function useDismissPrediction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: dismissPrediction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: brainKeys.predictions() });
    },
  });
}

export function useRecordPredictionClick() {
  return useMutation({ mutationFn: recordPredictionClick });
}

export function useDismissInsight() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: dismissInsight,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: brainKeys.insights() });
    },
  });
}

export function useSnoozeInsight() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: snoozeInsight,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: brainKeys.insights() });
    },
  });
}

export function useLinkEvidence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ insightId, signalIds }: { insightId: string; signalIds: string[] }) =>
      linkEvidence(insightId, signalIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: brainKeys.insights() });
    },
  });
}

// ── Evidence queries ─────────────────────────────────────────────────────────

export function useEvidenceRefs(evidence: Array<{ type: string; id: string }>, enabled: boolean) {
  return useQuery({
    queryKey: [...brainKeys.insights(), 'evidence', ...evidence.map(e => e.id)],
    queryFn: () => fetchEvidenceRefs(evidence),
    enabled: enabled && evidence.length > 0,
    ...CACHE_PRESETS.brainInsights,
  });
}

// ── Invalidation helpers ─────────────────────────────────────────────────────

export function useInvalidateBrain() {
  const queryClient = useQueryClient();
  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: brainKeys.all }),
    invalidateSignals: () => queryClient.invalidateQueries({ queryKey: brainKeys.signals() }),
    invalidateInsights: () => queryClient.invalidateQueries({ queryKey: brainKeys.insights() }),
    invalidatePredictions: () => queryClient.invalidateQueries({ queryKey: brainKeys.predictions() }),
    invalidateReflections: () => queryClient.invalidateQueries({ queryKey: brainKeys.reflections() }),
  };
}
