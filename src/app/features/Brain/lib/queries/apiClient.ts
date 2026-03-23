/**
 * Brain API client functions
 * Pure fetch functions used by React Query's queryFn.
 * Each function handles the fetch + JSON parse + error throwing.
 */

import type { DbBehavioralSignal } from '@/app/db/models/brain.types';

// ── Generic fetch helper ─────────────────────────────────────────────────────

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const error = new Error(`Brain API error: ${res.status}`) as Error & { status: number };
    error.status = res.status;
    throw error;
  }
  const json = await res.json();
  if (json.success === false) {
    throw new Error(json.error || 'Brain API request failed');
  }
  return json;
}

// ── Signals ──────────────────────────────────────────────────────────────────

export interface HeatmapDayData {
  date: string;
  total_count: number;
  total_weight: number;
  by_type: Record<string, { count: number; weight: number }>;
  by_context: Record<string, { name: string; count: number; weight: number }>;
}

export interface HeatmapContext {
  id: string;
  name: string;
}

export interface HeatmapResponse {
  success: boolean;
  heatmap: {
    days: HeatmapDayData[];
    contexts: HeatmapContext[];
    signal_types: string[];
    window_days: number;
  };
}

export async function fetchHeatmap(projectId: string, days = 90): Promise<HeatmapResponse> {
  return fetchJSON(`/api/brain/signals/heatmap?projectId=${encodeURIComponent(projectId)}&days=${days}`);
}

export interface CorrelationData {
  nodes: Array<{ id: string; label: string; type: string; weight: number }>;
  edges: Array<{ source: string; target: string; weight: number; co_occurrences: number }>;
}

export async function fetchSignalCorrelations(projectId: string, days = 30): Promise<{ success: boolean; correlations: CorrelationData }> {
  return fetchJSON(`/api/brain/signals/correlations?projectId=${encodeURIComponent(projectId)}&days=${days}`);
}

// CorrelationMatrix uses a different endpoint with different response shape
export interface SignalCorrelation {
  sourceType: string;
  targetType: string;
  coefficient: number;
  strength: 'strong' | 'moderate' | 'weak' | 'none';
  avgLagMinutes: number;
  sampleCount: number;
  followRate: number;
  description: string;
}

export async function fetchBehavioralCorrelations(projectId: string, windowDays = 14, topN = 5) {
  return fetchJSON<{
    success: boolean;
    projectId: string;
    windowDays: number;
    matrix: SignalCorrelation[];
    topCorrelations: SignalCorrelation[];
    signalsAnalyzed: number;
    generatedAt: string;
  }>(`/api/brain/correlations?projectId=${encodeURIComponent(projectId)}&windowDays=${windowDays}&topN=${topN}`);
}

export interface RhythmData {
  hourly: Array<{ hour: number; count: number; weight: number }>;
  daily: Array<{ day: number; count: number; weight: number }>;
  peak_hours: number[];
  peak_days: number[];
  total_signals: number;
}

export async function fetchRhythm(projectId: string, days = 30): Promise<{ success: boolean; rhythm: RhythmData }> {
  return fetchJSON(`/api/brain/signals/rhythm?projectId=${encodeURIComponent(projectId)}&days=${days}`);
}

export async function fetchTemporal(projectId: string, days = 30) {
  return fetchJSON<{
    success: boolean;
    data?: {
      temporal: {
        cells: Array<{ hour: number; dayOfWeek: number; totalCount: number; totalWeight: number; byType: Record<string, { count: number; weight: number }> }>;
        hourTotals: number[];
        dayTotals: number[];
        peakHour: number;
        peakDay: number;
        grandTotal: number;
        signalTypes: string[];
        windowDays: number;
      };
    };
  }>(`/api/brain/signals/temporal?projectId=${encodeURIComponent(projectId)}&days=${days}`);
}

export async function fetchTimelineSignals(projectId: string, since: string, limit: number) {
  const params = new URLSearchParams({ projectId, limit: String(limit), since });
  return fetchJSON<{ success: boolean; signals: DbBehavioralSignal[] }>(`/api/brain/signals?${params}`);
}

export async function fetchSignals(projectId: string, options?: { types?: string[]; limit?: number; contextId?: string }) {
  const params = new URLSearchParams({ projectId });
  if (options?.types?.length) params.set('types', options.types.join(','));
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.contextId) params.set('contextId', options.contextId);
  return fetchJSON<{ success: boolean; signals: unknown[] }>(`/api/brain/signals?${params}`);
}

// ── Insights ─────────────────────────────────────────────────────────────────

export interface InsightEffectivenessItem {
  insightTitle: string;
  insightType: string;
  confidence: number;
  reflectionId: string;
  insightDate: string;
  preRate: number;
  postRate: number;
  preTotal: number;
  postTotal: number;
  score: number;
  verdict: 'helpful' | 'neutral' | 'misleading';
  reliable: boolean;
}

export interface EffectivenessSummary {
  overallScore: number;
  helpfulCount: number;
  neutralCount: number;
  misleadingCount: number;
  totalScored: number;
  baselineAcceptanceRate: number;
}

export interface EffectivenessData {
  success: boolean;
  insights: InsightEffectivenessItem[];
  summary: EffectivenessSummary;
}

export interface CausalInsightScore {
  insightId: string;
  insightTitle: string;
  influencedRate: number;
  baselineRate: number;
  influencedTotal: number;
  baselineTotal: number;
  causalScore: number;
  causalVerdict: 'helpful' | 'neutral' | 'misleading';
  reliable: boolean;
}

export interface InfluenceData {
  success: boolean;
  projectId: string;
  insights: CausalInsightScore[];
  overallCausalScore: number;
  baselineAcceptanceRate: number;
  influencedAcceptanceRate: number;
  totalInfluenceEvents: number;
  reliableCount: number;
  helpfulCount: number;
  neutralCount: number;
  misleadingCount: number;
  generatedAt: string;
}

export async function fetchEffectiveness(projectId: string): Promise<EffectivenessData> {
  return fetchJSON(`/api/brain/insights/effectiveness?projectId=${encodeURIComponent(projectId)}`);
}

export async function fetchInfluence(projectId: string): Promise<InfluenceData | null> {
  try {
    return await fetchJSON(`/api/brain/insights/influence?projectId=${encodeURIComponent(projectId)}`);
  } catch {
    return null; // Influence endpoint is optional
  }
}

export async function fetchInsights(projectId: string, scope = 'project') {
  const params = new URLSearchParams({ projectId, scope });
  return fetchJSON<{ success: boolean; insights: unknown[] }>(`/api/brain/insights?${params}`);
}

// ── Predictions ──────────────────────────────────────────────────────────────

export async function fetchPredictions(projectId: string) {
  return fetchJSON<{ success: boolean; predictions: unknown[] }>(
    `/api/brain/predictions?projectId=${encodeURIComponent(projectId)}`
  );
}

export async function dismissPrediction(predictionId: string): Promise<void> {
  await fetchJSON('/api/brain/predictions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'dismiss', predictionId }),
  });
}

export async function recordPredictionClick(predictionId: string): Promise<void> {
  await fetchJSON('/api/brain/predictions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'record_click', predictionId }),
  });
}

// ── Reflections ──────────────────────────────────────────────────────────────

export interface ReflectionHistoryEntry {
  id: string;
  status: string;
  triggerType: string;
  directionsAnalyzed: number;
  outcomesAnalyzed: number;
  signalsAnalyzed: number;
  insightCount: number;
  insights: unknown[];
  sectionsUpdated: string[];
  durationMs: number | null;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
}

export interface ReflectionAggregates {
  totalReflections: number;
  completedReflections: number;
  failedReflections: number;
  totalInsights: number;
  avgInsightsPerReflection: number;
  totalDurationMs: number;
  avgDurationMs: number;
}

export async function fetchReflectionHistory(projectId: string | null, scope = 'project', limit = 20) {
  const params = new URLSearchParams({ mode: 'history', limit: String(limit) });
  if (scope !== 'project') params.set('scope', scope);
  if (projectId) params.set('projectId', projectId);
  return fetchJSON<{ success: boolean; history: ReflectionHistoryEntry[]; aggregates: ReflectionAggregates }>(
    `/api/brain/reflection?${params}`
  );
}

// ── Insight mutations ────────────────────────────────────────────────────────

export async function dismissInsight(insightId: string): Promise<void> {
  await fetchJSON('/api/brain/insights', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'dismiss', insightId }),
  });
}

export async function snoozeInsight(insightId: string): Promise<void> {
  await fetchJSON('/api/brain/insights', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'snooze', insightId }),
  });
}

export async function linkEvidence(insightId: string, signalIds: string[]): Promise<void> {
  await fetchJSON('/api/brain/insights', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'link_evidence', insightId, signalIds }),
  });
}

export interface ResolvedEvidence {
  refType: string;
  id: string;
  summary: string;
  status?: string;
  contextName?: string | null;
  contextMapTitle?: string;
  createdAt: string;
}

export async function fetchEvidenceRefs(evidenceRefs: Array<{ type: string; id: string }>) {
  return fetchJSON<{ success: boolean; evidence: Record<string, ResolvedEvidence | null> }>(
    '/api/brain/insights',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ evidenceRefs }),
    }
  );
}
