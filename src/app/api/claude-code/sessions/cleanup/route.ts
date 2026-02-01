/**
 * Session Cleanup API Route
 * Handles detection and cleanup of orphaned Claude Code sessions
 *
 * Related endpoints:
 * - POST /api/claude-code/sessions/cleanup/all - Clean all orphaned sessions
 * - POST /api/claude-code/sessions/heartbeat - Update session heartbeat
 */

import { NextRequest, NextResponse } from 'next/server';
import { sessionRepository, sessionTaskRepository } from '@/app/db/repositories/session.repository';
import { logger } from '@/lib/logger';
import {
  ORPHAN_THRESHOLDS,
  type OrphanedSession,
  type OrphanReason,
  type CleanupStats,
} from '@/app/features/TaskRunner/lib/sessionCleanup.types';

/**
 * GET /api/claude-code/sessions/cleanup
 * Detect orphaned sessions
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const projectId = searchParams.get('projectId');

  try {
    // Get all orphaned sessions using thresholds
    const orphaned = sessionRepository.getAllOrphaned({
      runningMinutes: ORPHAN_THRESHOLDS.RUNNING_NO_HEARTBEAT_MINUTES,
      pausedHours: ORPHAN_THRESHOLDS.PAUSED_STALE_HOURS,
      pendingHours: ORPHAN_THRESHOLDS.PENDING_STALE_HOURS,
    });

    // Convert to OrphanedSession format
    const orphans: OrphanedSession[] = [];

    // Process stale running sessions
    for (const session of orphaned.staleRunning) {
      if (projectId && session.project_id !== projectId) continue;

      const taskStats = sessionTaskRepository.getStats(session.id);
      orphans.push({
        id: session.id,
        name: session.name,
        status: 'running',
        lastActivity: new Date(session.updated_at),
        reason: 'no_heartbeat' as OrphanReason,
        taskCount: taskStats.total,
        completedCount: taskStats.completed,
        failedCount: taskStats.failed,
        projectId: session.project_id,
        createdAt: new Date(session.created_at),
        updatedAt: new Date(session.updated_at),
      });
    }

    // Process stale paused sessions
    for (const session of orphaned.stalePaused) {
      if (projectId && session.project_id !== projectId) continue;

      const taskStats = sessionTaskRepository.getStats(session.id);
      orphans.push({
        id: session.id,
        name: session.name,
        status: 'paused',
        lastActivity: new Date(session.updated_at),
        reason: 'stale_paused' as OrphanReason,
        taskCount: taskStats.total,
        completedCount: taskStats.completed,
        failedCount: taskStats.failed,
        projectId: session.project_id,
        createdAt: new Date(session.created_at),
        updatedAt: new Date(session.updated_at),
      });
    }

    // Process stale pending sessions
    for (const session of orphaned.stalePending) {
      if (projectId && session.project_id !== projectId) continue;

      const taskStats = sessionTaskRepository.getStats(session.id);
      orphans.push({
        id: session.id,
        name: session.name,
        status: 'pending',
        lastActivity: new Date(session.updated_at),
        reason: 'stale_pending' as OrphanReason,
        taskCount: taskStats.total,
        completedCount: taskStats.completed,
        failedCount: taskStats.failed,
        projectId: session.project_id,
        createdAt: new Date(session.created_at),
        updatedAt: new Date(session.updated_at),
      });
    }

    const stats: CleanupStats = {
      orphanedCount: orphans.length,
      cleanedCount: 0,
      lastCleanup: null,
      lastScan: new Date(),
    };

    logger.info('Orphaned sessions detected', {
      orphanedCount: orphans.length,
      staleRunning: orphaned.staleRunning.length,
      stalePaused: orphaned.stalePaused.length,
      stalePending: orphaned.stalePending.length,
    });

    return NextResponse.json({ orphans, stats });
  } catch (error) {
    logger.error('Failed to detect orphaned sessions', { error });
    return NextResponse.json({ error: 'Failed to detect orphaned sessions' }, { status: 500 });
  }
}

/**
 * POST /api/claude-code/sessions/cleanup
 * Clean up specific sessions by ID
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionIds } = body;

    if (!sessionIds || !Array.isArray(sessionIds) || sessionIds.length === 0) {
      return NextResponse.json(
        { error: 'sessionIds array is required and must not be empty' },
        { status: 400 }
      );
    }

    const deletedCount = sessionRepository.bulkDelete(sessionIds);

    logger.info('Sessions cleaned up', {
      requestedCount: sessionIds.length,
      deletedCount,
    });

    return NextResponse.json({
      success: true,
      cleanedCount: deletedCount,
    });
  } catch (error) {
    logger.error('Failed to clean up sessions', { error });
    return NextResponse.json({ error: 'Failed to clean up sessions' }, { status: 500 });
  }
}
