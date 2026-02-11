import { NextRequest, NextResponse } from 'next/server';
import { personaDb } from '@/app/db';
import { cancelExecution } from '@/lib/personas/executionEngine';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get execution detail
    const execution = await personaDb.executions.getById(id);

    if (!execution) {
      return NextResponse.json(
        { error: 'Execution not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ execution });
  } catch (error) {
    console.error('Error getting execution detail:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get execution' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get execution to verify it exists
    const execution = await personaDb.executions.getById(id);

    if (!execution) {
      return NextResponse.json(
        { error: 'Execution not found' },
        { status: 404 }
      );
    }

    // Cancel execution
    await cancelExecution(id);

    // Update status to cancelled
    await personaDb.executions.updateStatus(id, 'cancelled');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error cancelling execution:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cancel execution' },
      { status: 500 }
    );
  }
}
