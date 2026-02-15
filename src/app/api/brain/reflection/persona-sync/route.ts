/**
 * API Route: Persona Sync for Brain Reflections
 *
 * POST /api/brain/reflection/persona-sync
 * Allows the Brain Reflector persona to store its analysis insights
 * into the brain_insights table, bridging persona execution -> Brain insight system.
 */

import { NextRequest, NextResponse } from 'next/server';
import { reflectionAgent } from '@/lib/brain/reflectionAgent';
import { brainReflectionDb, brainInsightDb } from '@/app/db';
import { withObservability } from '@/lib/observability/middleware';
import type { LearningInsight } from '@/app/db/models/brain.types';
import { detectConflicts, markConflictsOnInsights } from '@/lib/brain/insightConflictDetector';
import { autoPruneInsights } from '@/lib/brain/insightAutoPruner';

// ── Deduplication helpers (reused from complete route) ────────────────────

/**
 * Normalize a string for comparison (lowercase, trim, strip punctuation)
 */
function normalizeForComparison(str: string): string {
  return str.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');
}

/**
 * Calculate token overlap ratio between two normalized strings
 * Returns 0-1 where 1 means identical tokens
 */
function tokenOverlapRatio(a: string, b: string): number {
  const tokensA = new Set(a.split(' '));
  const tokensB = new Set(b.split(' '));
  if (tokensA.size === 0 && tokensB.size === 0) return 1;
  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let overlap = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) overlap++;
  }

  const union = new Set([...tokensA, ...tokensB]).size;
  return overlap / union;
}

/**
 * Deduplicate insights against existing ones
 * Returns only genuinely new or significantly evolved insights
 */
function deduplicateInsights(
  newInsights: LearningInsight[],
  existingInsights: LearningInsight[]
): LearningInsight[] {
  if (existingInsights.length === 0) return newInsights;

  const SIMILARITY_THRESHOLD = 0.8;
  const result: LearningInsight[] = [];

  for (const insight of newInsights) {
    const normalizedTitle = normalizeForComparison(insight.title);

    // Find a matching existing insight (same type + similar title)
    const match = existingInsights.find(existing => {
      if (existing.type !== insight.type) return false;
      const existingNormalized = normalizeForComparison(existing.title);
      return tokenOverlapRatio(normalizedTitle, existingNormalized) >= SIMILARITY_THRESHOLD;
    });

    if (!match) {
      // Genuinely new insight
      result.push(insight);
    } else if (insight.confidence > match.confidence + 10) {
      // Significantly evolved confidence - keep as evolution
      result.push({
        ...insight,
        evolves: match.title,
      });
    }
    // Otherwise skip (duplicate with similar or lower confidence)
  }

  return result;
}

// ── Insight type mapping ─────────────────────────────────────────────────

/**
 * Map persona-friendly insight types to internal LearningInsight types.
 * The persona outputs "pattern"/"preference" but the DB uses
 * "pattern_detected"/"preference_learned".
 */
const INSIGHT_TYPE_MAP: Record<string, LearningInsight['type']> = {
  pattern: 'pattern_detected',
  pattern_detected: 'pattern_detected',
  preference: 'preference_learned',
  preference_learned: 'preference_learned',
  warning: 'warning',
  recommendation: 'recommendation',
};

function mapInsightType(raw: string): LearningInsight['type'] | null {
  return INSIGHT_TYPE_MAP[raw] ?? null;
}

// ── Route handler ────────────────────────────────────────────────────────

async function handlePost(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      projectId,
      directionsAnalyzed,
      signalsAnalyzed,
      insights,
    } = body;

    const effectiveProjectId = projectId || '__global__';

    // Validate required fields
    if (typeof directionsAnalyzed !== 'number' || typeof signalsAnalyzed !== 'number') {
      return NextResponse.json(
        {
          success: false,
          error: 'directionsAnalyzed and signalsAnalyzed are required numbers',
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(insights) || insights.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'insights must be a non-empty array',
        },
        { status: 400 }
      );
    }

    // 1. Create reflection record
    // ReflectionTriggerType = 'threshold' | 'scheduled' | 'manual'
    // 'scheduled' is the closest match for persona-triggered reflections
    const reflectionId = `ref_persona_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const scope = effectiveProjectId === '__global__' ? 'global' as const : 'project' as const;

    brainReflectionDb.create({
      id: reflectionId,
      project_id: effectiveProjectId,
      trigger_type: 'scheduled',
      scope,
    });

    // 2. Mark as running
    brainReflectionDb.startReflection(reflectionId);

    // 3. Validate and map insights
    const validatedInsights: LearningInsight[] = [];
    const skippedInsights: Array<{ index: number; reason: string }> = [];

    for (let i = 0; i < insights.length; i++) {
      const insight = insights[i];

      // Map type from persona-friendly to internal
      const mappedType = insight.type ? mapInsightType(insight.type) : null;
      if (!mappedType) {
        skippedInsights.push({ index: i, reason: `invalid type: ${insight.type}` });
        continue;
      }

      if (!insight.title || !insight.description) {
        skippedInsights.push({ index: i, reason: 'missing title or description' });
        continue;
      }

      if (typeof insight.confidence !== 'number' || insight.confidence < 0 || insight.confidence > 100) {
        skippedInsights.push({ index: i, reason: `invalid confidence: ${insight.confidence}` });
        continue;
      }

      validatedInsights.push({
        type: mappedType,
        title: insight.title,
        description: insight.description,
        confidence: insight.confidence,
        evidence: Array.isArray(insight.evidence) ? insight.evidence : [],
      });
    }

    if (validatedInsights.length === 0) {
      // Fail the reflection since no valid insights
      brainReflectionDb.failReflection(reflectionId, 'No valid insights after validation');
      return NextResponse.json(
        {
          success: false,
          error: 'No valid insights after validation',
          skippedInsights,
        },
        { status: 400 }
      );
    }

    // 4. Deduplicate against existing insights
    const existingInsights = brainInsightDb.getAllInsights(effectiveProjectId);
    const dedupedInsights = deduplicateInsights(validatedInsights, existingInsights);

    // 5. Detect conflicts between new insights and existing insights
    let conflictsDetected = 0;
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

    // Also detect conflicts within the new insights themselves
    conflictsDetected += markConflictsOnInsights(dedupedInsights);

    // 6. Complete the reflection record
    const success = reflectionAgent.completeReflection(reflectionId, {
      directionsAnalyzed,
      outcomesAnalyzed: 0, // Persona sync doesn't track outcomes separately
      signalsAnalyzed,
      insights: dedupedInsights,
      guideSectionsUpdated: [],
    });

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to complete reflection record' },
        { status: 500 }
      );
    }

    // 7. Store insights in the first-class brain_insights table
    if (dedupedInsights.length > 0) {
      brainInsightDb.createBatch(reflectionId, effectiveProjectId, dedupedInsights);
    }

    // 8. Run auto-pruning
    const autoPruneResult = autoPruneInsights(effectiveProjectId);

    return NextResponse.json({
      success: true,
      message: 'Persona insights synced to Brain successfully',
      reflectionId,
      summary: {
        directionsAnalyzed,
        signalsAnalyzed,
        insightsSubmitted: insights.length,
        insightsValidated: validatedInsights.length,
        insightsAfterDedup: dedupedInsights.length,
        duplicatesRemoved: validatedInsights.length - dedupedInsights.length,
        conflictsDetected,
        skippedInsights: skippedInsights.length > 0 ? skippedInsights : undefined,
      },
      autoPrune: {
        misleadingDemoted: autoPruneResult.misleadingDemoted,
        conflictsAutoResolved: autoPruneResult.conflictsAutoResolved,
        conflictsRemaining: autoPruneResult.conflictsRemaining,
        actions: autoPruneResult.actions,
      },
    });
  } catch (error) {
    console.error('[API] Brain persona-sync error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Export with observability tracking
export const POST = withObservability(handlePost, '/api/brain/reflection/persona-sync');
