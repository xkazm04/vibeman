/**
 * Unified Activity Signal Service
 *
 * Bridges goal_signals (goals.db) and behavioral_signals (hot-writes.db)
 * into a single ActivitySignal stream. Consumers get one consistent shape
 * regardless of which domain produced the signal.
 */

import {
  goalSignalDb,
  goalDb,
  behavioralSignalDb,
} from '@/app/db';
import type { DbGoalSignal } from '@/app/db/models/types';
import type { DbBehavioralSignal } from '@/app/db/models/brain.types';
import type {
  ActivitySignal,
  ActivityStreamQuery,
  ActivityAggregate,
} from '@/types/activity-signal';

// ──────────────────────────────────────────────
// Mappers: domain-specific → unified
// ──────────────────────────────────────────────

/**
 * Map a goal signal to the unified ActivitySignal shape.
 * Optionally accepts a pre-resolved contextId (from the parent goal)
 * to avoid an extra DB lookup.
 */
export function fromGoalSignal(
  signal: DbGoalSignal,
  contextId?: string | null
): ActivitySignal {
  return {
    id: signal.id,
    source: 'goal',
    type: signal.signal_type,
    weight: signal.progress_delta || 0,
    projectId: signal.project_id,
    contextId: contextId ?? null,
    timestamp: signal.created_at,
    data: signal.metadata,
    description: signal.description,
    goalId: signal.goal_id,
    sourceEntityId: signal.source_id,
  };
}

/**
 * Map a behavioral signal to the unified ActivitySignal shape.
 */
export function fromBehavioralSignal(
  signal: DbBehavioralSignal
): ActivitySignal {
  return {
    id: signal.id,
    source: 'behavioral',
    type: signal.signal_type,
    weight: signal.weight,
    projectId: signal.project_id,
    contextId: signal.context_id,
    timestamp: signal.timestamp,
    data: signal.data,
    description: null,
    goalId: null,
    sourceEntityId: null,
  };
}

// ──────────────────────────────────────────────
// Unified Query
// ──────────────────────────────────────────────

/**
 * Query the unified activity stream across both signal databases.
 * Results are merged and sorted by timestamp descending.
 */
export function queryActivityStream(query: ActivityStreamQuery): ActivitySignal[] {
  const {
    projectId,
    contextId,
    sources,
    types,
    since,
    until,
    limit = 100,
  } = query;

  const includeGoal = !sources || sources.includes('goal');
  const includeBehavioral = !sources || sources.includes('behavioral');

  const signals: ActivitySignal[] = [];

  // ── Goal signals ──
  if (includeGoal) {
    const goalSignals = fetchGoalSignals(projectId, contextId, since, limit);
    for (const { signal, resolvedContextId } of goalSignals) {
      if (until && signal.created_at > until) continue;
      const unified = fromGoalSignal(signal, resolvedContextId);
      if (types && !types.includes(unified.type)) continue;
      signals.push(unified);
    }
  }

  // ── Behavioral signals ──
  if (includeBehavioral) {
    const behavioralSignals = behavioralSignalDb.getByProject(projectId, {
      contextId,
      since,
      limit,
    });
    for (const bs of behavioralSignals) {
      if (until && bs.timestamp > until) continue;
      const unified = fromBehavioralSignal(bs);
      if (types && !types.includes(unified.type)) continue;
      signals.push(unified);
    }
  }

  // Merge and sort by timestamp descending
  signals.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return signals.slice(0, limit);
}

/**
 * Get aggregated activity stats for a project, optionally filtered by context.
 * Combines weight totals from both signal domains.
 */
export function getActivityAggregate(
  projectId: string,
  windowDays: number = 14,
  contextId?: string
): ActivityAggregate[] {
  // Behavioral: context-level aggregation
  const behavioralActivity = behavioralSignalDb.getContextActivity(projectId, windowDays);

  // Goal: aggregate signals per context (via goal→context mapping)
  const goals = goalDb.getGoalsByProject(projectId);
  const goalContextMap = new Map<string, string[]>();
  for (const goal of goals) {
    if (goal.context_id) {
      const existing = goalContextMap.get(goal.context_id) || [];
      existing.push(goal.id);
      goalContextMap.set(goal.context_id, existing);
    }
  }

  // Build unified aggregates keyed by contextId
  const aggregateMap = new Map<string, ActivityAggregate>();

  // Seed from behavioral activity
  for (const ba of behavioralActivity) {
    if (contextId && ba.context_id !== contextId) continue;
    const key = ba.context_id || '__none__';
    const existing = aggregateMap.get(key) || createEmptyAggregate(ba.context_id, ba.context_name);
    existing.signalCount += ba.signal_count;
    existing.totalWeight += ba.total_weight;
    existing.bySource.behavioral.count += ba.signal_count;
    existing.bySource.behavioral.weight += ba.total_weight;
    aggregateMap.set(key, existing);
  }

  // Add goal signal contributions per context
  for (const [ctxId, goalIds] of goalContextMap) {
    if (contextId && ctxId !== contextId) continue;
    const signalMap = goalSignalDb.getRecentByGoalIds(goalIds, 50);
    let goalCount = 0;
    let goalWeight = 0;
    for (const [, signals] of signalMap) {
      goalCount += signals.length;
      goalWeight += signals.reduce((sum, s) => sum + (s.progress_delta || 0), 0);
    }
    if (goalCount > 0) {
      const key = ctxId;
      const existing = aggregateMap.get(key) || createEmptyAggregate(ctxId);
      existing.signalCount += goalCount;
      existing.totalWeight += goalWeight;
      existing.bySource.goal.count += goalCount;
      existing.bySource.goal.weight += goalWeight;
      aggregateMap.set(key, existing);
    }
  }

  return Array.from(aggregateMap.values())
    .sort((a, b) => b.totalWeight - a.totalWeight);
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function createEmptyAggregate(contextId: string | null, contextName?: string): ActivityAggregate {
  return {
    contextId,
    contextName,
    signalCount: 0,
    totalWeight: 0,
    bySource: {
      goal: { count: 0, weight: 0 },
      behavioral: { count: 0, weight: 0 },
    },
  };
}

/**
 * Fetch goal signals for a project, resolving each signal's contextId
 * from its parent goal. Optionally filters to a specific context.
 */
function fetchGoalSignals(
  projectId: string,
  contextId?: string,
  since?: string,
  limit: number = 100
): Array<{ signal: DbGoalSignal; resolvedContextId: string | null }> {
  const goals = goalDb.getGoalsByProject(projectId);
  const goalContextLookup = new Map<string, string | null>();

  // Filter goals to the requested context if provided
  const relevantGoals = contextId
    ? goals.filter(g => g.context_id === contextId)
    : goals;

  for (const g of relevantGoals) {
    goalContextLookup.set(g.id, g.context_id);
  }

  if (relevantGoals.length === 0) return [];

  const goalIds = relevantGoals.map(g => g.id);
  const signalMap = goalSignalDb.getRecentByGoalIds(goalIds, limit);

  const results: Array<{ signal: DbGoalSignal; resolvedContextId: string | null }> = [];
  for (const [goalId, signals] of signalMap) {
    const ctx = goalContextLookup.get(goalId) ?? null;
    for (const signal of signals) {
      if (since && signal.created_at < since) continue;
      results.push({ signal, resolvedContextId: ctx });
    }
  }

  return results;
}
