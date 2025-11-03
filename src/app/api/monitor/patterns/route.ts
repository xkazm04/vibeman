/**
 * Monitor Patterns API
 * Endpoints for pattern operations
 */

import { NextResponse } from 'next/server';
import { monitorServiceDb } from '@/lib/monitorServiceDb';

export async function GET() {
  try {
    const patterns = await monitorServiceDb.getAllPatterns();

    return NextResponse.json({
      success: true,
      patterns
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch patterns' },
      { status: 500 }
    );
  }
}
