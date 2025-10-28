import { NextRequest, NextResponse } from 'next/server';
import { processManager } from '@/lib/processManager';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const logs = processManager.getLogs(id);
    return NextResponse.json({ logs });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get logs' },
      { status: 500 }
    );
  }
}