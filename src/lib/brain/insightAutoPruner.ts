/**
 * Insight Auto-Pruner
 *
 * After each reflection, automatically:
 * 1. Lower confidence on insights with verdict=misleading
 * 2. Auto-resolve conflicts where one insight has significantly higher effectiveness
 * 3. Leave genuinely ambiguous conflicts for human resolution
 *
 * Uses the brain_insights table via brainInsightDb repository
 * instead of parsing JSON blobs from brain_reflections.
 */

import { getDatabase, brainInsightDb } from '@/app/db';
import type { DbBrainInsight } from '@/app/db/models/brain.types';

export interface AutoPruneResult {
  misleadingDemoted: number;     // insights whose confidence was lowered
  conflictsAutoResolved: number; // conflicts resolved automatically
  conflictsRemaining: number;    // conflicts left for human resolution
  actions: AutoPruneAction[];    // detailed log of what happened
}

export interface AutoPruneAction {
  type: 'confidence_lowered' | 'conflict_auto_resolved';
  insightTitle: string;
  detail: string;
}

interface DirectionRow {
  status: string;
  created_at: string;
}

/**
 * Compute a simple effectiveness score for a single insight
 * Returns score and whether it's reliable
 */
function computeInsightScore(
  insightDate: string,
  directions: DirectionRow[],
  minDirections: number
): { score: number; verdict: 'helpful' | 'neutral' | 'misleading'; reliable: boolean } {
  const before = directions.filter(d => d.created_at <= insightDate);
  const after = directions.filter(d => d.created_at > insightDate);

  const preAccepted = before.filter(d => d.status === 'accepted').length;
  const postAccepted = after.filter(d => d.status === 'accepted').length;

  const preRate = before.length > 0 ? preAccepted / before.length : 0;
  const postRate = after.length > 0 ? postAccepted / after.length : 0;

  const reliable = before.length >= minDirections && after.length >= minDirections;

  const score = before.length > 0 && after.length > 0
    ? ((postRate - preRate) / Math.max(preRate, 0.01)) * 100
    : 0;

  let verdict: 'helpful' | 'neutral' | 'misleading';
  if (!reliable) {
    verdict = 'neutral';
  } else if (score > 10) {
    verdict = 'helpful';
  } else if (score < -10) {
    verdict = 'misleading';
  } else {
    verdict = 'neutral';
  }

  return { score: Math.round(score * 10) / 10, verdict, reliable };
}

/**
 * Run auto-pruning for a project after a reflection completes.
 * This is the main entry point.
 */
export function autoPruneInsights(projectId: string, minDirections: number = 3): AutoPruneResult {
  const db = getDatabase();
  const actions: AutoPruneAction[] = [];
  let misleadingDemoted = 0;
  let conflictsAutoResolved = 0;

  // 1. Load all insights from brain_insights table (joined with reflection completed_at)
  const insightRows = brainInsightDb.getForEffectiveness(projectId);

  // 2. Load all non-pending directions (raw SQL -- same as before)
  const directions = db.prepare(`
    SELECT status, created_at
    FROM directions
    WHERE project_id = ? AND status IN ('accepted', 'rejected')
    ORDER BY created_at ASC
  `).all(projectId) as DirectionRow[];

  // Not enough data to make reliable judgments
  if (directions.length < minDirections * 2) {
    return {
      misleadingDemoted: 0,
      conflictsAutoResolved: 0,
      conflictsRemaining: brainInsightDb.countUnresolvedConflicts(projectId),
      actions: [],
    };
  }

  // 3. Build effectiveness scores for all insights
  const scoreMap = new Map<string, { score: number; verdict: string; reliable: boolean; row: DbBrainInsight & { completed_at: string } }>();

  for (const row of insightRows) {
    const result = computeInsightScore(row.completed_at, directions, minDirections);
    scoreMap.set(row.id, {
      score: result.score,
      verdict: result.verdict,
      reliable: result.reliable,
      row,
    });
  }

  // 4. Process each insight row
  for (const row of insightRows) {
    const effectiveness = scoreMap.get(row.id);

    // Skip already auto-pruned insights (idempotent)
    if (row.auto_pruned === 1) continue;

    // --- Step A: Demote misleading insights ---
    if (effectiveness?.reliable && effectiveness.verdict === 'misleading') {
      const oldConfidence = row.confidence;
      const newConfidence = Math.max(10, oldConfidence - 30);

      if (newConfidence < oldConfidence) {
        brainInsightDb.update(row.id, {
          confidence: newConfidence,
          auto_pruned: 1,
          auto_prune_reason: `Effectiveness score ${effectiveness.score}% — acceptance rate dropped after this insight was learned`,
          original_confidence: oldConfidence,
        });

        misleadingDemoted++;
        actions.push({
          type: 'confidence_lowered',
          insightTitle: row.title,
          detail: `Confidence ${oldConfidence}% → ${newConfidence}% (effectiveness: ${effectiveness.score}%)`,
        });
      }
    }

    // --- Step B: Auto-resolve conflicts based on effectiveness ---
    if (row.conflict_with_title && row.conflict_resolved === 0) {
      const thisEffectiveness = effectiveness;

      // Find the conflicting insight's effectiveness by title
      let otherEffectiveness: { score: number; verdict: string; reliable: boolean; row: DbBrainInsight & { completed_at: string } } | undefined;
      for (const [, mapVal] of scoreMap.entries()) {
        if (mapVal.row.title === row.conflict_with_title) {
          otherEffectiveness = mapVal;
          break;
        }
      }

      if (thisEffectiveness?.reliable && otherEffectiveness?.reliable) {
        const scoreDiff = thisEffectiveness.score - otherEffectiveness.score;

        if (Math.abs(scoreDiff) > 20) {
          // Clear winner -- auto-resolve by keeping the better one
          const thisIsWinner = scoreDiff > 0;

          // Update this insight
          const thisUpdate: Partial<Pick<DbBrainInsight, 'confidence' | 'conflict_resolved' | 'conflict_resolution' | 'auto_pruned' | 'auto_prune_reason' | 'original_confidence'>> = {
            conflict_resolved: 1,
            conflict_resolution: thisIsWinner ? 'keep_this' : 'keep_other',
            auto_pruned: 1,
            auto_prune_reason: thisIsWinner
              ? `Auto-kept: effectiveness ${thisEffectiveness.score}% vs ${otherEffectiveness.score}%`
              : `Auto-deprioritized: effectiveness ${thisEffectiveness.score}% vs ${otherEffectiveness.score}%`,
          };

          // If the loser, also demote confidence
          if (!thisIsWinner) {
            thisUpdate.confidence = Math.max(10, row.confidence - 20);
            thisUpdate.original_confidence = row.original_confidence ?? row.confidence;
          }

          brainInsightDb.update(row.id, thisUpdate);

          // Also resolve the other side
          const otherRow = otherEffectiveness.row;
          if (otherRow.conflict_resolved === 0) {
            const otherIsWinner = !thisIsWinner;

            const otherUpdate: Partial<Pick<DbBrainInsight, 'confidence' | 'conflict_resolved' | 'conflict_resolution' | 'auto_pruned' | 'auto_prune_reason' | 'original_confidence'>> = {
              conflict_resolved: 1,
              conflict_resolution: otherIsWinner ? 'keep_this' : 'keep_other',
              auto_pruned: 1,
              auto_prune_reason: otherIsWinner
                ? `Auto-kept: effectiveness ${otherEffectiveness.score}% vs ${thisEffectiveness.score}%`
                : `Auto-deprioritized: effectiveness ${otherEffectiveness.score}% vs ${thisEffectiveness.score}%`,
            };

            if (!otherIsWinner) {
              otherUpdate.confidence = Math.max(10, otherRow.confidence - 20);
              otherUpdate.original_confidence = otherRow.original_confidence ?? otherRow.confidence;
            }

            brainInsightDb.update(otherRow.id, otherUpdate);
          }

          conflictsAutoResolved++;

          actions.push({
            type: 'conflict_auto_resolved',
            insightTitle: row.title,
            detail: thisIsWinner
              ? `Won vs "${row.conflict_with_title}" (${thisEffectiveness.score}% vs ${otherEffectiveness.score}%)`
              : `Lost vs "${row.conflict_with_title}" (${thisEffectiveness.score}% vs ${otherEffectiveness.score}%)`,
          });
        }
      }
    }
  }

  return {
    misleadingDemoted,
    conflictsAutoResolved,
    conflictsRemaining: brainInsightDb.countUnresolvedConflicts(projectId),
    actions,
  };
}
