/**
 * Brain Insights Retrospective Ingestion API
 * POST /api/brain/insights/ingest
 *
 * Creates best_practice insights from retrospective analysis of execution logs.
 * Creates a synthetic "manual" reflection record, then batch-creates insights.
 * Designed for seeding the knowledge library from historical data.
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { brainInsightRepository } from '@/app/db/repositories/brain-insight.repository';
import { brainReflectionRepository } from '@/app/db/repositories/brain-reflection.repository';
import { withObservability } from '@/lib/observability/middleware';
import { buildSuccessResponse, buildErrorResponse } from '@/lib/api-helpers/apiResponse';
import type { LearningInsight } from '@/app/db/models/brain.types';

interface IngestPractice {
  title: string;
  description: string;
  confidence: number;
  type?: LearningInsight['type'];
  category?: string; // e.g., "refactor", "performance", "security"
}

interface IngestRequest {
  projectId: string;
  source: string; // e.g., "cli-log-analysis", "manual-review"
  practices: IngestPractice[];
}

async function handlePost(request: NextRequest) {
  try {
    const body: IngestRequest = await request.json();
    const { projectId, source, practices } = body;

    if (!projectId || !source || !Array.isArray(practices) || practices.length === 0) {
      return buildErrorResponse('projectId, source, and non-empty practices array required', { status: 400 });
    }

    // 1. Batch-create insights, tracking successes before creating reflection
    const created: string[] = [];
    const skipped: string[] = [];
    const reflectionId = `refl-ingest-${randomUUID().slice(0, 8)}`;

    for (const practice of practices) {
      if (!practice.title || !practice.description) {
        skipped.push(practice.title || '(untitled)');
        continue;
      }

      const insightId = `ins-${randomUUID().slice(0, 12)}`;
      try {
        brainInsightRepository.create({
          id: insightId,
          reflection_id: reflectionId,
          project_id: projectId,
          type: practice.type || 'best_practice',
          title: practice.title,
          description: practice.description + (practice.category ? ` [Category: ${practice.category}]` : '') + ` [Source: ${source}]`,
          confidence: Math.max(1, Math.min(100, practice.confidence || 70)),
          evidence: [], // Retrospective — no direct evidence refs
        });
        created.push(practice.title);
      } catch (err) {
        // Likely canonical_id duplicate — skip gracefully
        skipped.push(practice.title);
      }
    }

    // 2. Only create the reflection record if at least one insight was created
    //    This prevents orphaned phantom reflections that inflate metrics.
    if (created.length > 0) {
      brainReflectionRepository.create({
        id: reflectionId,
        project_id: projectId,
        trigger_type: 'manual',
        scope: 'project',
      });

      // 3. Mark reflection as completed with accurate counts
      brainReflectionRepository.completeReflection(reflectionId, {
        directions_analyzed: 0,
        outcomes_analyzed: 0,
        signals_analyzed: created.length,
        guide_sections_updated: [],
      });
    }

    return buildSuccessResponse({
      reflectionId: created.length > 0 ? reflectionId : null,
      created: created.length,
      skipped: skipped.length,
      createdTitles: created,
      skippedTitles: skipped,
    });
  } catch (error) {
    console.error('[Brain Insights Ingest] Error:', error);
    return buildErrorResponse('Failed to ingest practices', { status: 500 });
  }
}

export const POST = withObservability(handlePost, '/api/brain/insights/ingest');
