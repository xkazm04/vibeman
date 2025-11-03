import { NextResponse } from 'next/server';
import { monitorServiceDb } from '@/lib/monitorServiceDb';

export async function GET() {
  try {
    const stats = await monitorServiceDb.getCallStatistics();

    return NextResponse.json({
      success: true,
      statistics: stats
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
