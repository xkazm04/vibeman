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
import { brainReflectionDb, brainInsightDb } from '@/app/db';
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

    // 1. Create a synthetic reflection record as the parent
    const reflectionId = `refl-ingest-${randomUUID().slice(0, 8)}`;
    brainReflectionDb.create({
      id: reflectionId,
      project_id: projectId,
      trigger_type: 'manual',
      scope: 'project',
    });

    // 2. Batch-create insights
    const created: string[] = [];
    const skipped: string[] = [];

    for (const practice of practices) {
      if (!practice.title || !practice.description) {
        skipped.push(practice.title || '(untitled)');
        continue;
      }

      const insightId = `ins-${randomUUID().slice(0, 12)}`;
      try {
        brainInsightDb.create({
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

    // 3. Mark reflection as completed
    brainReflectionDb.completeReflection(reflectionId, {
      directions_analyzed: 0,
      outcomes_analyzed: 0,
      signals_analyzed: practices.length,
      guide_sections_updated: [],
    });

    return buildSuccessResponse({
      reflectionId,
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
