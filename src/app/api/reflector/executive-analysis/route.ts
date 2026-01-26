/**
 * API Route: Executive Analysis
 *
 * GET /api/reflector/executive-analysis - Get analysis status or history
 * POST /api/reflector/executive-analysis - Trigger new analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import { executiveAnalysisAgent } from '@/lib/reflector/executiveAnalysisAgent';
import type { TimeWindow } from '@/app/features/reflector/sub_Reflection/lib/types';

/**
 * GET - Get analysis status or history
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const mode = searchParams.get('mode'); // 'status' | 'history'

    if (mode === 'history') {
      const limit = parseInt(searchParams.get('limit') || '10', 10);
      const history = executiveAnalysisAgent.getHistory(projectId, limit);
      return NextResponse.json({
        success: true,
        history,
      });
    }

    // Default: return status
    const status = executiveAnalysisAgent.getStatus(projectId);
    return NextResponse.json({
      success: true,
      ...status,
    });
  } catch (error) {
    console.error('[API] Executive Analysis GET error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST - Trigger new analysis
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId,
      projectName,
      contextId,
      contextName,
      timeWindow = 'all',
    } = body;

    const result = await executiveAnalysisAgent.startAnalysis({
      projectId: projectId || null,
      projectName,
      contextId: contextId || null,
      contextName,
      timeWindow: timeWindow as TimeWindow,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error, analysisId: result.analysisId },
        { status: result.analysisId ? 409 : 400 } // 409 if already running
      );
    }

    return NextResponse.json({
      success: true,
      analysisId: result.analysisId,
      promptContent: result.promptContent,
    });
  } catch (error) {
    console.error('[API] Executive Analysis POST error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Cancel running analysis
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { analysisId, error = 'Cancelled by user' } = body;

    if (!analysisId) {
      return NextResponse.json(
        { success: false, error: 'analysisId is required' },
        { status: 400 }
      );
    }

    const success = executiveAnalysisAgent.failAnalysis(analysisId, error);

    return NextResponse.json({ success });
  } catch (error) {
    console.error('[API] Executive Analysis PATCH error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
