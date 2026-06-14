import { getDatabase } from '../connection';
import { DbScanQueueItem } from '../models/types';
import { createGenericRepository } from './generic.repository';

const base = createGenericRepository<DbScanQueueItem>({
  tableName: 'scan_queue',
  defaultOrder: 'priority DESC, created_at ASC',
});

/** Expose `base` for sibling modules that need getById */
export { base as scanQueueBase };

/**
 * Scan Queue Core Repository
 * Handles queue CRUD, status/progress tracking, scan linking, and cleanup
 */
export const scanQueueCoreRepository = {
  /**
   * Get all queue items for a project
   */
  getQueueByProject: (projectId: string): DbScanQueueItem[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM scan_queue
      WHERE project_id = ?
      ORDER BY priority DESC, created_at ASC
    `);
    return stmt.all(projectId) as DbScanQueueItem[];
  },

  /**
   * Get queue items by status
   */
  getQueueByStatus: (projectId: string, status: DbScanQueueItem['status']): DbScanQueueItem[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM scan_queue
      WHERE project_id = ? AND status = ?
      ORDER BY priority DESC, created_at ASC
    `);
    return stmt.all(projectId, status) as DbScanQueueItem[];
  },

  /**
   * Get next pending queue item (highest priority)
   */
  getNextPending: (projectId?: string): DbScanQueueItem | null => {
    const db = getDatabase();
    let stmt;
    let result;

    if (projectId) {
      stmt = db.prepare(`
        SELECT * FROM scan_queue
        WHERE project_id = ? AND status = 'queued'
        ORDER BY priority DESC, created_at ASC
        LIMIT 1
      `);
      result = stmt.get(projectId) as DbScanQueueItem | undefined;
    } else {
      stmt = db.prepare(`
        SELECT * FROM scan_queue
        WHERE status = 'queued'
        ORDER BY priority DESC, created_at ASC
        LIMIT 1
      `);
      result = stmt.get() as DbScanQueueItem | undefined;
    }

    return result || null;
  },

  /**
   * Atomically claim the next pending queue item for processing.
   * Uses UPDATE ... WHERE status='queued' pattern to prevent race conditions.
   * Retries with subsequent queued items if a claim fails due to another worker.
   * Returns the claimed item or null if no queued items remain.
   */
  claimNextPending: (projectId?: string): DbScanQueueItem | null => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const findStmt = projectId
      ? db.prepare(`
          SELECT id FROM scan_queue
          WHERE project_id = ? AND status = 'queued'
          ORDER BY priority DESC, created_at ASC
          LIMIT 10
        `)
      : db.prepare(`
          SELECT id FROM scan_queue
          WHERE status = 'queued'
          ORDER BY priority DESC, created_at ASC
          LIMIT 10
        `);

    const updateStmt = db.prepare(`
      UPDATE scan_queue
      SET status = 'running', started_at = ?, updated_at = ?
      WHERE id = ? AND status = 'queued'
    `);

    // Get all queued candidates and try to claim each in priority order
    const candidates = (projectId
      ? findStmt.all(projectId)
      : findStmt.all()
    ) as { id: string }[];

    for (const candidate of candidates) {
      const result = updateStmt.run(now, now, candidate.id);
      if (result.changes > 0) {
        // Successfully claimed - return the item
        return base.getById(candidate.id);
      }
      // Another worker claimed this one, try the next candidate
    }

    return null;
  },

  /**
   * Get a single queue item by ID
   */
  getQueueItemById: (id: string): DbScanQueueItem | null => base.getById(id),

  /**
   * Create a new queue item
   */
  createQueueItem: (item: {
    id: string;
    project_id: string;
    scan_type: string;
    context_id?: string | null;
    trigger_type: DbScanQueueItem['trigger_type'];
    trigger_metadata?: Record<string, unknown>;
    priority?: number;
    auto_merge_enabled?: boolean;
  }): DbScanQueueItem => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO scan_queue (
        id, project_id, scan_type, context_id, trigger_type, trigger_metadata,
        status, priority, progress, auto_merge_enabled, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, 'queued', ?, 0, ?, ?, ?)
    `);

    stmt.run(
      item.id,
      item.project_id,
      item.scan_type,
      item.context_id || null,
      item.trigger_type,
      item.trigger_metadata ? JSON.stringify(item.trigger_metadata) : null,
      item.priority || 0,
      item.auto_merge_enabled ? 1 : 0,
      now,
      now
    );

    return base.getById(item.id)!;
  },

  /**
   * Update queue item status
   */
  updateStatus: (id: string, status: DbScanQueueItem['status'], error_message?: string): DbScanQueueItem | null => {
    const db = getDatabase();
    const now = new Date().toISOString();

    let updateFields = 'status = ?, updated_at = ?';
    const params: (string | number)[] = [status, now];

    if (status === 'running') {
      updateFields += ', started_at = ?';
      params.push(now);
    } else if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      updateFields += ', completed_at = ?';
      params.push(now);
    }

    if (error_message !== undefined) {
      updateFields += ', error_message = ?';
      params.push(error_message);
    }

    params.push(id);

    const stmt = db.prepare(`
      UPDATE scan_queue
      SET ${updateFields}
      WHERE id = ?
    `);

    const result = stmt.run(...params);

    if (result.changes === 0) {
      return null;
    }

    return base.getById(id)!;
  },

  /**
   * Update queue item progress
   */
  updateProgress: (id: string, progress: number, message?: string, currentStep?: string, totalSteps?: number): DbScanQueueItem | null => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE scan_queue
      SET progress = ?,
          progress_message = ?,
          current_step = ?,
          total_steps = ?,
          updated_at = ?
      WHERE id = ?
    `);

    const result = stmt.run(
      Math.min(100, Math.max(0, progress)),
      message || null,
      currentStep || null,
      totalSteps || null,
      now,
      id
    );

    if (result.changes === 0) {
      return null;
    }

    return base.getById(id)!;
  },

  /**
   * Link completed scan to queue item
   */
  linkScan: (id: string, scanId: string, resultSummary?: string): DbScanQueueItem | null => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE scan_queue
      SET scan_id = ?, result_summary = ?, updated_at = ?
      WHERE id = ?
    `);

    const result = stmt.run(scanId, resultSummary || null, now, id);

    if (result.changes === 0) {
      return null;
    }

    return base.getById(id)!;
  },

  /**
   * Update auto-merge status
   */
  updateAutoMergeStatus: (id: string, status: string): DbScanQueueItem | null => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE scan_queue
      SET auto_merge_status = ?, updated_at = ?
      WHERE id = ?
    `);

    const result = stmt.run(status, now, id);

    if (result.changes === 0) {
      return null;
    }

    return base.getById(id)!;
  },

  /**
   * Reset orphaned running items back to queued.
   * Only items whose `started_at` is older than `staleThresholdMinutes` (or null)
   * are recovered — a job that started recently is most likely still genuinely
   * in flight (e.g. an LLM scan, or a concurrent live process / Next.js HMR
   * reload). Requeuing those would re-claim and execute them a second time.
   * Returns the number of items reset.
   */
  resetOrphanedRunning: (staleThresholdMinutes: number = 10): number => {
    const db = getDatabase();
    const now = new Date().toISOString();
    const cutoff = new Date(Date.now() - staleThresholdMinutes * 60_000).toISOString();

    const stmt = db.prepare(`
      UPDATE scan_queue
      SET status = 'queued', started_at = NULL, updated_at = ?,
          progress = 0, progress_message = 'Requeued after worker restart', current_step = NULL
      WHERE status = 'running'
        AND (started_at IS NULL OR started_at < ?)
    `);

    const result = stmt.run(now, cutoff);
    return result.changes;
  },

  /**
   * Delete a queue item
   */
  deleteQueueItem: (id: string): boolean => base.deleteById(id),

  /**
   * Delete old completed/failed queue items
   */
  cleanupOldItems: (projectId: string, daysOld: number = 30): number => {
    const db = getDatabase();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const stmt = db.prepare(`
      DELETE FROM scan_queue
      WHERE project_id = ?
        AND status IN ('completed', 'failed', 'cancelled')
        AND completed_at < ?
    `);

    const result = stmt.run(projectId, cutoffDate.toISOString());
    return result.changes;
  },
};
