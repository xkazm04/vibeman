/**
 * Migration 039: Social Feedback Items
 * Creates table for storing fetched feedback item IDs to prevent duplicates
 */

import Database from 'better-sqlite3';

export function migrate039SocialFeedbackItems(db: Database.Database): void {
  // Create social_feedback_items table for deduplication
  db.exec(`
    CREATE TABLE IF NOT EXISTS social_feedback_items (
      id TEXT PRIMARY KEY,
      config_id TEXT NOT NULL,
      external_id TEXT NOT NULL,
      channel_type TEXT NOT NULL,

      -- Basic info for display without refetching
      content_preview TEXT,
      author_name TEXT,
      author_id TEXT,

      -- Metadata
      external_created_at TEXT,
      fetched_at TEXT NOT NULL DEFAULT (datetime('now')),

      -- Status tracking
      is_processed INTEGER DEFAULT 0,
      processed_at TEXT,

      FOREIGN KEY (config_id) REFERENCES social_channel_configs(id) ON DELETE CASCADE,
      UNIQUE(config_id, external_id)
    );
  `);

  // Create indexes for efficient queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_social_feedback_items_config_id
      ON social_feedback_items(config_id);
    CREATE INDEX IF NOT EXISTS idx_social_feedback_items_external_id
      ON social_feedback_items(config_id, external_id);
    CREATE INDEX IF NOT EXISTS idx_social_feedback_items_fetched_at
      ON social_feedback_items(config_id, fetched_at DESC);
    CREATE INDEX IF NOT EXISTS idx_social_feedback_items_channel_type
      ON social_feedback_items(channel_type);
  `);

  console.log('[Migration 039] Created social_feedback_items table');
}
