import { getDatabase } from '../connection';
import { getCurrentTimestamp } from './repository.utils';
import { generateId } from '@/lib/idGenerator';

export interface DbFileWriteQueueItem {
  id: string;
  idea_id: string;
  project_path: string;
  file_name: string;
  content: string;
  status: 'pending' | 'writing' | 'completed' | 'failed';
  attempts: number;
  max_attempts: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export const fileWriteQueueRepository = {
  /**
   * Enqueue a file write. Returns the queue item ID.
   */
  enqueue: (item: {
    ideaId: string;
    projectPath: string;
    fileName: string;
    content: string;
  }): string => {
    const db = getDatabase();
    const id = generateId('fwq');
    const now = getCurrentTimestamp();
    db.prepare(`
      INSERT INTO file_write_queue (id, idea_id, project_path, file_name, content, status, attempts, max_attempts, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'pending', 0, 5, ?, ?)
    `).run(id, item.ideaId, item.projectPath, item.fileName, item.content, now, now);
    return id;
  },

  /**
   * Claim the next pending item for processing (atomic status transition).
   */
  claimNext: (): DbFileWriteQueueItem | null => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    // Find the oldest pending item that hasn't exceeded max_attempts
    const item = db.prepare(`
      SELECT * FROM file_write_queue
      WHERE status IN ('pending', 'failed') AND attempts < max_attempts
      ORDER BY created_at ASC
      LIMIT 1
    `).get() as DbFileWriteQueueItem | undefined;

    if (!item) return null;

    // Atomically mark as writing
    db.prepare(`
      UPDATE file_write_queue SET status = 'writing', attempts = attempts + 1, updated_at = ?
      WHERE id = ? AND status IN ('pending', 'failed')
    `).run(now, item.id);

    return { ...item, status: 'writing', attempts: item.attempts + 1, updated_at: now };
  },

  /**
   * Mark a queue item as completed.
   */
  markCompleted: (id: string): void => {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    db.prepare(`
      UPDATE file_write_queue SET status = 'completed', updated_at = ?
      WHERE id = ?
    `).run(now, id);
  },

  /**
   * Mark a queue item as failed with an error message.
   */
  markFailed: (id: string, error: string): void => {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    db.prepare(`
      UPDATE file_write_queue SET status = 'failed', last_error = ?, updated_at = ?
      WHERE id = ?
    `).run(error, now, id);
  },

  /**
   * Get queue item by idea ID.
   */
  getByIdeaId: (ideaId: string): DbFileWriteQueueItem | null => {
    const db = getDatabase();
    return (db.prepare(`
      SELECT * FROM file_write_queue WHERE idea_id = ? ORDER BY created_at DESC LIMIT 1
    `).get(ideaId) as DbFileWriteQueueItem | undefined) ?? null;
  },

  /**
   * Count items by status.
   */
  countByStatus: (status: DbFileWriteQueueItem['status']): number => {
    const db = getDatabase();
    return (db.prepare(`SELECT COUNT(*) as count FROM file_write_queue WHERE status = ?`).get(status) as { count: number }).count;
  },

  /**
   * Clean up completed items older than the given number of days.
   */
  purgeCompleted: (olderThanDays: number = 7): number => {
    const db = getDatabase();
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();
    return db.prepare(`DELETE FROM file_write_queue WHERE status = 'completed' AND updated_at < ?`).run(cutoff).changes;
  },
};
