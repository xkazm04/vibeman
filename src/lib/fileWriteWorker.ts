/**
 * File Write Queue Worker
 *
 * Processes pending file writes from the file_write_queue table.
 * On success, transitions the idea from 'accepted_pending_file' to 'accepted'.
 * On max-attempt failure, the idea stays as 'accepted_pending_file' for manual retry.
 *
 * Called synchronously from the accept endpoint (inline processing)
 * and can be triggered externally via /api/file-write-queue/process.
 */

import { fileWriteQueueDb, ideaDb } from '@/app/db';
import { createRequirement } from '@/app/Claude/lib/claudeCodeManager';
import { logger } from '@/lib/logger';

/**
 * Process a single queue item. Returns true if the file was written successfully.
 */
export function processNextFileWrite(): boolean {
  const item = fileWriteQueueDb.claimNext();
  if (!item) return false;

  try {
    const result = createRequirement(item.project_path, item.file_name, item.content, true);

    if (!result.success) {
      throw new Error(result.error || 'createRequirement returned failure');
    }

    // File written — transition idea to 'accepted' and mark queue item completed
    fileWriteQueueDb.markCompleted(item.id);
    ideaDb.updateIdea(item.idea_id, { status: 'accepted' });

    logger.info('[FileWriteWorker] File written successfully', {
      ideaId: item.idea_id,
      fileName: item.file_name,
    });

    return true;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    fileWriteQueueDb.markFailed(item.id, errorMsg);

    logger.error('[FileWriteWorker] File write failed', {
      ideaId: item.idea_id,
      fileName: item.file_name,
      attempt: item.attempts,
      maxAttempts: item.max_attempts,
      error: errorMsg,
    });

    return false;
  }
}

/**
 * Drain all pending items from the queue (up to maxItems).
 * Returns the number of items successfully processed.
 */
export function drainFileWriteQueue(maxItems: number = 20): {
  processed: number;
  failed: number;
} {
  let processed = 0;
  let failed = 0;

  for (let i = 0; i < maxItems; i++) {
    const pending = fileWriteQueueDb.countByStatus('pending') + fileWriteQueueDb.countByStatus('failed');
    if (pending === 0) break;

    const success = processNextFileWrite();
    if (success) {
      processed++;
    } else {
      failed++;
    }
  }

  return { processed, failed };
}
