import { NextRequest, NextResponse } from 'next/server';
import { monitorServiceDb } from '@/lib/monitorServiceDb';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let calls;
    
    if (status && (status === 'active' || status === 'completed' || status === 'failed' || status === 'abandoned')) {
      calls = await monitorServiceDb.getCallsByStatus(status);
    } else if (startDate && endDate) {
      calls = await monitorServiceDb.getCallsByDateRange(startDate, endDate);
    } else {
      calls = await monitorServiceDb.getAllCalls();
    }

    return NextResponse.json({
      success: true,
      calls
    });
  } catch (error) {
    console.error('GET /api/monitor/calls error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch calls' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const call = await monitorServiceDb.createCall({
      callId: body.callId,
      userId: body.userId,
      startTime: body.startTime,
      status: body.status,
      intent: body.intent,
      promptVersionId: body.promptVersionId,
      metadata: body.metadata
    });

    return NextResponse.json({
      success: true,
      call
    });
  } catch (error) {
    console.error('POST /api/monitor/calls error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create call' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { callId, ...updates } = body;

    if (!callId) {
      return NextResponse.json(
        { success: false, error: 'callId is required' },
        { status: 400 }
      );
    }

    const call = await monitorServiceDb.updateCall(callId, updates);

    if (!call) {
      return NextResponse.json(
        { success: false, error: 'Call not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      call
    });
  } catch (error) {
    console.error('PATCH /api/monitor/calls error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update call' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const callId = searchParams.get('callId');

    if (!callId) {
      return NextResponse.json(
        { success: false, error: 'callId is required' },
        { status: 400 }
      );
    }

    const deleted = await monitorServiceDb.deleteCall(callId);

    return NextResponse.json({
      success: deleted,
      message: deleted ? 'Call deleted' : 'Call not found'
    });
  } catch (error) {
    console.error('DELETE /api/monitor/calls error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete call' },
      { status: 500 }
    );
  }
}
