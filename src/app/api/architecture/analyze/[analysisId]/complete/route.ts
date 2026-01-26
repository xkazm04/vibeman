/**
 * Architecture Analysis Completion Callback
 * POST - Called by Claude Code after analysis completes
 */

import { NextRequest, NextResponse } from 'next/server';
import { architectureAnalysisAgent } from '@/lib/architecture/analysisAgent';

interface RouteParams {
  params: Promise<{
    analysisId: string;
  }>;
}

/**
 * POST /api/architecture/analyze/[analysisId]/complete
 * Complete an architecture analysis with results
 *
 * Body should contain:
 * {
 *   relationships: [...],
 *   patterns: [...],
 *   recommendations: [...],
 *   narrative: "...",
 *   project_metadata?: { tier, framework, ... } // For project onboarding
 * }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { analysisId } = await params;

    // Check if analysis exists
    const analysis = architectureAnalysisAgent.getAnalysis(analysisId);
    if (!analysis) {
      return NextResponse.json(
        { error: 'Analysis session not found' },
        { status: 404 }
      );
    }

    // Check if already completed
    if (analysis.status === 'completed') {
      return NextResponse.json(
        { error: 'Analysis already completed', analysis },
        { status: 409 }
      );
    }

    if (analysis.status === 'failed') {
      return NextResponse.json(
        { error: 'Analysis has failed', analysis },
        { status: 409 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Complete the analysis
    const result = await architectureAnalysisAgent.completeAnalysis(analysisId, body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, analysis: result.analysis },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      analysis: result.analysis,
      relationshipsCreated: result.relationshipsCreated,
    });
  } catch (error) {
    console.error('Complete analysis error:', error);

    // Try to mark analysis as failed
    try {
      const { analysisId } = await params;
      architectureAnalysisAgent.failAnalysis(
        analysisId,
        error instanceof Error ? error.message : 'Unknown error'
      );
    } catch (e) {
      // Ignore failure to mark as failed
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to complete analysis' },
      { status: 500 }
    );
  }
}
