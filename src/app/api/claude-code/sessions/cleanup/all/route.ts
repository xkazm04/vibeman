/**
 * Cleanup All Orphaned Sessions API Route
 * POST /api/claude-code/sessions/cleanup/all
 */

import { NextRequest, NextResponse } from 'next/server';
import { sessionRepository } from '@/app/db/repositories/session.repository';
import { logger } from '@/lib/logger';
import { ORPHAN_THRESHOLDS } from '@/app/features/TaskRunner/lib/sessionCleanup.types';

/**
 * POST /api/claude-code/sessions/cleanup/all
 * Clean up all orphaned sessions, optionally filtered by projectId
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { projectId } = body;

    // Get all orphaned sessions
    const orphaned = sessionRepository.getAllOrphaned({
      runningMinutes: ORPHAN_THRESHOLDS.RUNNING_NO_HEARTBEAT_MINUTES,
      pausedHours: ORPHAN_THRESHOLDS.PAUSED_STALE_HOURS,
      pendingHours: ORPHAN_THRESHOLDS.PENDING_STALE_HOURS,
    });

    // Collect all orphaned session IDs
    let allOrphanIds = [
      ...orphaned.staleRunning.map((s) => s.id),
      ...orphaned.stalePaused.map((s) => s.id),
      ...orphaned.stalePending.map((s) => s.id),
    ];

    // Filter by projectId if provided
    if (projectId) {
      const projectSessions = new Set([
        ...orphaned.staleRunning.filter((s) => s.project_id === projectId).map((s) => s.id),
        ...orphaned.stalePaused.filter((s) => s.project_id === projectId).map((s) => s.id),
        ...orphaned.stalePending.filter((s) => s.project_id === projectId).map((s) => s.id),
      ]);
      allOrphanIds = allOrphanIds.filter((id) => projectSessions.has(id));
    }

    const deletedCount = sessionRepository.bulkDelete(allOrphanIds);

    logger.info('All orphaned sessions cleaned up', {
      totalOrphans: allOrphanIds.length,
      deletedCount,
      projectId: projectId || 'all',
    });

    return NextResponse.json({
      success: true,
      cleanedCount: deletedCount,
    });
  } catch (error) {
    logger.error('Failed to clean up all sessions', { error });
    return NextResponse.json({ error: 'Failed to clean up all sessions' }, { status: 500 });
  }
}
