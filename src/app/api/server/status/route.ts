import { NextResponse } from 'next/server';
import { processManager } from '@/lib/processManager';

export async function GET() {
  try {
    const statuses = await processManager.getAllStatuses();
    return NextResponse.json({ statuses });
  } catch (error) {
    console.error('Status API error:', error);
    return NextResponse.json(
      { error: 'Failed to get statuses' },
      { status: 500 }
    );
  }
}