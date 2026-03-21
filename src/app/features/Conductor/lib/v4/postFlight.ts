/**
 * Conductor V4 Post-Flight Processor
 *
 * After CLI session ends, updates:
 * - Ideas: status → 'implemented'
 * - Contexts: implemented_tasks counter, target_fulfillment
 * - Brain: implementation signals
 * - Conductor run: status, metrics
 */

import { getDatabase } from '@/app/db/connection';
import { conductorRepository } from '../conductor.repository';
import { logger } from '@/lib/logger';

interface PostFlightResult {
  implementationsProcessed: number;
  ideasUpdated: number;
  contextsUpdated: number;
  status: 'completed' | 'partial' | 'failed';
}

/**
 * Process post-flight updates after a V4 session completes.
 *
 * Queries implementation_log entries created during the run's time window,
 * then cascades updates to ideas, contexts, and brain signals.
 */
export function processPostFlight(
  runId: string,
  projectId: string,
  startedAt: string,
  goalId?: string,
): PostFlightResult {
  const db = getDatabase();
  const result: PostFlightResult = {
    implementationsProcessed: 0,
    ideasUpdated: 0,
    contextsUpdated: 0,
    status: 'completed',
  };

  try {
    // 1. Find implementation logs created during this run
    const logs = db.prepare(
      `SELECT id, project_id, context_id, requirement_name, title, overview
       FROM implementation_log
       WHERE project_id = ? AND created_at >= ?
       ORDER BY created_at ASC`
    ).all(projectId, startedAt) as Array<{
      id: string;
      project_id: string;
      context_id: string | null;
      requirement_name: string;
      title: string;
      overview: string;
    }>;

    result.implementationsProcessed = logs.length;

    if (logs.length === 0) {
      logger.warn(`[V4 Post-flight] No implementation logs found for run ${runId}`);
      result.status = 'failed';
      return result;
    }

    // 2. Update idea statuses → 'implemented'
    const updateIdeaStmt = db.prepare(
      `UPDATE ideas SET status = 'implemented', implemented_at = datetime('now'), updated_at = datetime('now')
       WHERE requirement_id = ? AND status IN ('pending', 'accepted')`
    );

    const createIdeaStmt = db.prepare(
      `INSERT OR IGNORE INTO ideas (id, scan_id, project_id, category, title, description, status, implemented_at, created_at, updated_at)
       VALUES (?, 'conductor-v4', ?, 'conductor', ?, ?, 'implemented', datetime('now'), datetime('now'), datetime('now'))`
    );

    for (const log of logs) {
      // Try to find existing idea by requirement_id
      const changes = updateIdeaStmt.run(log.requirement_name);
      if (changes.changes > 0) {
        result.ideasUpdated++;
      } else {
        // No matching idea — create one with 'implemented' status
        const ideaId = `v4-${log.id.substring(0, 8)}`;
        createIdeaStmt.run(ideaId, projectId, log.title, log.overview);
        result.ideasUpdated++;
      }
    }

    // 3. Update context implemented_tasks counters
    const contextIds = new Set(
      logs.filter(l => l.context_id).map(l => l.context_id!)
    );

    const incrementContextStmt = db.prepare(
      `UPDATE contexts SET implemented_tasks = COALESCE(implemented_tasks, 0) + 1, updated_at = datetime('now')
       WHERE id = ?`
    );

    for (const contextId of contextIds) {
      const logsForContext = logs.filter(l => l.context_id === contextId).length;
      for (let i = 0; i < logsForContext; i++) {
        incrementContextStmt.run(contextId);
      }
      result.contextsUpdated++;
    }

    // 4. Update target_fulfillment for affected contexts
    const updateFulfillmentStmt = db.prepare(
      `UPDATE contexts SET target_fulfillment = ?, updated_at = datetime('now') WHERE id = ?`
    );

    for (const contextId of contextIds) {
      const contextLogs = logs
        .filter(l => l.context_id === contextId)
        .map(l => l.title)
        .join(', ');
      updateFulfillmentStmt.run(
        `Completed via Conductor V4: ${contextLogs}`,
        contextId
      );
    }

    // 5. Record brain signals (fire-and-forget)
    try {
      for (const log of logs) {
        db.prepare(
          `INSERT OR IGNORE INTO brain_signals (id, project_id, signal_type, data, weight, created_at)
           VALUES (?, ?, 'implementation', ?, 1.5, datetime('now'))`
        ).run(
          `v4-signal-${log.id.substring(0, 8)}`,
          projectId,
          JSON.stringify({
            requirementName: log.requirement_name,
            title: log.title,
            contextId: log.context_id,
            success: true,
            source: 'conductor-v4',
          })
        );
      }
    } catch (signalErr) {
      // Non-blocking — brain signals are optional
      logger.warn(`[V4 Post-flight] Brain signal recording failed: ${signalErr}`);
    }

    // 6. Update conductor run
    const metrics = {
      tasksCompleted: logs.length,
      tasksFailed: 0,
      totalImplementations: logs.length,
      contextsUpdated: result.contextsUpdated,
      ideasUpdated: result.ideasUpdated,
    };

    conductorRepository.updateRunStatus(runId, 'completed', metrics);

    // 7. Mark Goal as completed
    if (goalId && logs.length > 0) {
      try {
        db.prepare(
          `UPDATE goals SET status = 'done', updated_at = datetime('now') WHERE id = ? AND status != 'done'`
        ).run(goalId);
        logger.info(`[V4 Post-flight] Goal ${goalId} marked as done`);
      } catch (goalErr) {
        logger.warn(`[V4 Post-flight] Failed to update goal status: ${goalErr}`);
      }
    }

    logger.info(`[V4 Post-flight] Run ${runId}: ${logs.length} implementations, ${result.ideasUpdated} ideas updated, ${result.contextsUpdated} contexts updated`);

    return result;

  } catch (err) {
    logger.error(`[V4 Post-flight] Error processing run ${runId}: ${err}`);
    result.status = 'failed';
    return result;
  }
}

/**
 * Process an interrupted run — count partial work and prepare for resume.
 */
export function processInterruptedRun(
  runId: string,
  projectId: string,
  startedAt: string,
  goalId?: string,
): { logsCreated: number; sessionName: string } {
  const db = getDatabase();

  const logsCreated = db.prepare(
    `SELECT COUNT(*) as count FROM implementation_log
     WHERE project_id = ? AND created_at >= ?`
  ).get(projectId, startedAt) as { count: number } | undefined;

  conductorRepository.updateRunStatus(runId, 'interrupted');

  // Mark goal as in_progress if partial work was done (not 'done' — incomplete)
  if (goalId && (logsCreated?.count || 0) > 0) {
    try {
      db.prepare(
        `UPDATE goals SET status = 'in_progress', updated_at = datetime('now') WHERE id = ? AND status = 'open'`
      ).run(goalId);
    } catch { /* non-blocking */ }
  }

  return {
    logsCreated: logsCreated?.count || 0,
    sessionName: `conductor-v4-${runId.substring(0, 12)}`,
  };
}
