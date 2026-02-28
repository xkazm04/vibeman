import { NextRequest, NextResponse } from 'next/server';
import { monitorDb } from '@/lib/monitor_database';
import { withObservability } from '@/lib/observability/middleware';
import { handleApiError } from '@/lib/api-errors';

function handleError(errorMessage: string, statusCode = 500) {
  return NextResponse.json(
    { success: false, error: errorMessage },
    { status: statusCode }
  );
}

async function handleGet(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let calls;

    if (status && (status === 'active' || status === 'completed' || status === 'failed' || status === 'abandoned')) {
      calls = await monitorDb.calls.getByStatus(status);
    } else if (startDate && endDate) {
      calls = await monitorDb.calls.getByDateRange(startDate, endDate);
    } else {
      calls = await monitorDb.calls.getAll();
    }

    return NextResponse.json({
      success: true,
      calls
    });
  } catch (error) {
    return handleApiError(error, 'Fetch calls');
  }
}

async function handlePost(request: NextRequest) {
  try {
    const body = await request.json();

    const call = await monitorDb.calls.create({
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
    return handleApiError(error, 'Create call');
  }
}

async function handlePatch(request: NextRequest) {
  try {
    const body = await request.json();
    const { callId, ...updates } = body;

    if (!callId) {
      return handleError('callId is required', 400);
    }

    const call = await monitorDb.calls.update(callId, updates);

    if (!call) {
      return handleError('Call not found', 404);
    }

    return NextResponse.json({
      success: true,
      call
    });
  } catch (error) {
    return handleApiError(error, 'Update call');
  }
}

async function handleDelete(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const callId = searchParams.get('callId');

    if (!callId) {
      return handleError('callId is required', 400);
    }

    const deleted = await monitorDb.calls.delete(callId);

    return NextResponse.json({
      success: deleted,
      message: deleted ? 'Call deleted' : 'Call not found'
    });
  } catch (error) {
    return handleApiError(error, 'Delete call');
  }
}

export const GET = withObservability(handleGet, '/api/monitor/calls');
export const POST = withObservability(handlePost, '/api/monitor/calls');
export const PATCH = withObservability(handlePatch, '/api/monitor/calls');
export const DELETE = withObservability(handleDelete, '/api/monitor/calls');
