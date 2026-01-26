/**
 * API Route: Executive Analysis Completion
 *
 * POST /api/reflector/executive-analysis/[analysisId]/complete
 * Called by Claude Code when analysis is complete
 */

import { NextRequest, NextResponse } from 'next/server';
import { executiveAnalysisAgent } from '@/lib/reflector/executiveAnalysisAgent';
import { executiveAnalysisDb } from '@/app/db';
import type { ExecutiveAIInsight, CompleteExecutiveAnalysisData } from '@/app/db/models/reflector.types';

interface CompletionRequestBody {
  ideasAnalyzed: number;
  directionsAnalyzed: number;
  insights: ExecutiveAIInsight[];
  narrative: string;
  recommendations: string[];
}

/**
 * Validate the completion request body
 */
function validateCompletionBody(body: unknown): body is CompletionRequestBody {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;

  return (
    typeof b.ideasAnalyzed === 'number' &&
    typeof b.directionsAnalyzed === 'number' &&
    Array.isArray(b.insights) &&
    typeof b.narrative === 'string' &&
    Array.isArray(b.recommendations)
  );
}

/**
 * POST - Complete analysis with results from Claude Code
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ analysisId: string }> }
) {
  try {
    const { analysisId } = await params;

    if (!analysisId) {
      return NextResponse.json(
        { success: false, error: 'analysisId is required' },
        { status: 400 }
      );
    }

    // Get the analysis record
    const analysis = executiveAnalysisDb.getById(analysisId);
    if (!analysis) {
      return NextResponse.json(
        { success: false, error: 'Analysis not found' },
        { status: 404 }
      );
    }

    if (analysis.status !== 'running') {
      return NextResponse.json(
        { success: false, error: `Analysis is not running (status: ${analysis.status})` },
        { status: 400 }
      );
    }

    // Parse and validate the request body
    const body = await request.json();

    if (!validateCompletionBody(body)) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body. Required: ideasAnalyzed, directionsAnalyzed, insights, narrative, recommendations' },
        { status: 400 }
      );
    }

    // Validate insights structure
    for (const insight of body.insights) {
      if (!insight.type || !insight.title || !insight.description) {
        return NextResponse.json(
          { success: false, error: 'Each insight must have type, title, and description' },
          { status: 400 }
        );
      }
      if (typeof insight.confidence !== 'number' || insight.confidence < 0 || insight.confidence > 100) {
        insight.confidence = 50; // Default confidence if invalid
      }
      if (!Array.isArray(insight.evidence)) {
        insight.evidence = [];
      }
      if (typeof insight.actionable !== 'boolean') {
        insight.actionable = false;
      }
    }

    // Complete the analysis
    const completionData: CompleteExecutiveAnalysisData = {
      ideasAnalyzed: body.ideasAnalyzed,
      directionsAnalyzed: body.directionsAnalyzed,
      insights: body.insights,
      narrative: body.narrative,
      recommendations: body.recommendations,
    };

    const success = executiveAnalysisAgent.completeAnalysis(analysisId, completionData);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to complete analysis' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      analysisId,
      insightsCount: body.insights.length,
      recommendationsCount: body.recommendations.length,
    });
  } catch (error) {
    console.error('[API] Executive Analysis Complete error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
