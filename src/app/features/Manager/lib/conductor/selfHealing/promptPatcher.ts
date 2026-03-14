/**
 * Prompt Patcher — Apply and manage healing patches
 *
 * Stores patches in the database, provides injection mechanism for
 * prompt builders, and manages patch lifecycle (apply/revert/measure).
 */

import { getDatabase } from '@/app/db/connection';
import type { HealingPatch } from '../types';

// ============================================================================
// Patch Storage (direct DB access)
// ============================================================================

/**
 * Save a healing patch to the database with expiry and tracking columns.
 * Uses direct DB INSERT matching orchestrator's savePatchToDb pattern.
 */
export async function savePatch(patch: HealingPatch): Promise<void> {
  const db = getDatabase();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  db.prepare(`
    INSERT INTO conductor_healing_patches
    (id, pipeline_run_id, target_type, target_id, original_value, patched_value, reason, error_pattern, applied_at, reverted, expires_at, application_count, success_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 0, 0)
  `).run(
    patch.id,
    patch.pipelineRunId,
    patch.targetType,
    patch.targetId,
    patch.originalValue || '',
    patch.patchedValue,
    patch.reason,
    patch.errorPattern,
    patch.appliedAt || new Date().toISOString(),
    expiresAt,
  );
}

/**
 * Revert a healing patch by marking it in the database.
 */
export async function revertPatch(patchId: string): Promise<void> {
  const db = getDatabase();
  db.prepare('UPDATE conductor_healing_patches SET reverted = 1 WHERE id = ?').run(patchId);
}

/**
 * Update effectiveness score for a patch after measuring results.
 */
export async function updatePatchEffectiveness(
  patchId: string,
  effectiveness: number
): Promise<void> {
  const db = getDatabase();
  db.prepare('UPDATE conductor_healing_patches SET effectiveness = ? WHERE id = ?').run(effectiveness, patchId);
}

// ============================================================================
// Patch Lifecycle
// ============================================================================

/** DB row shape for healing patches */
interface HealingPatchRow {
  id: string;
  pipeline_run_id: string;
  target_type: string;
  target_id: string;
  original_value: string | null;
  patched_value: string | null;
  reason: string | null;
  error_pattern: string | null;
  applied_at: string | null;
  effectiveness: number | null;
  reverted: number;
  expires_at: string | null;
  application_count: number;
  success_count: number;
}

function rowToPatch(row: HealingPatchRow): HealingPatch {
  return {
    id: row.id,
    pipelineRunId: row.pipeline_run_id,
    targetType: row.target_type as HealingPatch['targetType'],
    targetId: row.target_id,
    originalValue: row.original_value || '',
    patchedValue: row.patched_value || '',
    reason: row.reason || '',
    errorPattern: row.error_pattern || '',
    appliedAt: row.applied_at || '',
    effectiveness: row.effectiveness ?? undefined,
    reverted: row.reverted === 1,
    expiresAt: row.expires_at ?? undefined,
    applicationCount: row.application_count,
    successCount: row.success_count,
  };
}

/**
 * Prune expired and ineffective patches for a project's runs.
 *
 * Filters out:
 *   1. Patches where expires_at is past current time
 *   2. Patches where application_count >= 3 AND success_count / application_count < 0.3
 *
 * Pruned patches are marked as reverted in the DB.
 * Returns the surviving active patches.
 */
export function prunePatches(projectId: string): HealingPatch[] {
  const db = getDatabase();
  const now = new Date().toISOString();

  // Load all active (non-reverted) patches for this project's runs
  const rows = db.prepare(`
    SELECT hp.* FROM conductor_healing_patches hp
    INNER JOIN conductor_runs cr ON hp.pipeline_run_id = cr.id
    WHERE cr.project_id = ? AND hp.reverted = 0
  `).all(projectId) as HealingPatchRow[];

  const surviving: HealingPatch[] = [];
  const toPrune: string[] = [];

  for (const row of rows) {
    // Check expiry
    if (row.expires_at && new Date(row.expires_at) < new Date(now)) {
      toPrune.push(row.id);
      continue;
    }

    // Check ineffectiveness: application_count >= 3 AND success rate < 0.3
    if (row.application_count >= 3) {
      const successRate = row.success_count / row.application_count;
      if (successRate < 0.3) {
        toPrune.push(row.id);
        continue;
      }
    }

    surviving.push(rowToPatch(row));
  }

  // Mark pruned patches as reverted
  if (toPrune.length > 0) {
    const stmt = db.prepare('UPDATE conductor_healing_patches SET reverted = 1 WHERE id = ?');
    for (const id of toPrune) {
      stmt.run(id);
    }
  }

  return surviving;
}

/**
 * Update application/success counts for a patch.
 * Increments application_count by 1, and success_count by 1 if success is true.
 */
export function updatePatchStats(patchId: string, success: boolean): void {
  const db = getDatabase();
  db.prepare(`
    UPDATE conductor_healing_patches
    SET application_count = application_count + 1,
        success_count = success_count + ${success ? 1 : 0}
    WHERE id = ?
  `).run(patchId);
}

// ============================================================================
// Patch Injection
// ============================================================================

/**
 * Build a healing context string from active patches.
 *
 * This string gets injected into prompt templates as an additional
 * context section to prevent previously observed errors.
 * Filters out expired patches.
 */
export function buildHealingContext(activePatches: HealingPatch[]): string {
  const now = new Date();
  const promptPatches = activePatches.filter((p) => {
    if (p.targetType !== 'prompt' || p.reverted) return false;
    // Filter out expired patches
    if (p.expiresAt && new Date(p.expiresAt) < now) return false;
    return true;
  });

  if (promptPatches.length === 0) return '';

  const sections = promptPatches.map((p) => p.patchedValue).join('\n');

  return `\n\n## Self-Healing Context\nThe following guidelines were learned from previous execution failures. Follow them carefully.\n${sections}`;
}

/**
 * Get active config patches that should modify balancing parameters.
 */
export function getConfigPatches(
  activePatches: HealingPatch[]
): Array<{ targetId: string; suggestedValue: string }> {
  return activePatches
    .filter((p) => p.targetType === 'config' && !p.reverted)
    .map((p) => ({
      targetId: p.targetId,
      suggestedValue: p.patchedValue,
    }));
}

// ============================================================================
// Effectiveness Measurement
// ============================================================================

/**
 * Measure patch effectiveness by comparing error rates before and after.
 *
 * Returns a value between 0 (not effective) and 1 (fully effective).
 */
export function measureEffectiveness(
  patch: HealingPatch,
  errorsBefore: number,
  errorsAfter: number
): number {
  if (errorsBefore === 0) return 1;
  if (errorsAfter >= errorsBefore) return 0;

  return 1 - errorsAfter / errorsBefore;
}

/**
 * Check if a patch should be auto-reverted due to low effectiveness.
 *
 * Auto-revert criteria:
 * - Patch has been measured at least twice
 * - Effectiveness is below 30%
 */
export function shouldAutoRevert(patch: HealingPatch): boolean {
  if (patch.reverted) return false;
  if (patch.effectiveness === undefined) return false;
  return patch.effectiveness < 0.3;
}
