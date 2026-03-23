/**
 * Standup Service Layer
 *
 * Pure business logic for standup data gathering, response transformation,
 * prediction caching, and the unified standup pipeline.
 *
 * The unified pipeline (generateUnifiedStandup) fetches all data once via
 * StandupDataCollector, then feeds both the retrospective LLM summary and
 * the algorithmic predictive analysis from the same dataset.
 */

import { standupDb, implementationLogDb, ideaDb, scanDb, contextDb } from '@/app/db';
import {
  StandupSummaryResponse,
  StandupSourceData,
  DbStandupSummary,
  PredictiveStandupData,
} from '@/app/db/models/standup.types';
import { StandupBlockerSchema, StandupHighlightSchema, StandupFocusAreaSchema, parseStandupJsonArray } from '@/lib/api/schemas/standup';
import { generatePredictiveStandup } from '@/lib/standup/predictiveStandupEngine';
import { generateStandupSummary } from '@/lib/standup/standupGenerator';
import { collectStandupData } from '@/lib/standup/standupDataCollector';

// ── Prediction Cache ──

const PREDICTION_CACHE_TTL = 5 * 60 * 1000;
const predictionCache = new Map<string, { data: PredictiveStandupData; expiry: number }>();

/**
 * Get cached predictive standup data, regenerating if expired.
 */
export function getCachedPredictions(projectId: string): PredictiveStandupData | null {
  const cached = predictionCache.get(projectId);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }
  predictionCache.delete(projectId);
  try {
    const data = generatePredictiveStandup(projectId);
    predictionCache.set(projectId, { data, expiry: Date.now() + PREDICTION_CACHE_TTL });
    return data;
  } catch {
    return null;
  }
}

/**
 * Store predictions in cache (used by unified pipeline to avoid redundant generation).
 */
export function cachePredictions(projectId: string, data: PredictiveStandupData): void {
  predictionCache.set(projectId, { data, expiry: Date.now() + PREDICTION_CACHE_TTL });
}

/**
 * Invalidate the prediction cache for a project.
 */
export function invalidatePredictionCache(projectId: string): void {
  predictionCache.delete(projectId);
}

// ── Response Transformation ──

/**
 * Transform a database standup summary record into the API response shape.
 */
export function formatSummaryResponse(record: DbStandupSummary): StandupSummaryResponse {
  return {
    id: record.id,
    projectId: record.project_id,
    periodType: record.period_type,
    periodStart: record.period_start,
    periodEnd: record.period_end,
    title: record.title,
    summary: record.summary,
    stats: {
      implementationsCount: record.implementations_count,
      ideasGenerated: record.ideas_generated,
      ideasAccepted: record.ideas_accepted,
      ideasRejected: record.ideas_rejected,
      ideasImplemented: record.ideas_implemented,
      scansCount: record.scans_count,
    },
    blockers: parseStandupJsonArray(StandupBlockerSchema, record.blockers, 'blockers'),
    highlights: parseStandupJsonArray(StandupHighlightSchema, record.highlights, 'highlights'),
    insights: {
      velocityTrend: record.velocity_trend,
      burnoutRisk: record.burnout_risk,
      focusAreas: parseStandupJsonArray(StandupFocusAreaSchema, record.focus_areas, 'focus_areas'),
    },
    generatedAt: record.generated_at,
  };
}

// ── Source Data Gathering (legacy - kept for backward compat) ──

/**
 * Gather all source data needed for standup generation from the database.
 * @deprecated Prefer `collectStandupData()` for unified pipeline use.
 */
export function gatherStandupSourceData(
  projectId: string,
  startISO: string,
  endISO: string
): StandupSourceData {
  const periodLogs = implementationLogDb.getLogsByProjectInRange(projectId, startISO, endISO);
  const periodIdeas = ideaDb.getIdeasByProjectInRange(projectId, startISO, endISO);
  const periodScans = scanDb.getScansByProjectInRange(projectId, startISO, endISO);
  const contexts = contextDb.getContextsByProject(projectId);

  return {
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
}

// ── Content Hash Check ──

/**
 * Check if an existing summary's stats match the current period data,
 * allowing us to skip an expensive LLM call when data hasn't changed.
 */
export function isDataUnchanged(
  existing: DbStandupSummary,
  sourceData: StandupSourceData
): boolean {
  const ideasAccepted = sourceData.ideas.filter((i) => i.status === 'accepted').length;
  const ideasRejected = sourceData.ideas.filter((i) => i.status === 'rejected').length;
  const ideasImplemented = sourceData.ideas.filter((i) => i.status === 'implemented').length;

  return (
    existing.implementations_count === sourceData.implementationLogs.length &&
    existing.ideas_generated === sourceData.ideas.length &&
    existing.ideas_accepted === ideasAccepted &&
    existing.ideas_rejected === ideasRejected &&
    existing.ideas_implemented === ideasImplemented &&
    existing.scans_count === sourceData.scans.length
  );
}

// ── Existing Summary Lookup ──

/**
 * Look up an existing standup summary for the given period.
 */
export function getExistingSummary(
  projectId: string,
  periodType: 'daily' | 'weekly',
  periodStartStr: string
) {
  return standupDb.getSummaryByPeriod(projectId, periodType, periodStartStr);
}

/**
 * Save (upsert) a standup summary to the database.
 */
export function saveSummary(summary: Omit<DbStandupSummary, 'created_at' | 'updated_at'>) {
  return standupDb.upsertSummary(summary);
}

// ── Unified Pipeline ──

export interface UnifiedStandupResult {
  summary: StandupSummaryResponse;
  predictions: PredictiveStandupData;
  cached: boolean;
}

/**
 * Generate a complete standup (retrospective + predictive) in a single pipeline.
 *
 * This is the primary entry point that replaces separate calls to
 * generateStandupSummary() and generatePredictiveStandup().
 * It fetches all data once, then feeds both pipelines from the same dataset.
 */
export async function generateUnifiedStandup(
  projectId: string,
  periodType: 'daily' | 'weekly',
  periodStart: Date,
  periodEnd: Date,
  forceRegenerate: boolean
): Promise<UnifiedStandupResult> {
  const periodStartStr = periodStart.toISOString().split('T')[0];

  // Check for existing summary (fast path)
  const existing = getExistingSummary(projectId, periodType, periodStartStr);
  if (existing && !forceRegenerate) {
    const summary = formatSummaryResponse(existing);
    const predictions = getCachedPredictions(projectId) ?? generatePredictiveStandup(projectId);
    return { summary, predictions, cached: true };
  }

  // ── Single-pass data collection ──
  const startISO = periodStart.toISOString();
  const endISO = periodEnd.toISOString();
  const collected = collectStandupData(projectId, startISO, endISO);

  // Content hash check: skip LLM call when data hasn't changed
  if (existing && forceRegenerate && isDataUnchanged(existing, collected.sourceData)) {
    const summary = formatSummaryResponse(existing);
    // Still generate fresh predictions from collected data
    const predictions = generatePredictiveStandup(projectId, collected);
    cachePredictions(projectId, predictions);
    return { summary, predictions, cached: true };
  }

  // ── Run both pipelines from the same dataset ──
  const predictions = generatePredictiveStandup(projectId, collected);
  const result = await generateStandupSummary(
    projectId,
    collected.sourceData,
    periodType,
    periodStart,
    periodEnd,
    predictions
  );

  if (!result.success || !result.summary) {
    throw new Error(result.error || 'Failed to generate standup summary');
  }

  const saved = saveSummary(result.summary);
  const summary = formatSummaryResponse(saved);

  // Cache predictions so /api/standup/predict can reuse them
  cachePredictions(projectId, predictions);

  return { summary, predictions, cached: false };
}
