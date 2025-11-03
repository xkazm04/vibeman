import { NextRequest, NextResponse } from 'next/server';
import { monitorServiceDb } from '@/lib/monitorServiceDb';

function handleError(errorMessage: string, statusCode = 500) {
  return NextResponse.json(
    { success: false, error: errorMessage },
    { status: statusCode }
  );
}

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
    return handleError('Failed to fetch calls');
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
    return handleError('Failed to create call');
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { callId, ...updates } = body;

    if (!callId) {
      return handleError('callId is required', 400);
    }

    const call = await monitorServiceDb.updateCall(callId, updates);

    if (!call) {
      return handleError('Call not found', 404);
    }

    return NextResponse.json({
      success: true,
      call
    });
  } catch (error) {
    return handleError('Failed to update call');
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const callId = searchParams.get('callId');

    if (!callId) {
      return handleError('callId is required', 400);
    }

    const deleted = await monitorServiceDb.deleteCall(callId);

    return NextResponse.json({
      success: deleted,
      message: deleted ? 'Call deleted' : 'Call not found'
    });
  } catch (error) {
    return handleError('Failed to delete call');
  }
}
