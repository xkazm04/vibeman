/**
 * Predictive Intent Engine
 *
 * Uses a lightweight Markov chain trained on context transition sequences
 * to anticipate what the developer will work on next. The engine:
 *
 * 1. Extracts context transitions from behavioral signals (context_focus)
 * 2. Builds a transition probability matrix (Markov chain)
 * 3. Predicts the most likely next context(s) given the current state
 * 4. Generates "Next Up" suggestions with confidence scores
 *
 * Updated after each reflection cycle or on-demand via API.
 */

import { behavioralSignalDb, predictiveIntentDb } from '@/app/db';
import type { DbBehavioralSignal } from '@/app/db/models/brain.types';
import type { TransitionCount } from '@/app/db/repositories/predictive-intent.repository';

// ── Types ────────────────────────────────────────────────────────────────────

export interface IntentPrediction {
  contextId: string;
  contextName: string;
  confidence: number;        // 0-1 probability
  reasoning: string;
  avgTransitionTimeMs: number;
  transitionCount: number;
}

export interface PredictionResult {
  predictions: IntentPrediction[];
  currentContextId: string | null;
  currentContextName: string | null;
  modelSize: number;          // total transitions in the model
  accuracy: {
    total: number;
    accepted: number;
    dismissed: number;
    expired: number;
    accuracyRate: number;
  };
}

interface TransitionMatrix {
  [fromContextId: string]: {
    contextName: string;
    transitions: Array<{
      toContextId: string;
      toContextName: string;
      probability: number;
      count: number;
      avgTimeMs: number;
    }>;
    totalOutgoing: number;
  };
}

// ── Engine ───────────────────────────────────────────────────────────────────

/**
 * Extract context transitions from behavioral signals.
 * Looks at consecutive context_focus signals and records from→to pairs.
 */
export function extractTransitionsFromSignals(
  signals: DbBehavioralSignal[],
  maxGapMs: number = 3600000 // 1 hour max gap between transitions
): Array<{
  fromContextId: string;
  fromContextName: string;
  toContextId: string;
  toContextName: string;
  transitionTimeMs: number;
  signalType: string;
  timestamp: string;
}> {
  // Filter to context_focus signals with context_id, sorted by timestamp ascending
  const contextSignals = signals
    .filter(s => s.context_id && s.context_name)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const transitions: Array<{
    fromContextId: string;
    fromContextName: string;
    toContextId: string;
    toContextName: string;
    transitionTimeMs: number;
    signalType: string;
    timestamp: string;
  }> = [];

  for (let i = 1; i < contextSignals.length; i++) {
    const prev = contextSignals[i - 1];
    const curr = contextSignals[i];

    // Skip self-transitions (staying in the same context)
    if (prev.context_id === curr.context_id) continue;

    const timeDiff = new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime();

    // Skip if the gap is too large (likely a break/new session)
    if (timeDiff > maxGapMs) continue;

    transitions.push({
      fromContextId: prev.context_id!,
      fromContextName: prev.context_name!,
      toContextId: curr.context_id!,
      toContextName: curr.context_name!,
      transitionTimeMs: timeDiff,
      signalType: curr.signal_type,
      timestamp: curr.timestamp,
    });
  }

  return transitions;
}

/**
 * Build a Markov chain transition matrix from aggregated counts.
 */
export function buildTransitionMatrix(counts: TransitionCount[]): TransitionMatrix {
  const matrix: TransitionMatrix = {};

  // First pass: aggregate totals per source context
  for (const row of counts) {
    if (!matrix[row.from_context_id]) {
      matrix[row.from_context_id] = {
        contextName: row.from_context_name,
        transitions: [],
        totalOutgoing: 0,
      };
    }
    matrix[row.from_context_id].totalOutgoing += row.count;
  }

  // Second pass: compute probabilities
  for (const row of counts) {
    const entry = matrix[row.from_context_id];
    entry.transitions.push({
      toContextId: row.to_context_id,
      toContextName: row.to_context_name,
      probability: row.count / entry.totalOutgoing,
      count: row.count,
      avgTimeMs: row.avg_transition_time_ms,
    });
  }

  // Sort transitions by probability descending
  for (const entry of Object.values(matrix)) {
    entry.transitions.sort((a, b) => b.probability - a.probability);
  }

  return matrix;
}

/**
 * Predict the next context(s) given a current context.
 * Uses the Markov chain with optional recency weighting.
 */
function predictFromMatrix(
  matrix: TransitionMatrix,
  currentContextId: string,
  topK: number = 3
): IntentPrediction[] {
  const entry = matrix[currentContextId];
  if (!entry || entry.transitions.length === 0) return [];

  return entry.transitions.slice(0, topK).map(t => ({
    contextId: t.toContextId,
    contextName: t.toContextName,
    confidence: t.probability,
    reasoning: `After working on "${entry.contextName}", you move to "${t.toContextName}" ${Math.round(t.probability * 100)}% of the time (${t.count} transitions observed)`,
    avgTransitionTimeMs: t.avgTimeMs,
    transitionCount: t.count,
  }));
}

// ── Public API ───────────────────────────────────────────────────────────────

function generateId(): string {
  return `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export const predictiveIntentEngine = {
  /**
   * Ingest new transitions from recent signals.
   * Call this after signal recording to keep the model fresh.
   */
  ingestTransitions: (projectId: string, windowDays: number = 7): number => {
    try {
      const signals = behavioralSignalDb.getByProject(projectId, {
        limit: 500,
        since: new Date(Date.now() - windowDays * 86400000).toISOString(),
      });

      const transitions = extractTransitionsFromSignals(signals);

      let recorded = 0;
      for (const t of transitions) {
        try {
          predictiveIntentDb.createTransition({
            id: generateId(),
            project_id: projectId,
            from_context_id: t.fromContextId,
            from_context_name: t.fromContextName,
            to_context_id: t.toContextId,
            to_context_name: t.toContextName,
            transition_time_ms: t.transitionTimeMs,
            signal_type: t.signalType,
            timestamp: t.timestamp,
          });
          recorded++;
        } catch {
          // Likely duplicate or constraint violation — skip
        }
      }

      return recorded;
    } catch (error) {
      console.error('[PredictiveIntent] Failed to ingest transitions:', error);
      return 0;
    }
  },

  /**
   * Generate predictions for the developer's next context.
   * This is the main entry point for the prediction engine.
   */
  predict: (projectId: string, topK: number = 3): PredictionResult => {
    try {
      // Expire stale predictions first
      predictiveIntentDb.expireOldPredictions(projectId, 4);

      // Get the transition counts for the Markov chain
      const counts = predictiveIntentDb.getTransitionCounts(projectId, 30);
      const matrix = buildTransitionMatrix(counts);

      // Find the current/most recent context from signals
      const recentSignals = behavioralSignalDb.getByProject(projectId, {
        limit: 10,
      });
      const currentSignal = recentSignals.find(s => s.context_id && s.context_name);
      const currentContextId = currentSignal?.context_id ?? null;
      const currentContextName = currentSignal?.context_name ?? null;

      let predictions: IntentPrediction[] = [];

      if (currentContextId) {
        predictions = predictFromMatrix(matrix, currentContextId, topK);
      }

      // If no predictions from current context, use global frequency fallback
      if (predictions.length === 0) {
        // Fallback: suggest most frequently visited contexts
        const allTargets = new Map<string, { name: string; count: number }>();
        for (const row of counts) {
          const existing = allTargets.get(row.to_context_id);
          if (existing) {
            existing.count += row.count;
          } else {
            allTargets.set(row.to_context_id, {
              name: row.to_context_name,
              count: row.count,
            });
          }
        }

        const sorted = Array.from(allTargets.entries())
          .filter(([id]) => id !== currentContextId)
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, topK);

        const totalCount = sorted.reduce((sum, [, v]) => sum + v.count, 0);

        predictions = sorted.map(([id, v]) => ({
          contextId: id,
          contextName: v.name,
          confidence: totalCount > 0 ? v.count / totalCount * 0.5 : 0, // cap at 0.5 for fallback
          reasoning: `"${v.name}" is one of your most frequently visited contexts (${v.count} visits)`,
          avgTransitionTimeMs: 0,
          transitionCount: v.count,
        }));
      }

      // Get accuracy stats
      const accuracy = predictiveIntentDb.getAccuracyStats(projectId, 30);

      // Total model size
      const modelSize = predictiveIntentDb.getTransitionCount(projectId);

      return {
        predictions,
        currentContextId,
        currentContextName,
        modelSize,
        accuracy,
      };
    } catch (error) {
      console.error('[PredictiveIntent] Prediction failed:', error);
      return {
        predictions: [],
        currentContextId: null,
        currentContextName: null,
        modelSize: 0,
        accuracy: { total: 0, accepted: 0, dismissed: 0, expired: 0, accuracyRate: 0 },
      };
    }
  },

  /**
   * Store predictions in the DB for tracking accuracy.
   */
  storePredictions: (
    projectId: string,
    predictions: IntentPrediction[],
    fromContextId: string | null,
    fromContextName: string | null
  ): void => {
    // Expire any existing active predictions before creating new ones
    predictiveIntentDb.expireOldPredictions(projectId, 0);

    for (const p of predictions) {
      if (p.confidence < 0.1) continue; // Don't store very low confidence predictions
      try {
        predictiveIntentDb.createPrediction({
          id: generateId(),
          project_id: projectId,
          predicted_context_id: p.contextId,
          predicted_context_name: p.contextName,
          confidence: p.confidence,
          from_context_id: fromContextId,
          from_context_name: fromContextName,
          reasoning: p.reasoning,
        });
      } catch {
        // Skip on error
      }
    }
  },

  /**
   * Resolve a prediction (user accepted or dismissed).
   */
  resolvePrediction: (predictionId: string, action: 'accepted' | 'dismissed'): void => {
    predictiveIntentDb.resolvePrediction(predictionId, action);
  },

  /**
   * Full refresh: re-ingest transitions and generate new predictions.
   * Called after reflection cycles.
   */
  refresh: (projectId: string): PredictionResult => {
    // Ingest latest transitions
    predictiveIntentEngine.ingestTransitions(projectId, 30);

    // Clean up old transitions
    predictiveIntentDb.deleteOldTransitions(projectId, 60);

    // Generate fresh predictions
    const result = predictiveIntentEngine.predict(projectId);

    // Store the predictions for accuracy tracking
    if (result.predictions.length > 0) {
      predictiveIntentEngine.storePredictions(
        projectId,
        result.predictions,
        result.currentContextId,
        result.currentContextName
      );
    }

    return result;
  },
};
