/**
 * Standup Data Collector
 *
 * Single-pass data fetcher that gathers all data needed by both the
 * retrospective (LLM) and predictive (algorithmic) standup pipelines.
 * Eliminates duplicate DB queries and ensures both pipelines operate
 * on a coherent snapshot of the same data.
 */

import {
  goalDb,
  goalSignalDb,
  implementationLogDb,
  behavioralSignalDb,
  contextDb,
  ideaDb,
  scanDb,
} from '@/app/db';
import { getBehavioralContext } from '@/lib/brain/behavioralContext';
import { StandupSourceData } from '@/app/db/models/standup.types';

// ── Collected data shape ──

export interface CollectedStandupData {
  projectId: string;

  /** Period-scoped retrospective source data */
  sourceData: StandupSourceData;

  /** All goals for the project (any status) */
  goals: ReturnType<typeof goalDb.getGoalsByProject>;

  /** Goal signals keyed by goal ID */
  goalSignals: Map<string, Array<{ created_at: string }>>;

  /** Behavioral context activity over 14 days */
  contextActivity14d: ReturnType<typeof behavioralSignalDb.getContextActivity>;

  /** Behavioral context activity over 3 days */
  contextActivity3d: ReturnType<typeof behavioralSignalDb.getContextActivity>;

  /** Velocity data: implementation count for current week */
  currentWeekLogCount: number;
  /** Velocity data: implementation count for previous week */
  previousWeekLogCount: number;
  /** Velocity data: accepted ideas count for current week */
  currentWeekAccepted: number;
  /** Velocity data: accepted ideas count for previous week */
  previousWeekAccepted: number;
  /** Velocity data: behavioral signals for current week */
  currentWeekSignals: ReturnType<typeof behavioralSignalDb.getByTypeAndRange>;
  /** Velocity data: behavioral signals for previous week */
  previousWeekSignals: ReturnType<typeof behavioralSignalDb.getByTypeAndRange>;

  /** Untested implementation logs */
  untestedLogs: ReturnType<typeof implementationLogDb.getUntestedLogsByProject>;

  /** Behavioral context for blocker detection (revert rate, patterns) */
  behavioralContext: ReturnType<typeof getBehavioralContext>;
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
  const contexts = contextDb.getContextsByProject(projectId);
  const goals = goalDb.getGoalsByProject(projectId);

  // ── Retrospective: period-scoped data ──
  const periodLogs = implementationLogDb.getLogsByProjectInRange(projectId, startISO, endISO);
  const periodIdeas = ideaDb.getIdeasByProjectInRange(projectId, startISO, endISO);
  const periodScans = scanDb.getScansByProjectInRange(projectId, startISO, endISO);

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

  // ── Predictive: goal signals ──
  const activeGoals = goals.filter(g => g.status === 'open' || g.status === 'in_progress');
  const goalSignals = new Map<string, Array<{ created_at: string }>>();
  for (const goal of activeGoals) {
    goalSignals.set(goal.id, goalSignalDb.getByGoal(goal.id, 20));
  }

  // ── Predictive: context decay signals ──
  const contextActivity14d = behavioralSignalDb.getContextActivity(projectId, 14);
  const contextActivity3d = behavioralSignalDb.getContextActivity(projectId, 3);

  // ── Predictive: velocity comparison (current vs previous week) ──
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const weekAgoISO = weekAgo.toISOString();
  const twoWeeksAgoISO = twoWeeksAgo.toISOString();
  const nowISO = now.toISOString();

  const currentWeekLogCount = implementationLogDb.countLogsByProjectInRange(projectId, weekAgoISO, nowISO);
  const previousWeekLogCount = implementationLogDb.countLogsByProjectInRange(projectId, twoWeeksAgoISO, weekAgoISO);
  const currentWeekAccepted = ideaDb.countIdeasByProjectInRange(projectId, weekAgoISO, nowISO, 'accepted');
  const previousWeekAccepted = ideaDb.countIdeasByProjectInRange(projectId, twoWeeksAgoISO, weekAgoISO, 'accepted');
  const currentWeekSignals = behavioralSignalDb.getByTypeAndRange(projectId, 'implementation', weekAgoISO, nowISO);
  const previousWeekSignals = behavioralSignalDb.getByTypeAndRange(projectId, 'implementation', twoWeeksAgoISO, weekAgoISO);

  // ── Predictive: untested logs & behavioral context ──
  let untestedLogs: ReturnType<typeof implementationLogDb.getUntestedLogsByProject> = [];
  try {
    untestedLogs = implementationLogDb.getUntestedLogsByProject(projectId);
  } catch { /* silent - non-critical */ }

  const behavioralContext = getBehavioralContext(projectId, 7);

  return {
    projectId,
    sourceData,
    goals,
    goalSignals,
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
  };
}
