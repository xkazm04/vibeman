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
import { autoPruneInsights, type AutoPruneResult } from '@/lib/brain/insightAutoPruner';
import { InsightDeduplicator } from '@/lib/brain/InsightDeduplicator';
import { embedTexts } from '@/lib/brain/embeddings';
import { predictiveIntentEngine } from '@/lib/brain/predictiveIntentEngine';
import { behavioralSignalRepository } from '@/app/db/repositories/behavioral-signal.repository';
import { brainInsightRepository } from '@/app/db/repositories/brain-insight.repository';
import { brainReflectionRepository } from '@/app/db/repositories/brain-reflection.repository';
import { dbInsightToLearning } from '@/app/db/repositories/brain-insight.repository';
import { getDatabase } from '@/app/db/connection';
import { getHotWritesDatabase } from '@/app/db/hot-writes';
import type { LearningInsight, BehavioralSignalType, ReflectionTriggerType, EvidenceRef } from '@/app/db/models/brain.types';
import { SignalType } from '@/types/signals';
import { LRUCache } from '@/lib/brain/lruCache';
import { tryClusterSignals } from '@/lib/brain/signalClusterer';
import {
  CONTEXT_CACHE_MAX_ENTRIES,
  CONTEXT_CACHE_TTL_MS,
  COMPLETION_LOCK_TIMEOUT_MS,
  DECAY_START_FRACTION,
  DECAY_START_MIN_DAYS,
  DEFAULT_DECAY_FACTOR,
  DEFAULT_RETENTION_DAYS,
} from '@/lib/brain/config';

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

const contextCache = new LRUCache<string, { data: unknown; expiry: number }>(CONTEXT_CACHE_MAX_ENTRIES);
const CACHE_TTL_MS = CONTEXT_CACHE_TTL_MS;

/**
 * Invalidate cached behavioral context for a project.
 * Called after signals are recorded, deleted, or decayed.
 */
export function invalidateContextCache(projectId: string): void {
  contextCache.deleteMatching(key => key.startsWith(`${projectId}:`));
  // Also invalidate tech fingerprint cache for cross-project similarity
  try {
    const { invalidateFingerprintCache } = require('@/lib/brain/projectSimilarity');
    invalidateFingerprintCache(projectId);
  } catch { /* projectSimilarity module unavailable — skip */ }
}

// ---------------------------------------------------------------------------
// Concurrency lock for reflection completion
// ---------------------------------------------------------------------------

interface LockEntry {
  timestamp: number;
  reflectionId: string;
}

const activeCompletions = new Map<string, LockEntry>();
const LOCK_TIMEOUT_MS = COMPLETION_LOCK_TIMEOUT_MS;

/**
 * Generate a scope-aware lock key for reflection completion.
 * Format: "project:<projectId>" or "global"
 */
function getLockKey(projectId: string, scope: string): string {
  return scope === 'global' ? 'global' : `project:${projectId}`;
}

/**
 * Check and clean expired locks before acquiring a new one.
 */
function cleanExpiredLocks(): void {
  const now = Date.now();
  for (const [key, entry] of activeCompletions.entries()) {
    if (now - entry.timestamp > LOCK_TIMEOUT_MS) {
      activeCompletions.delete(key);
    }
  }
}

/**
 * Atomically acquire a lock for reflection completion.
 * @returns true if lock was acquired, false if another completion is in progress
 */
function tryAcquireLock(lockKey: string, reflectionId: string): boolean {
  cleanExpiredLocks();

  if (activeCompletions.has(lockKey)) {
    return false;
  }

  activeCompletions.set(lockKey, {
    timestamp: Date.now(),
    reflectionId,
  });
  return true;
}

/**
 * Release a lock for reflection completion.
 */
function releaseLock(lockKey: string): void {
  activeCompletions.delete(lockKey);
}

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
 * Record a behavioral signal, attempt session clustering, and invalidate cache.
 * Callers are responsible for validating data shape before calling.
 */
export function recordSignal(input: RecordSignalInput): void {
  const { projectId, signalType, data, contextId, contextName } = input;

  switch (signalType) {
    case SignalType.GIT_ACTIVITY:
      signalCollector.recordGitActivity(projectId, data, contextId, contextName);
      break;
    case SignalType.API_FOCUS:
      signalCollector.recordApiFocus(projectId, data, contextId, contextName);
      break;
    case SignalType.CONTEXT_FOCUS:
      signalCollector.recordContextFocus(projectId, data);
      break;
    case SignalType.IMPLEMENTATION:
      signalCollector.recordImplementation(projectId, data);
      break;
    case SignalType.CLI_MEMORY:
      signalCollector.recordCliMemory(projectId, data, contextId, contextName);
      break;
  }

  // Post-write clustering hook: attempt to compress bursts of same-type signals
  try {
    tryClusterSignals(projectId, signalType);
  } catch {
    // Clustering is best-effort — never block signal recording
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

  const deleted = behavioralSignalRepository.deleteById(signalId);
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
export async function completeReflection(input: CompleteReflectionInput): Promise<CompleteReflectionResult> {
  const { reflectionId, directionsAnalyzed, outcomesAnalyzed, signalsAnalyzed, insights, guideSectionsUpdated } = input;

  // Verify reflection exists and is running
  const reflection = brainReflectionRepository.getById(reflectionId);
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

  // Prevent concurrent completions for the same project/scope
  const projectId = reflection.project_id;
  const scope = reflection.scope || 'project';
  const lockKey = getLockKey(projectId, scope);

  if (!tryAcquireLock(lockKey, reflectionId)) {
    const existing = activeCompletions.get(lockKey);
    return {
      success: false,
      error: `Another reflection completion is already in progress for this ${scope} (reflection: ${existing?.reflectionId})`,
      status: 409,
    };
  }

  let dedupedInsights: LearningInsight[] = [];
  let conflictsDetected = 0;
  let autoPruneResult: AutoPruneResult | null = null;

  try {
    const db = getDatabase();

    // Precompute semantic embeddings BEFORE the (synchronous) transaction —
    // better-sqlite3 transactions cannot await, so vectors must be ready first.
    // Vectors are keyed by title text, so the authoritative existing-insight read
    // still happens inside the transaction (below); any title without a vector
    // simply falls back to lexical Jaccard. The map is empty when no embedding
    // provider is reachable, preserving today's behavior exactly.
    const titleEmbeddings = await embedTexts([
      ...brainInsightRepository.getByProject(projectId).map(i => i.title),
      ...validatedInsights.map(i => i.title),
    ]);

    const runCompletion = db.transaction(() => {
      // Deduplicate insights against previously stored ones (canonical hash +
      // semantic cosine, falling back to lexical Jaccard).
      const existingDbInsights = brainInsightRepository.getByProject(projectId);
      const deduplicator = new InsightDeduplicator(projectId, existingDbInsights, titleEmbeddings);
      dedupedInsights = deduplicator.deduplicate(validatedInsights);

      // Convert to LearningInsight[] for conflict detection
      const existingLearning = existingDbInsights.map(dbInsightToLearning);

      // Detect conflicts between new insights and existing insights
      for (const insight of dedupedInsights) {
        const conflicts = detectConflicts(insight, existingLearning);
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
      brainInsightRepository.createBatch(reflectionId, projectId, dedupedInsights, deduplicator);
    });

    runCompletion();
  } catch (txError) {
    if (txError instanceof Error && txError.message === 'Failed to complete reflection') {
      return { success: false, error: 'Failed to complete reflection', status: 500 };
    }
    throw txError;
  } finally {
    releaseLock(lockKey);
  }

  // Run auto-pruning post-commit: demote misleading insights and auto-resolve clear conflicts (non-critical)
  try {
    autoPruneResult = autoPruneInsights(projectId);
  } catch (err) {
    console.warn('[Brain] Auto-prune failed (non-critical):', err);
  }

  // Refresh predictive intent model after reflection cycle (non-critical)
  try {
    predictiveIntentEngine.refresh(projectId);
  } catch {
    // Don't block reflection completion
  }

  // Auto-graduate qualifying insights to Knowledge Base (best-effort)
  try {
    const { knowledgeBaseService } = await import('@/lib/knowledge-base/knowledgeBaseService');
    knowledgeBaseService.autoGraduateInsights(projectId);
  } catch (err) {
    console.warn('[Brain] Knowledge graduation failed:', err);
  }

  // Cross-project pattern promotion (best-effort, non-blocking)
  try {
    const { promoteRecurringInsights } = await import('./crossProjectPatterns');
    const promoted = promoteRecurringInsights(2);
    if (promoted.length > 0) {
      console.log(`[Brain] Promoted ${promoted.length} cross-project pattern(s)`);
    }
  } catch (err) {
    console.warn('[Brain] Cross-project promotion failed:', err);
  }

  // Decay + prune behavioral signals so context stays recency-weighted and the
  // signals table stays bounded. Idempotent per ISO week (decay_applied_at guard),
  // so it's safe on every reflection. (applySignalDecay previously had no caller.)
  try {
    const { decayed, deleted } = applySignalDecay(projectId, DEFAULT_DECAY_FACTOR, DEFAULT_RETENTION_DAYS);
    if (decayed > 0 || deleted > 0) {
      console.log(`[Brain] Signal decay: ${decayed} weighted down, ${deleted} pruned`);
    }
  } catch (err) {
    console.warn('[Brain] Signal decay failed:', err);
  }

  // Revert-learning: mark previously-successful directions whose commit was later
  // reverted, so revertedCount and the "avoid repeating" guidance become real.
  // (outcomeTracker.scanForReverts previously had no caller and no checkRevert.)
  try {
    const { projectDb } = await import('@/lib/project_database');
    const projectPath = projectDb.projects.getAll().find((p) => p.id === projectId)?.path;
    if (projectPath) {
      const { outcomeTracker } = await import('./outcomeTracker');
      const reverts = await outcomeTracker.scanForReverts(projectId, (sha) => gitCheckRevert(projectPath, sha));
      if (reverts > 0) console.log(`[Brain] Detected ${reverts} reverted implementation(s)`);
    }
  } catch (err) {
    console.warn('[Brain] Revert scan failed:', err);
  }

  // Global reflections only: run cross-project synthesis (architecture-drift
  // detection + high-confidence proactive-goal generation). Best-effort; goal
  // creation is idempotent. (runCrossProjectSynthesis previously had no caller.)
  if (scope === 'global') {
    try {
      const { projectDb } = await import('@/lib/project_database');
      const projectIds = projectDb.projects.getAll().map((p) => p.id);
      const synth = await runCrossProjectSynthesis(projectIds);
      console.log(
        `[Brain] Cross-project synthesis: ${synth.patternsPromoted} pattern(s), ${synth.goalsGenerated} goal(s), ${synth.driftReports.length} drift report(s)`
      );
    } catch (err) {
      console.warn('[Brain] Cross-project synthesis failed:', err);
    }
  }

  const updatedReflection = brainReflectionRepository.getById(reflectionId);

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
  const decayStartDays = Math.max(DECAY_START_MIN_DAYS, Math.floor(retentionDays * DECAY_START_FRACTION));
  const decayed = behavioralSignalRepository.applyDecay(projectId, decayFactor, decayStartDays);
  const deleted = behavioralSignalRepository.deleteOld(projectId, retentionDays);
  invalidateContextCache(projectId);
  return { decayed, deleted };
}

/**
 * Best-effort git check: was the commit `sha` later reverted in `projectPath`?
 * `git revert` records "This reverts commit <sha>." in the body, so a fixed-string
 * search for the sha surfaces the reverting commit. The sha is sanitized to hex
 * before use. Returns { reverted:false } on any error (read-only, never throws).
 */
async function gitCheckRevert(
  projectPath: string,
  sha: string
): Promise<{ reverted: boolean; revertSha?: string }> {
  const safeSha = sha.replace(/[^a-fA-F0-9]/g, '');
  if (safeSha.length < 7) return { reverted: false };

  try {
    const { executeCommand } = await import('@/lib/command/executeCommand');
    const result = await executeCommand(
      'git',
      ['log', '--fixed-strings', `--grep=${safeSha}`, '--format=%H', '-n', '50'],
      { cwd: projectPath, timeout: 10000, acceptNonZero: true }
    );
    const matches = result.stdout
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      // exclude the original commit itself (a commit can't mention its own future sha,
      // but guard against prefix overlap to avoid self-matches)
      .filter((h) => !h.startsWith(safeSha) && !safeSha.startsWith(h));
    return matches.length > 0 ? { reverted: true, revertSha: matches[0] } : { reverted: false };
  } catch {
    return { reverted: false };
  }
}

// ============================================================================
// Cross-Project Knowledge Synthesis
// ============================================================================

export interface CrossProjectSynthesisResult {
  patternsPromoted: number;
  driftReports: import('./architectureDrift').DriftReport[];
  goalsGenerated: number;
}

/**
 * Run cross-project knowledge synthesis:
 * 1. Promote recurring insights to global patterns
 * 2. Detect architecture drift for specified projects
 * 3. Generate proactive goals from patterns + drift
 *
 * Best called after global reflection or periodically.
 */
export async function runCrossProjectSynthesis(
  projectIds?: string[]
): Promise<CrossProjectSynthesisResult> {
  const { promoteRecurringInsights } = await import('./crossProjectPatterns');
  const { detectArchitectureDrift } = await import('./architectureDrift');
  const { generateProactiveGoals, createGoalFromCandidate } = await import('./proactiveGoals');

  // 1. Promote recurring insights across all projects
  let patternsPromoted = 0;
  try {
    const promoted = promoteRecurringInsights(2);
    patternsPromoted = promoted.length;
  } catch (err) {
    console.warn('[Brain] Cross-project pattern promotion failed:', err);
  }

  // 2. Detect drift for specified projects (or skip if none specified)
  const driftReports: import('./architectureDrift').DriftReport[] = [];
  if (projectIds && projectIds.length > 0) {
    for (const pid of projectIds) {
      try {
        const report = detectArchitectureDrift(pid);
        driftReports.push(report);
      } catch (err) {
        console.warn(`[Brain] Drift detection failed for ${pid}:`, err);
      }
    }
  }

  // 3. Generate proactive goals from patterns + drift
  let goalsGenerated = 0;
  if (projectIds && projectIds.length > 0) {
    for (const pid of projectIds) {
      try {
        const candidates = generateProactiveGoals(pid);
        // Auto-create goals for high-confidence candidates only (idempotent —
        // createGoalFromCandidate skips titles that already have an open goal).
        for (const candidate of candidates) {
          if (candidate.confidence >= 0.8 && candidate.priority !== 'low') {
            const res = createGoalFromCandidate(candidate);
            if (res.created) goalsGenerated++;
          }
        }
      } catch (err) {
        console.warn(`[Brain] Proactive goal generation failed for ${pid}:`, err);
      }
    }
  }

  return { patternsPromoted, driftReports, goalsGenerated };
}
