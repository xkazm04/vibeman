/**
 * Poll Decisions API Endpoint
 * Manually triggers a poll for pending direction decisions from Butler
 */

import { NextRequest, NextResponse } from 'next/server';
import { pollDecisions, type PollResult } from '@/lib/remote/decisionPoller';

interface PollDecisionsRequest {
  projectId?: string; // Optional - for future project-specific polling
}

interface PollDecisionsResponse {
  success: boolean;
  processed: number;
  decisions: Array<{
    directionId: string;
    action: string;
    timestamp: string;
  }>;
  error?: string;
}

/**
 * POST /api/remote/poll-decisions
 * Trigger an immediate poll for pending direction decisions
 */
export async function POST(request: NextRequest): Promise<NextResponse<PollDecisionsResponse>> {
  try {
    // Parse request body (projectId is optional for future use)
    let _requestBody: PollDecisionsRequest = {};
    try {
      _requestBody = await request.json();
    } catch {
      // Empty body is OK
    }

    // Poll for decisions
    const result: PollResult = await pollDecisions();

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          processed: 0,
          decisions: [],
          error: result.error || 'Poll failed',
        },
        { status: 500 }
      );
    }

    // Transform decisions for response (serialize dates)
    const decisions = result.decisions.map((d) => ({
      directionId: d.directionId,
      action: d.action,
      timestamp: d.timestamp.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      processed: result.processed,
      decisions,
    });
  } catch (error) {
    console.error('[API poll-decisions] Error:', error);
    return NextResponse.json(
      {
        success: false,
        processed: 0,
        decisions: [],
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
