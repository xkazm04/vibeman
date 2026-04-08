/**
 * Unified Transformation Utilities
 *
 * Shared lifecycle, cache invalidation, evidence validation, and confidence
 * propagation logic for all Brain entity types. Operates on the polymorphic
 * Transformation<K> type so consumers can handle signals, insights, anomalies,
 * correlations, predictions, and effectiveness scores uniformly.
 */

import type {
  TransformationKind,
  TransformationBase,
  Transformation,
  AnyTransformation,
  EvidenceRef,
  EvidenceRefType,
  SignalPayload,
  InsightPayload,
  AnomalyPayload,
  CorrelationPayload,
  PredictionPayload,
  EffectivenessPayload,
  DbBehavioralSignal,
  DbBrainInsight,
} from '@/app/db/models/brain.types';

import type { SignalAnomaly } from '@/lib/brain/anomalyDetector';
import type { SignalCorrelation } from '@/lib/brain/correlationEngine';
import type { IntentPrediction } from '@/lib/brain/predictiveIntentEngine';
import type { InsightEffectiveness } from '@/app/api/brain/insights/effectiveness/route';

// ── Adapters: convert existing entity shapes → Transformation<K> ────────────

/**
 * Adapt a DbBehavioralSignal row into a SignalTransformation.
 */
export function signalToTransformation(
  signal: DbBehavioralSignal,
): Transformation<'signal', SignalPayload> {
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(signal.data);
  } catch {
    data = {};
  }

  return {
    kind: 'signal',
    id: signal.id,
    project_id: signal.project_id,
    timestamp: signal.timestamp,
    confidence: signal.weight, // weight acts as confidence for signals
    evidence: [], // signals are leaf entities — they *are* evidence
    parent_id: signal.cluster_id,
    payload: {
      signal_type: signal.signal_type,
      context_id: signal.context_id,
      context_name: signal.context_name,
      data,
      weight: signal.weight,
      decay_applied_at: signal.decay_applied_at,
      cluster_id: signal.cluster_id,
    },
  };
}

/**
 * Adapt a DbBrainInsight row into an InsightTransformation.
 */
export function insightToTransformation(
  insight: DbBrainInsight,
): Transformation<'insight', InsightPayload> {
  let evidence: EvidenceRef[];
  try {
    evidence = JSON.parse(insight.evidence);
  } catch {
    evidence = [];
  }

  return {
    kind: 'insight',
    id: insight.id,
    project_id: insight.project_id,
    timestamp: insight.created_at,
    confidence: insight.confidence / 100, // normalize 0-100 → 0-1
    evidence,
    parent_id: insight.evolves_from_id,
    payload: {
      type: insight.type as InsightPayload['type'],
      title: insight.title,
      description: insight.description,
      reflection_id: insight.reflection_id,
      canonical_id: insight.canonical_id,
      evolves_title: insight.evolves_title,
      conflict_with_id: insight.conflict_with_id,
      conflict_type: insight.conflict_type,
      conflict_resolved: insight.conflict_resolved === 1,
      auto_pruned: insight.auto_pruned === 1,
    },
  };
}

/**
 * Adapt a SignalAnomaly (from anomalyDetector) into an AnomalyTransformation.
 */
export function anomalyToTransformation(
  anomaly: SignalAnomaly,
  projectId: string,
): Transformation<'anomaly', AnomalyPayload> {
  return {
    kind: 'anomaly',
    id: anomaly.id,
    project_id: projectId,
    timestamp: anomaly.detectedAt,
    confidence: Math.min(Math.abs(anomaly.zScore) / 3, 1), // normalize z-score → 0-1
    evidence: [], // anomalies reference signals implicitly via signal_type
    parent_id: null,
    payload: {
      kind: anomaly.kind,
      severity: anomaly.severity,
      title: anomaly.title,
      description: anomaly.description,
      signal_type: anomaly.signalType,
      current_value: anomaly.currentValue,
      baseline_avg: anomaly.baselineAvg,
      z_score: anomaly.zScore,
      context_id: anomaly.contextId,
      context_name: anomaly.contextName,
    },
  };
}

/**
 * Adapt a SignalCorrelation (from correlationEngine) into a CorrelationTransformation.
 */
export function correlationToTransformation(
  correlation: SignalCorrelation,
  projectId: string,
): Transformation<'correlation', CorrelationPayload> {
  return {
    kind: 'correlation',
    id: `corr_${correlation.sourceType}_${correlation.targetType}`,
    project_id: projectId,
    timestamp: new Date().toISOString(),
    confidence: Math.abs(correlation.coefficient), // |coefficient| is the confidence
    evidence: [],
    parent_id: null,
    payload: {
      source_type: correlation.sourceType,
      target_type: correlation.targetType,
      coefficient: correlation.coefficient,
      strength: correlation.strength,
      avg_lag_minutes: correlation.avgLagMinutes,
      sample_count: correlation.sampleCount,
      follow_rate: correlation.followRate,
      description: correlation.description,
    },
  };
}

/**
 * Adapt an IntentPrediction into a PredictionTransformation.
 */
export function predictionToTransformation(
  prediction: IntentPrediction,
  projectId: string,
  id: string,
): Transformation<'prediction', PredictionPayload> {
  return {
    kind: 'prediction',
    id,
    project_id: projectId,
    timestamp: new Date().toISOString(),
    confidence: prediction.confidence,
    evidence: [],
    parent_id: null,
    payload: {
      context_id: prediction.contextId,
      context_name: prediction.contextName,
      reasoning: prediction.reasoning,
      avg_transition_time_ms: prediction.avgTransitionTimeMs,
      transition_count: prediction.transitionCount,
    },
  };
}

/**
 * Adapt an InsightEffectiveness score into an EffectivenessTransformation.
 */
export function effectivenessToTransformation(
  eff: InsightEffectiveness,
  projectId: string,
): Transformation<'effectiveness', EffectivenessPayload> {
  return {
    kind: 'effectiveness',
    id: `eff_${eff.reflectionId}_${eff.insightTitle.slice(0, 20)}`,
    project_id: projectId,
    timestamp: eff.insightDate,
    confidence: eff.reliable ? Math.min(Math.abs(eff.score) / 100, 1) : 0,
    evidence: [{ type: 'reflection' as EvidenceRefType, id: eff.reflectionId }],
    parent_id: eff.reflectionId,
    payload: {
      insight_title: eff.insightTitle,
      insight_type: eff.insightType,
      reflection_id: eff.reflectionId,
      insight_date: eff.insightDate,
      pre_rate: eff.preRate,
      post_rate: eff.postRate,
      pre_total: eff.preTotal,
      post_total: eff.postTotal,
      score: eff.score,
      verdict: eff.verdict,
      reliable: eff.reliable,
    },
  };
}

// ── Evidence Validation ─────────────────────────────────────────────────────

const VALID_EVIDENCE_TYPES: ReadonlySet<string> = new Set<EvidenceRefType>([
  'direction',
  'signal',
  'reflection',
]);

/**
 * Validate evidence refs on any Transformation. Returns an array of
 * invalid refs (empty = all valid).
 */
export function validateEvidence(t: TransformationBase): EvidenceRef[] {
  return t.evidence.filter(
    (ref) => !ref.id || !VALID_EVIDENCE_TYPES.has(ref.type),
  );
}

/**
 * Check whether a transformation has valid, non-empty evidence.
 */
export function hasValidEvidence(t: TransformationBase): boolean {
  return t.evidence.length > 0 && validateEvidence(t).length === 0;
}

// ── Confidence Propagation ──────────────────────────────────────────────────

/**
 * Propagate confidence across a chain of transformations.
 * Each child's effective confidence is capped by its parent's confidence,
 * modelling the principle that derived entities can't be more confident
 * than their source.
 */
export function propagateConfidence(
  chain: TransformationBase[],
): number[] {
  if (chain.length === 0) return [];
  const result = [chain[0].confidence];
  for (let i = 1; i < chain.length; i++) {
    result.push(Math.min(chain[i].confidence, result[i - 1]));
  }
  return result;
}

/**
 * Compute aggregate confidence for a set of transformations.
 * Uses geometric mean to punish low-confidence outliers.
 */
export function aggregateConfidence(items: TransformationBase[]): number {
  if (items.length === 0) return 0;
  const product = items.reduce((acc, t) => acc * Math.max(t.confidence, 0.001), 1);
  return Math.pow(product, 1 / items.length);
}

// ── Cache Invalidation ──────────────────────────────────────────────────────

/**
 * Map from transformation kind → the query key segments that should be
 * invalidated when that kind changes. This enables polymorphic cache
 * invalidation: one rule per kind instead of ad-hoc invalidation scattered
 * across the codebase.
 */
const INVALIDATION_MAP: Record<TransformationKind, readonly string[][]> = {
  signal: [
    ['brain', 'signals'],
    ['brain', 'correlations'], // signals feed correlations
    ['brain', 'anomalies'],    // signals feed anomaly detection
    ['brain', 'predictions'],  // signals feed predictions
  ],
  insight: [
    ['brain', 'insights'],
    ['brain', 'effectiveness'], // insights feed effectiveness
  ],
  anomaly: [
    ['brain', 'anomalies'],
    ['brain', 'monitors'],
  ],
  correlation: [
    ['brain', 'correlations'],
  ],
  prediction: [
    ['brain', 'predictions'],
  ],
  effectiveness: [
    ['brain', 'effectiveness'],
    ['brain', 'insights'], // effectiveness influences insight display
  ],
};

/**
 * Get the query key prefixes that should be invalidated when a
 * transformation of the given kind is created/updated/deleted.
 */
export function getInvalidationKeys(kind: TransformationKind): readonly string[][] {
  return INVALIDATION_MAP[kind];
}

/**
 * Get all query key prefixes that should be invalidated for a batch
 * of mixed transformation kinds. Deduplicates automatically.
 */
export function getBatchInvalidationKeys(kinds: TransformationKind[]): string[][] {
  const seen = new Set<string>();
  const result: string[][] = [];
  for (const kind of kinds) {
    for (const keys of INVALIDATION_MAP[kind]) {
      const key = keys.join('.');
      if (!seen.has(key)) {
        seen.add(key);
        result.push([...keys]);
      }
    }
  }
  return result;
}

// ── Filtering & Sorting ─────────────────────────────────────────────────────

/**
 * Filter a mixed array of transformations by kind(s).
 */
export function filterByKind<K extends TransformationKind>(
  items: AnyTransformation[],
  ...kinds: K[]
): Array<Extract<AnyTransformation, { kind: K }>> {
  const kindSet = new Set<string>(kinds);
  return items.filter((t) => kindSet.has(t.kind)) as Array<Extract<AnyTransformation, { kind: K }>>;
}

/**
 * Sort transformations by confidence (descending) then by timestamp (newest first).
 */
export function sortByRelevance<T extends TransformationBase>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const confDiff = b.confidence - a.confidence;
    if (Math.abs(confDiff) > 0.001) return confDiff;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });
}

/**
 * Check whether a transformation is considered high-confidence.
 * Threshold is configurable per-kind.
 */
const HIGH_CONFIDENCE_THRESHOLDS: Record<TransformationKind, number> = {
  signal: 0.5,
  insight: 0.7,
  anomaly: 0.6,
  correlation: 0.5,
  prediction: 0.4,
  effectiveness: 0.3,
};

export function isHighConfidence(t: Transformation): boolean {
  const threshold = HIGH_CONFIDENCE_THRESHOLDS[t.kind] ?? 0.5;
  return t.confidence >= threshold;
}
