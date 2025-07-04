import { NextRequest, NextResponse } from 'next/server';
import { processManager } from '@/lib/processManager';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const logs = processManager.getLogs(params.id);
    return NextResponse.json({ logs });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get logs' },
      { status: 500 }
    );
  }
}