import { NextRequest, NextResponse } from 'next/server';
import { getOAuthStatus } from '@/lib/personas/googleOAuth';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const result = getOAuthStatus(sessionId);

    if (result.status === 'not_found') {
      return NextResponse.json(
        { error: 'Session not found or expired' },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to check OAuth status', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
