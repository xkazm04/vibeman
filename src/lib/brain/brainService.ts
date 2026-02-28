/**
 * Brain Service — Unified Orchestration Layer
 *
 * Centralizes all brain subsystem orchestration: signal recording,
 * reflection lifecycle, insight management, and behavioral context.
 * API routes delegate to this service as thin controllers.
 *
 * Owns cross-cutting concerns:
 * - Context cache invalidation (moved from API route)
 * - Insight deduplication & conflict detection
 * - Transaction boundaries for reflection completion
 * - Concurrency control for parallel completions
 */

import { reflectionAgent } from '@/lib/brain/reflectionAgent';
import { signalCollector } from '@/lib/brain/signalCollector';
import { getBehavioralContext } from '@/lib/brain/behavioralContext';
import { detectConflicts, markConflictsOnInsights } from '@/lib/brain/insightConflictDetector';
import { normalize, tokenOverlap, DEDUP_THRESHOLD } from '@/lib/brain/insightSimilarity';
import { autoPruneInsights, type AutoPruneResult } from '@/lib/brain/insightAutoPruner';
import { predictiveIntentEngine } from '@/lib/brain/predictiveIntentEngine';
import { brainReflectionDb, brainInsightDb, behavioralSignalDb } from '@/app/db';
import { getDatabase } from '@/app/db/connection';
import { getHotWritesDatabase } from '@/app/db/hot-writes';
import type { LearningInsight, BehavioralSignalType, ReflectionTriggerType, EvidenceRef } from '@/app/db/models/brain.types';

// ---------------------------------------------------------------------------
// Evidence coercion (LLM returns plain string IDs → classify by prefix)
// ---------------------------------------------------------------------------

function coerceEvidence(raw: unknown): EvidenceRef[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item): EvidenceRef => {
    if (typeof item === 'object' && item !== null && 'type' in item && 'id' in item) {
      return item as EvidenceRef;
    }
    const id = String(item);
    if (id.startsWith('sig_')) return { type: 'signal', id };
    if (id.startsWith('ref_') || id.startsWith('br_')) return { type: 'reflection', id };
    return { type: 'direction', id };
  });
}

// ---------------------------------------------------------------------------
// Context cache (moved from api/brain/context/route.ts)
// ---------------------------------------------------------------------------

const contextCache = new Map<string, { data: unknown; expiry: number }>();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

/**
 * Invalidate cached behavioral context for a project.
 * Called after signals are recorded, deleted, or decayed.
 */
export function invalidateContextCache(projectId: string): void {
  for (const key of contextCache.keys()) {
    if (key.startsWith(`${projectId}:`)) {
      contextCache.delete(key);
    }
  }
}

// ---------------------------------------------------------------------------
// Insight deduplication
// ---------------------------------------------------------------------------

function deduplicateInsights(
  newInsights: LearningInsight[],
  existingInsights: LearningInsight[]
): LearningInsight[] {
  if (existingInsights.length === 0) return newInsights;

  const result: LearningInsight[] = [];

  for (const insight of newInsights) {
    const match = existingInsights.find(existing => {
      if (existing.type !== insight.type) return false;
      return tokenOverlap(insight.title, existing.title) >= DEDUP_THRESHOLD;
    });

    if (!match) {
      result.push(insight);
    } else if (insight.confidence > match.confidence + 10) {
      result.push({ ...insight, evolves: match.title });
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Concurrency lock for reflection completion
// ---------------------------------------------------------------------------

const activeCompletions = new Set<string>();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface RecordSignalInput {
  projectId: string;
  signalType: BehavioralSignalType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  contextId?: string;
  contextName?: string;
}

/**
 * Record a behavioral signal and invalidate the context cache.
 * Callers are responsible for validating data shape before calling.
 */
export function recordSignal(input: RecordSignalInput): void {
  const { projectId, signalType, data, contextId, contextName } = input;

  switch (signalType) {
    case 'git_activity':
      signalCollector.recordGitActivity(projectId, data, contextId, contextName);
      break;
    case 'api_focus':
      signalCollector.recordApiFocus(projectId, data, contextId, contextName);
      break;
    case 'context_focus':
      signalCollector.recordContextFocus(projectId, data);
      break;
    case 'implementation':
      signalCollector.recordImplementation(projectId, data);
      break;
    case 'cli_memory':
      signalCollector.recordCliMemory(projectId, data, contextId, contextName);
      break;
  }

  invalidateContextCache(projectId);
}

/**
 * Delete a signal by ID and invalidate the context cache.
 * Returns false if signal not found.
 */
export function deleteSignal(signalId: string): boolean {
  const hotDb = getHotWritesDatabase();
  const signal = hotDb.prepare('SELECT project_id FROM behavioral_signals WHERE id = ?').get(signalId) as { project_id: string } | undefined;

  const deleted = behavioralSignalDb.deleteById(signalId);
  if (!deleted) return false;

  if (signal?.project_id) {
    invalidateContextCache(signal.project_id);
  }
  return true;
}

export interface StartReflectionInput {
  projectId: string;
  projectName: string;
  projectPath: string;
  triggerType?: ReflectionTriggerType;
}

/**
 * Start a per-project reflection session.
 */
export async function startReflection(input: StartReflectionInput) {
  const { projectId, projectName, projectPath, triggerType = 'manual' } = input;
  return reflectionAgent.startReflection(projectId, projectName, projectPath, triggerType);
}

export interface StartGlobalReflectionInput {
  projects: Array<{ id: string; name: string; path: string }>;
  workspacePath: string;
}

/**
 * Start a global (workspace-wide) reflection session.
 */
export async function startGlobalReflection(input: StartGlobalReflectionInput) {
  return reflectionAgent.startGlobalReflection(input.projects, input.workspacePath);
}

export interface CompleteReflectionInput {
  reflectionId: string;
  directionsAnalyzed: number;
  outcomesAnalyzed: number;
  signalsAnalyzed: number;
  insights: LearningInsight[];
  guideSectionsUpdated?: string[];
}

export interface CompleteReflectionResult {
  success: boolean;
  error?: string;
  status?: number;
  reflection?: unknown;
  summary?: {
    directionsAnalyzed: number;
    outcomesAnalyzed: number;
    signalsAnalyzed: number;
    insightsSubmitted: number;
    insightsAfterDedup: number;
    duplicatesRemoved: number;
    conflictsDetected: number;
    sectionsUpdated: number;
  };
  autoPrune?: {
    misleadingDemoted: number;
    conflictsAutoResolved: number;
    conflictsRemaining: number;
    actions: AutoPruneResult['actions'];
  };
}

/**
 * Complete a reflection session:
 * dedup insights, detect conflicts, store, prune, refresh intent.
 *
 * Runs inside a transaction with per-project concurrency lock.
 */
export function completeReflection(input: CompleteReflectionInput): CompleteReflectionResult {
  const { reflectionId, directionsAnalyzed, outcomesAnalyzed, signalsAnalyzed, insights, guideSectionsUpdated } = input;

  // Verify reflection exists and is running
  const reflection = brainReflectionDb.getById(reflectionId);
  if (!reflection) {
    return { success: false, error: 'Reflection not found', status: 404 };
  }

  if (reflection.status !== 'running' && reflection.status !== 'pending') {
    return { success: false, error: `Reflection is ${reflection.status}, cannot complete`, status: 400 };
  }

  // Validate insights structure
  const validatedInsights: LearningInsight[] = [];
  if (Array.isArray(insights)) {
    for (const insight of insights) {
      if (
        insight.type &&
        insight.title &&
        insight.description &&
        typeof insight.confidence === 'number'
      ) {
        validatedInsights.push({
          type: insight.type,
          title: insight.title,
          description: insight.description,
          confidence: insight.confidence,
          evidence: coerceEvidence(insight.evidence),
        });
      }
    }
  }

  // Prevent concurrent completions for the same project
  const projectId = reflection.project_id;
  if (activeCompletions.has(projectId)) {
    return { success: false, error: 'Another reflection completion is already in progress for this project', status: 409 };
  }

  activeCompletions.add(projectId);
  let dedupedInsights: LearningInsight[] = [];
  let conflictsDetected = 0;
  let autoPruneResult: AutoPruneResult | null = null;

  try {
    const db = getDatabase();
    const runCompletion = db.transaction(() => {
      // Deduplicate insights against previously stored ones
      const existingInsights = brainInsightDb.getAllInsights(projectId);
      dedupedInsights = deduplicateInsights(validatedInsights, existingInsights);

      // Detect conflicts between new insights and existing insights
      for (const insight of dedupedInsights) {
        const conflicts = detectConflicts(insight, existingInsights);
        if (conflicts.length > 0) {
          const topConflict = conflicts.sort((a, b) => b.confidence - a.confidence)[0];
          insight.conflict_with = topConflict.insight2Title;
          insight.conflict_type = topConflict.conflictType;
          insight.conflict_resolved = false;
          conflictsDetected++;
        }
      }

      // Detect conflicts within the new insights themselves
      conflictsDetected += markConflictsOnInsights(dedupedInsights);

      // Complete the reflection (update status and analysis counts)
      const success = reflectionAgent.completeReflection(reflectionId, {
        directionsAnalyzed,
        outcomesAnalyzed,
        signalsAnalyzed,
        guideSectionsUpdated: Array.isArray(guideSectionsUpdated) ? guideSectionsUpdated : [],
      });

      if (!success) {
        throw new Error('Failed to complete reflection');
      }

      // Insert insights into the first-class brain_insights table
      brainInsightDb.createBatch(reflectionId, projectId, dedupedInsights);

      // Run auto-pruning: demote misleading insights and auto-resolve clear conflicts
      autoPruneResult = autoPruneInsights(projectId);
    });

    runCompletion();
  } catch (txError) {
    if (txError instanceof Error && txError.message === 'Failed to complete reflection') {
      return { success: false, error: 'Failed to complete reflection', status: 500 };
    }
    throw txError;
  } finally {
    activeCompletions.delete(projectId);
  }

  // Refresh predictive intent model after reflection cycle (non-critical)
  try {
    predictiveIntentEngine.refresh(projectId);
  } catch {
    // Don't block reflection completion
  }

  const updatedReflection = brainReflectionDb.getById(reflectionId);

  return {
    success: true,
    reflection: updatedReflection,
    summary: {
      directionsAnalyzed,
      outcomesAnalyzed,
      signalsAnalyzed,
      insightsSubmitted: validatedInsights.length,
      insightsAfterDedup: dedupedInsights.length,
      duplicatesRemoved: validatedInsights.length - dedupedInsights.length,
      conflictsDetected,
      sectionsUpdated: guideSectionsUpdated?.length || 0,
    },
    autoPrune: {
      misleadingDemoted: autoPruneResult!.misleadingDemoted,
      conflictsAutoResolved: autoPruneResult!.conflictsAutoResolved,
      conflictsRemaining: autoPruneResult!.conflictsRemaining,
      actions: autoPruneResult!.actions,
    },
  };
}

export interface GetContextOptions {
  projectId: string;
  windowDays?: number;
  noCache?: boolean;
}

/**
 * Get behavioral context for a project with caching.
 */
export function getContext(options: GetContextOptions): { context: unknown; cached: boolean } {
  const { projectId, windowDays = 7, noCache = false } = options;
  const cacheKey = `${projectId}:${windowDays}`;

  // Check cache
  if (!noCache) {
    const cached = contextCache.get(cacheKey);
    if (cached && Date.now() < cached.expiry) {
      return { context: cached.data, cached: true };
    }
  }

  // Clean up expired entries on miss
  const now = Date.now();
  for (const [key, value] of contextCache.entries()) {
    if (now > value.expiry) contextCache.delete(key);
  }

  const context = getBehavioralContext(projectId, windowDays);

  contextCache.set(cacheKey, {
    data: context,
    expiry: Date.now() + CACHE_TTL_MS,
  });

  return { context, cached: false };
}

/**
 * Apply decay to signals and invalidate context cache.
 */
export function applySignalDecay(
  projectId: string,
  decayFactor: number,
  retentionDays: number
): { decayed: number; deleted: number } {
  const decayed = behavioralSignalDb.applyDecay(projectId, decayFactor, 7);
  const deleted = behavioralSignalDb.deleteOld(projectId, retentionDays);
  invalidateContextCache(projectId);
  return { decayed, deleted };
}
