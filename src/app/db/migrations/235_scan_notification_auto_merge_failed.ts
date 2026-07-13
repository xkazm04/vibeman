/**
 * Migration 235: Allow 'auto_merge_failed' scan-notification type
 *
 * The scan_notifications.notification_type CHECK constraint originally allowed
 * only ('scan_started','scan_completed','scan_failed','auto_merge_completed').
 * The scan-queue worker now surfaces auto-merge FAILURES as notifications (not
 * just an opaque auto_merge_status string), which needs a dedicated type.
 *
 * SQLite cannot ALTER a CHECK constraint, so we rebuild the table with the
 * widened constraint, preserving all rows and re-creating the indexes. The
 * table is a child in its only FK (→ scan_queue), so rebuilding it is safe.
 */

import type { MigrationLogger } from './migration.utils';

interface MigrationDb {
  prepare: (sql: string) => { run: (...args: unknown[]) => unknown; get: (...args: unknown[]) => unknown };
  exec: (sql: string) => void;
}

export function migrate235ScanNotificationAutoMergeFailed(
  db: MigrationDb,
  logger: MigrationLogger
) {
  // If the table doesn't exist yet, the base schema (schema.tables.ts) will
  // create it with the widened constraint already — nothing to do.
  const exists = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='scan_notifications'")
    .get();
  if (!exists) {
    logger.info('[Migration 235] scan_notifications not present yet; base schema will include the new type');
    return;
  }

  // Skip if the constraint already permits the new value (fresh DB or re-run).
  const tableSql = (db
    .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='scan_notifications'")
    .get() as { sql?: string } | undefined)?.sql ?? '';
  if (tableSql.includes('auto_merge_failed')) {
    logger.info('[Migration 235] scan_notifications already allows auto_merge_failed');
    return;
  }

  db.exec(`
    CREATE TABLE scan_notifications_new (
      id TEXT PRIMARY KEY,
      queue_item_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      notification_type TEXT NOT NULL CHECK (notification_type IN ('scan_started', 'scan_completed', 'scan_failed', 'auto_merge_completed', 'auto_merge_failed')),
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      data TEXT,
      read INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (queue_item_id) REFERENCES scan_queue(id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    INSERT INTO scan_notifications_new
      (id, queue_item_id, project_id, notification_type, title, message, data, read, created_at)
    SELECT id, queue_item_id, project_id, notification_type, title, message, data, read, created_at
    FROM scan_notifications;
  `);

  db.exec('DROP TABLE scan_notifications;');
  db.exec('ALTER TABLE scan_notifications_new RENAME TO scan_notifications;');

  db.exec(
    'CREATE INDEX IF NOT EXISTS idx_scan_notifications_queue_item ON scan_notifications(queue_item_id);'
  );
  db.exec(
    'CREATE INDEX IF NOT EXISTS idx_scan_notifications_project ON scan_notifications(project_id, read);'
  );

  logger.info('[Migration 235] Rebuilt scan_notifications with auto_merge_failed type');
}
