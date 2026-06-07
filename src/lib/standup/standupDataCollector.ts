/**
 * Standup Data Collector
 *
 * Single-pass data fetcher that gathers all data needed by both the
 * retrospective (LLM) and predictive (algorithmic) standup pipelines.
 * Eliminates duplicate DB queries and ensures both pipelines operate
 * on a coherent snapshot of the same data.
 */

import { behavioralSignalRepository } from '@/app/db/repositories/behavioral-signal.repository';
import { contextRepository } from '@/app/db/repositories/context.repository';
import { goalSignalRepository, goalSignalSummaryRepository } from '@/app/db/repositories/goal-lifecycle.repository';
import { goalRepository } from '@/app/db/repositories/goal.repository';
import { ideaRepository } from '@/app/db/repositories/idea.repository';
import { implementationLogRepository } from '@/app/db/repositories/implementation-log.repository';
import { scanRepository } from '@/app/db/repositories/scan.repository';
import { getBehavioralContext } from '@/lib/brain/behavioralContext';
import { StandupSourceData } from '@/app/db/models/standup.types';
import type { ActivitySignal } from '@/types/activity-signal';
import { fromGoalSignal, fromBehavioralSignal } from '@/lib/signals/activitySignalService';

// ── Collected data shape ──

export interface CollectedStandupData {
  projectId: string;

  /** Period-scoped retrospective source data */
  sourceData: StandupSourceData;

  /** All goals for the project (any status) */
  goals: ReturnType<typeof goalRepository.getGoalsByProject>;

  /** Goal signals keyed by goal ID (full DbGoalSignal for unified stream) */
  goalSignals: Map<string, import('@/app/db/models/types').DbGoalSignal[]>;

  /** Pre-computed signal summaries keyed by goal ID (from materialized view) */
  goalSignalSummaries: Map<string, import('@/app/db/models/types').DbGoalSignalSummary>;

  /** Behavioral context activity over 14 days */
  contextActivity14d: ReturnType<typeof behavioralSignalRepository.getContextActivity>;

  /** Behavioral context activity over 3 days */
  contextActivity3d: ReturnType<typeof behavioralSignalRepository.getContextActivity>;

  /** Velocity data: implementation count for current week */
  currentWeekLogCount: number;
  /** Velocity data: implementation count for previous week */
  previousWeekLogCount: number;
  /** Velocity data: accepted ideas count for current week */
  currentWeekAccepted: number;
  /** Velocity data: accepted ideas count for previous week */
  previousWeekAccepted: number;
  /** Velocity data: behavioral signals for current week */
  currentWeekSignals: ReturnType<typeof behavioralSignalRepository.getByTypeAndRange>;
  /** Velocity data: behavioral signals for previous week */
  previousWeekSignals: ReturnType<typeof behavioralSignalRepository.getByTypeAndRange>;

  /** Untested implementation logs */
  untestedLogs: ReturnType<typeof implementationLogRepository.getUntestedLogsByProject>;

  /** Behavioral context for blocker detection (revert rate, patterns) */
  behavioralContext: ReturnType<typeof getBehavioralContext>;

  /** Unified activity stream combining goal + behavioral signals */
  unifiedSignals: ActivitySignal[];
}

/**
 * Collect all standup data in a single pass.
 *
 * @param projectId - The project to collect data for
 * @param startISO  - Period start (ISO string) for retrospective scoping
 * @param endISO    - Period end (ISO string) for retrospective scoping
 */
export function collectStandupData(
  projectId: string,
  startISO: string,
  endISO: string
): CollectedStandupData {
  // ── Shared: contexts & goals (used by both pipelines) ──
  const contexts = contextRepository.getContextsByProject(projectId);
  const goals = goalRepository.getGoalsByProject(projectId);

  // ── Retrospective: period-scoped data ──
  const periodLogs = implementationLogRepository.getLogsByProjectInRange(projectId, startISO, endISO);
  const periodIdeas = ideaRepository.getIdeasByProjectInRange(projectId, startISO, endISO);
  const periodScans = scanRepository.getScansByProjectInRange(projectId, startISO, endISO);

  const sourceData: StandupSourceData = {
    implementationLogs: periodLogs.map((log) => ({
      id: log.id,
      title: log.title,
      overview: log.overview,
      contextId: log.context_id,
      requirementName: log.requirement_name,
      createdAt: log.created_at,
    })),
    ideas: periodIdeas.map((idea) => ({
      id: idea.id,
      title: idea.title,
      description: idea.description,
      status: idea.status,
      scanType: idea.scan_type,
      category: idea.category,
      effort: idea.effort,
      impact: idea.impact,
      createdAt: idea.created_at,
      implementedAt: idea.implemented_at,
    })),
    scans: periodScans.map((scan) => ({
      id: scan.id,
      scanType: scan.scan_type,
      summary: scan.summary,
      createdAt: scan.created_at,
    })),
    contexts: contexts.map((ctx) => ({
      id: ctx.id,
      name: ctx.name,
      implementedTasks: ctx.implemented_tasks || 0,
    })),
  };

  // ── Predictive: goal signals (single batch query replaces N+1) ──
  const activeGoals = goals.filter(g => g.status === 'open' || g.status === 'in_progress');
  const activeGoalIds = activeGoals.map(g => g.id);
  const goalSignals = goalSignalRepository.getRecentByGoalIds(activeGoalIds, 20);

  // ── Predictive: pre-computed signal summaries (single query from materialized view) ──
  const goalSignalSummaries = goalSignalSummaryRepository.getByGoalIds(activeGoalIds);

  // ── Predictive: context decay signals ──
  const contextActivity14d = behavioralSignalRepository.getContextActivity(projectId, 14);
  const contextActivity3d = behavioralSignalRepository.getContextActivity(projectId, 3);

  // ── Predictive: velocity comparison (current vs previous week) ──
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const weekAgoISO = weekAgo.toISOString();
  const twoWeeksAgoISO = twoWeeksAgo.toISOString();
  const nowISO = now.toISOString();

  const currentWeekLogCount = implementationLogRepository.countLogsByProjectInRange(projectId, weekAgoISO, nowISO);
  const previousWeekLogCount = implementationLogRepository.countLogsByProjectInRange(projectId, twoWeeksAgoISO, weekAgoISO);
  const currentWeekAccepted = ideaRepository.countIdeasByProjectInRange(projectId, weekAgoISO, nowISO, 'accepted');
  const previousWeekAccepted = ideaRepository.countIdeasByProjectInRange(projectId, twoWeeksAgoISO, weekAgoISO, 'accepted');
  const currentWeekSignals = behavioralSignalRepository.getByTypeAndRange(projectId, 'implementation', weekAgoISO, nowISO);
  const previousWeekSignals = behavioralSignalRepository.getByTypeAndRange(projectId, 'implementation', twoWeeksAgoISO, weekAgoISO);

  // ── Predictive: untested logs & behavioral context ──
  let untestedLogs: ReturnType<typeof implementationLogRepository.getUntestedLogsByProject> = [];
  try {
    untestedLogs = implementationLogRepository.getUntestedLogsByProject(projectId);
  } catch { /* silent - non-critical */ }

  const behavioralContext = getBehavioralContext(projectId, 7);

  // ── Unified activity stream ──
  // Build a merged signal stream from already-fetched goal + behavioral signals.
  // Goal context IDs are resolved from the goals list (no extra DB call).
  const goalContextLookup = new Map<string, string | null>();
  for (const g of goals) {
    goalContextLookup.set(g.id, g.context_id);
  }

  const unifiedSignals: ActivitySignal[] = [];

  for (const [goalId, signals] of goalSignals) {
    const ctxId = goalContextLookup.get(goalId) ?? null;
    for (const sig of signals) {
      unifiedSignals.push(fromGoalSignal(sig, ctxId));
    }
  }

  for (const bs of [...currentWeekSignals, ...previousWeekSignals]) {
    unifiedSignals.push(fromBehavioralSignal(bs));
  }

  unifiedSignals.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return {
    projectId,
    sourceData,
    goals,
    goalSignals,
    goalSignalSummaries,
    contextActivity14d,
    contextActivity3d,
    currentWeekLogCount,
    previousWeekLogCount,
    currentWeekAccepted,
    previousWeekAccepted,
    currentWeekSignals,
    previousWeekSignals,
    untestedLogs,
    behavioralContext,
    unifiedSignals,
  };
}
