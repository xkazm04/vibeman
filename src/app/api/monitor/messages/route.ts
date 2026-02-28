import { NextRequest, NextResponse } from 'next/server';
import { monitorDb } from '@/lib/monitor_database';
import { withObservability } from '@/lib/observability/middleware';
import { handleApiError } from '@/lib/api-errors';

function createErrorResponse(error: string, status: number) {
  return NextResponse.json({ success: false, error }, { status });
}

async function handleGet(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const callId = searchParams.get('callId');

    if (!callId) {
      return createErrorResponse('callId is required', 400);
    }

    const messages = monitorDb.messages.getForCall(callId);

    return NextResponse.json({
      success: true,
      messages
    });
  } catch (error) {
    return handleApiError(error, 'Fetch messages');
  }
}

async function handlePost(request: NextRequest) {
  try {
    const body = await request.json();

    const message = monitorDb.messages.create({
      messageId: body.messageId,
      callId: body.callId,
      role: body.role,
      content: body.content,
      timestamp: body.timestamp,
      nodeId: body.nodeId,
      latencyMs: body.latencyMs,
      metadata: body.metadata,
    });

    return NextResponse.json({
      success: true,
      message
    });
  } catch (error) {
    return handleApiError(error, 'Create message');
  }
}

export const GET = withObservability(handleGet, '/api/monitor/messages');
export const POST = withObservability(handlePost, '/api/monitor/messages');
