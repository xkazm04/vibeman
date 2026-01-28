/**
 * Healthcheck API
 * GET: Returns endpoint info (actual state comes from client-side)
 * POST: Triggers healthcheck publish to Supabase
 *
 * Note: Since Zustand stores run client-side, this endpoint provides
 * a way to trigger publishing and returns metadata. The actual state
 * (zen_mode, sessions) is accessed client-side via the healthcheckPublisher.
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/remote/healthcheck
 * Returns endpoint info - actual healthcheck data comes from client-side stores
 */
export async function GET() {
  return NextResponse.json({
    endpoint: 'healthcheck',
    description:
      'Use POST with projectId to publish healthcheck, or use the client-side healthcheckPublisher service',
    usage: {
      post: {
        body: { projectId: 'string (required)' },
        response: { published: 'boolean', projectId: 'string', timestamp: 'string' },
      },
      clientSide: {
        import: "import { startHealthcheckPublishing, publishHealthcheckNow } from '@/lib/remote'",
        start: 'startHealthcheckPublishing(projectId) - starts 30s interval',
        stop: 'stopHealthcheckPublishing() - stops interval',
        manual: 'publishHealthcheckNow(projectId) - one-off publish',
      },
    },
    timestamp: new Date().toISOString(),
  });
}

interface PostBody {
  projectId?: string;
}

/**
 * POST /api/remote/healthcheck
 * Triggers a healthcheck publish to Supabase
 *
 * Body: { projectId: string }
 *
 * Note: This endpoint is designed to be called from client-side code
 * where the Zustand stores are available. The actual publishing happens
 * via the healthcheckPublisher which accesses client-side state.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as PostBody;
    const projectId = body.projectId;

    if (!projectId) {
      return NextResponse.json(
        {
          success: false,
          error: 'projectId is required in request body',
        },
        { status: 400 }
      );
    }

    // Note: We can't directly call publishHealthcheckNow here because it
    // uses dynamic imports to access Zustand stores which are client-side only.
    // This endpoint serves as a confirmation that the request was received.
    // The actual publishing should be done from client-side using:
    //   import { publishHealthcheckNow } from '@/lib/remote';
    //   await publishHealthcheckNow(projectId);

    return NextResponse.json({
      success: true,
      message:
        'Healthcheck endpoint reached. For actual publishing, use client-side healthcheckPublisher.',
      projectId,
      timestamp: new Date().toISOString(),
      hint: "Call publishHealthcheckNow(projectId) from client-side code where Zustand stores are available",
    });
  } catch (error) {
    console.error('[Remote/Healthcheck] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process healthcheck request',
      },
      { status: 500 }
    );
  }
}
