/**
 * Prompt Patcher — Apply and manage healing patches
 *
 * Stores patches in the database, provides injection mechanism for
 * prompt builders, and manages patch lifecycle (apply/revert/measure).
 */

import type { HealingPatch } from '../types';

// ============================================================================
// Patch Storage (via API)
// ============================================================================

/**
 * Save a healing patch to the database.
 */
export async function savePatch(patch: HealingPatch): Promise<void> {
  const response = await fetch(`${getBaseUrl()}/api/conductor/healing`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'save',
      patch,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to save patch: ${response.status}`);
  }
}

/**
 * Revert a healing patch.
 */
export async function revertPatch(patchId: string): Promise<void> {
  const response = await fetch(`${getBaseUrl()}/api/conductor/healing`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'revert',
      patchId,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to revert patch: ${response.status}`);
  }
}

/**
 * Update effectiveness score for a patch after measuring results.
 */
export async function updatePatchEffectiveness(
  patchId: string,
  effectiveness: number
): Promise<void> {
  const response = await fetch(`${getBaseUrl()}/api/conductor/healing`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'update_effectiveness',
      patchId,
      effectiveness,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update effectiveness: ${response.status}`);
  }
}

// ============================================================================
// Patch Injection
// ============================================================================

/**
 * Build a healing context string from active patches.
 *
 * This string gets injected into prompt templates as an additional
 * context section to prevent previously observed errors.
 */
export function buildHealingContext(activePatches: HealingPatch[]): string {
  const promptPatches = activePatches.filter(
    (p) => p.targetType === 'prompt' && !p.reverted
  );

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

// ============================================================================
// Helpers
// ============================================================================

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}
