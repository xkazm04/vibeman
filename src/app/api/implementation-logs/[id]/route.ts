/**
 * API Route: Update Implementation Log
 * Handles PATCH requests to update implementation logs (e.g., mark as tested)
 */

import { NextRequest, NextResponse } from 'next/server';
import { implementationLogRepository } from '@/app/db/repositories/implementation-log.repository';
import { logger } from '@/lib/logger';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate that id exists
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Log ID is required' },
        { status: 400 }
      );
    }

    // Check if log exists
    const existingLog = implementationLogRepository.getLogById(id);
    if (!existingLog) {
      return NextResponse.json(
        { success: false, error: 'Implementation log not found' },
        { status: 404 }
      );
    }

    // Update the log
    const updatedLog = implementationLogRepository.updateLog(id, body);

    return NextResponse.json({
      success: true,
      data: updatedLog,
    });
  } catch (error) {
    logger.error('Error updating implementation log:', { error });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update log'
      },
      { status: 500 }
    );
  }
}
