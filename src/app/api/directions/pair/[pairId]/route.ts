/**
 * DELETE /api/directions/pair/[pairId]
 * Delete both directions in a pair
 */

import { NextRequest, NextResponse } from 'next/server';
import { directionDb } from '@/app/db';
import { logger } from '@/lib/logger';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ pairId: string }> }
) {
  try {
    const { pairId } = await params;

    // Delete both directions in the pair
    const deletedCount = directionDb.deleteDirectionPair(pairId);

    if (deletedCount === 0) {
      return NextResponse.json(
        { error: 'Direction pair not found' },
        { status: 404 }
      );
    }

    logger.info('[API] Direction pair deleted:', { pairId, deletedCount });

    return NextResponse.json({
      success: true,
      deletedCount,
    });
  } catch (error) {
    logger.error('[API] Direction pair delete error:', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
