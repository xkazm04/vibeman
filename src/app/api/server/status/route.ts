import { NextResponse } from 'next/server';
import { processManager } from '@/lib/processManager';

export async function GET() {
  try {
    console.log('Status API called - getting all statuses');
    const statuses = await processManager.getAllStatuses();
    console.log('Status API returning:', Object.keys(statuses).length, 'processes');
    return NextResponse.json({ statuses });
  } catch (error) {
    console.error('Status API error:', error);
    return NextResponse.json(
      { error: 'Failed to get statuses' },
      { status: 500 }
    );
  }
}