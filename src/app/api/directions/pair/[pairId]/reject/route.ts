/**
 * POST /api/directions/pair/[pairId]/reject
 * Reject both directions in a pair
 */

import { NextRequest, NextResponse } from 'next/server';
import { directionDb } from '@/app/db';
import { logger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pairId: string }> }
) {
  try {
    const { pairId } = await params;

    // Reject both directions in the pair
    const rejectedCount = directionDb.rejectDirectionPair(pairId);

    if (rejectedCount === 0) {
      return NextResponse.json(
        { error: 'Direction pair not found or already processed' },
        { status: 404 }
      );
    }

    logger.info('[API] Direction pair rejected:', { pairId, rejectedCount });

    return NextResponse.json({
      success: true,
      rejectedCount,
    });
  } catch (error) {
    logger.error('[API] Direction pair reject error:', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
