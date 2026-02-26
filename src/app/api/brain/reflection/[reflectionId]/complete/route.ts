/**
 * API Route: Complete Brain Reflection
 *
 * POST /api/brain/reflection/[reflectionId]/complete
 * Called by Claude Code when reflection is complete
 */

import { NextRequest, NextResponse } from 'next/server';
import { reflectionAgent } from '@/lib/brain/reflectionAgent';
import { brainReflectionDb, brainInsightDb } from '@/app/db';
import { getDatabase } from '@/app/db/connection';
import { withObservability } from '@/lib/observability/middleware';
import type { LearningInsight } from '@/app/db/models/brain.types';
import { detectConflicts, markConflictsOnInsights } from '@/lib/brain/insightConflictDetector';
import { autoPruneInsights } from '@/lib/brain/insightAutoPruner';
import { predictiveIntentEngine } from '@/lib/brain/predictiveIntentEngine';

/**
 * In-memory lock to prevent concurrent completions for the same project.
 * Prevents race conditions where two reflections read stale insight data.
 */
const activeCompletions = new Set<string>();

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

/**
 * POST /api/brain/reflection/[reflectionId]/complete
 * Complete a reflection session
 *
 * Body:
 * - directionsAnalyzed: number
 * - outcomesAnalyzed: number
 * - signalsAnalyzed: number
 * - insights: LearningInsight[]
 * - guideSectionsUpdated: string[]
 */
async function handlePost(
  request: NextRequest,
  { params }: { params: Promise<{ reflectionId: string }> }
) {
  try {
    const { reflectionId } = await params;
    const body = await request.json();

    // Verify reflection exists and is running
    const reflection = brainReflectionDb.getById(reflectionId);
    if (!reflection) {
      return NextResponse.json(
        { success: false, error: 'Reflection not found' },
        { status: 404 }
      );
    }

    if (reflection.status !== 'running' && reflection.status !== 'pending') {
      return NextResponse.json(
        {
          success: false,
          error: `Reflection is ${reflection.status}, cannot complete`,
        },
        { status: 400 }
      );
    }

    const {
      directionsAnalyzed,
      outcomesAnalyzed,
      signalsAnalyzed,
      insights,
      guideSectionsUpdated,
    } = body;

    // Validate required fields
    if (
      typeof directionsAnalyzed !== 'number' ||
      typeof outcomesAnalyzed !== 'number' ||
      typeof signalsAnalyzed !== 'number'
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'directionsAnalyzed, outcomesAnalyzed, and signalsAnalyzed are required numbers',
        },
        { status: 400 }
      );
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
            evidence: Array.isArray(insight.evidence) ? insight.evidence : [],
          });
        }
      }
    }

    // Prevent concurrent completions for the same project
    const projectId = reflection.project_id;
    if (activeCompletions.has(projectId)) {
      return NextResponse.json(
        { success: false, error: 'Another reflection completion is already in progress for this project' },
        { status: 409 }
      );
    }

    activeCompletions.add(projectId);
    let dedupedInsights: LearningInsight[] = [];
    let conflictsDetected = 0;
    let autoPruneResult: ReturnType<typeof autoPruneInsights> | null = null;

    try {
      // Wrap all read-dedup-insert-prune operations in a transaction
      // to prevent concurrent completions from reading stale data
      const db = getDatabase();
      const runCompletion = db.transaction(() => {
        // Deduplicate insights against previously stored ones (from new table)
        const existingInsights = brainInsightDb.getAllInsights(projectId);
        dedupedInsights = deduplicateInsights(validatedInsights, existingInsights);

        // Detect conflicts between new insights and existing insights
        for (const insight of dedupedInsights) {
          const conflicts = detectConflicts(insight, existingInsights);
          if (conflicts.length > 0) {
            // Mark the first (highest confidence) conflict
            const topConflict = conflicts.sort((a, b) => b.confidence - a.confidence)[0];
            insight.conflict_with = topConflict.insight2Title;
            insight.conflict_type = topConflict.conflictType;
            insight.conflict_resolved = false;
            conflictsDetected++;
          }
        }

        // Also detect conflicts within the new insights themselves
        conflictsDetected += markConflictsOnInsights(dedupedInsights);

        // Complete the reflection (keeps JSON blob for backward compat)
        const success = reflectionAgent.completeReflection(reflectionId, {
          directionsAnalyzed,
          outcomesAnalyzed,
          signalsAnalyzed,
          insights: dedupedInsights,
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
        return NextResponse.json(
          { success: false, error: 'Failed to complete reflection' },
          { status: 500 }
        );
      }
      throw txError;
    } finally {
      activeCompletions.delete(projectId);
    }

    // Refresh predictive intent model after reflection cycle
    try {
      predictiveIntentEngine.refresh(projectId);
    } catch {
      // Non-critical — don't block reflection completion
    }

    // Get updated reflection (after transaction completed)
    const updatedReflection = brainReflectionDb.getById(reflectionId);

    return NextResponse.json({
      success: true,
      message: 'Reflection completed successfully',
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
    });
  } catch (error) {
    console.error('[API] Brain reflection complete error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Export with observability tracking
export const POST = withObservability(handlePost, '/api/brain/reflection/[reflectionId]/complete');
