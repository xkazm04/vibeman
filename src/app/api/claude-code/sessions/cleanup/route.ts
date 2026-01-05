/**
 * Session Cleanup API Route
 * Handles detection and cleanup of orphaned Claude Code sessions
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
    return NextResponse.json(
      { error: 'Failed to detect orphaned sessions' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/claude-code/sessions/cleanup
 * Clean up orphaned sessions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, sessionIds, projectId } = body;

    if (action === 'cleanup' && sessionIds && Array.isArray(sessionIds)) {
      // Clean up specific sessions
      const deletedCount = sessionRepository.bulkDelete(sessionIds);

      logger.info('Sessions cleaned up', {
        requestedCount: sessionIds.length,
        deletedCount,
      });

      return NextResponse.json({
        success: true,
        cleanedCount: deletedCount,
      });
    }

    if (action === 'cleanup-all') {
      // Get all orphaned sessions
      const orphaned = sessionRepository.getAllOrphaned({
        runningMinutes: ORPHAN_THRESHOLDS.RUNNING_NO_HEARTBEAT_MINUTES,
        pausedHours: ORPHAN_THRESHOLDS.PAUSED_STALE_HOURS,
        pendingHours: ORPHAN_THRESHOLDS.PENDING_STALE_HOURS,
      });

      // Collect all orphaned session IDs
      let allOrphanIds = [
        ...orphaned.staleRunning.map(s => s.id),
        ...orphaned.stalePaused.map(s => s.id),
        ...orphaned.stalePending.map(s => s.id),
      ];

      // Filter by projectId if provided
      if (projectId) {
        const projectSessions = new Set([
          ...orphaned.staleRunning.filter(s => s.project_id === projectId).map(s => s.id),
          ...orphaned.stalePaused.filter(s => s.project_id === projectId).map(s => s.id),
          ...orphaned.stalePending.filter(s => s.project_id === projectId).map(s => s.id),
        ]);
        allOrphanIds = allOrphanIds.filter(id => projectSessions.has(id));
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
    }

    if (action === 'heartbeat' && body.sessionId) {
      // Update heartbeat for a session
      const success = sessionRepository.updateHeartbeat(body.sessionId);

      return NextResponse.json({
        success,
        updatedAt: new Date(),
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    logger.error('Failed to clean up sessions', { error });
    return NextResponse.json(
      { error: 'Failed to clean up sessions' },
      { status: 500 }
    );
  }
}
