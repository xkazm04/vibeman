import { NextRequest, NextResponse } from 'next/server';
import { monitorServiceDb } from '@/lib/monitorServiceDb';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const callId = searchParams.get('callId');

    if (!callId) {
      return NextResponse.json(
        { success: false, error: 'callId is required' },
        { status: 400 }
      );
    }

    const messages = await monitorServiceDb.getCallMessages(callId);

    return NextResponse.json({
      success: true,
      messages
    });
  } catch (error) {
    console.error('GET /api/monitor/messages error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch messages' },
      { status: 500 }
    );
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
    console.error('POST /api/monitor/messages error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create message' },
      { status: 500 }
    );
  }
}
