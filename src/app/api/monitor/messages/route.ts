import { NextRequest, NextResponse } from 'next/server';
import { monitorServiceDb } from '@/lib/monitorServiceDb';

function createErrorResponse(error: string, status: number) {
  return NextResponse.json({ success: false, error }, { status });
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const callId = searchParams.get('callId');

    if (!callId) {
      return createErrorResponse('callId is required', 400);
    }

    const messages = await monitorServiceDb.getCallMessages(callId);

    return NextResponse.json({
      success: true,
      messages
    });
  } catch (error) {
    return createErrorResponse('Failed to fetch messages', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const message = await monitorServiceDb.createMessage({
      messageId: body.messageId,
      callId: body.callId,
      role: body.role,
      content: body.content,
      timestamp: body.timestamp,
      nodeId: body.nodeId,
      latencyMs: body.latencyMs,
      metadata: body.metadata
    });

    return NextResponse.json({
      success: true,
      message
    });
  } catch (error) {
    return createErrorResponse('Failed to create message', 500);
  }
}
