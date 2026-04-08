import type { DbConnection } from './drivers/types';

/**
 * Create all database indexes (IF NOT EXISTS).
 * Indexes are created BEFORE migrations so migration queries can use them.
 */
export function createIndexes(db: DbConnection) {
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_goals_project_id ON goals(project_id);
    CREATE INDEX IF NOT EXISTS idx_goals_order_index ON goals(project_id, order_index);
    CREATE INDEX IF NOT EXISTS idx_context_groups_project_id ON context_groups(project_id);
    CREATE INDEX IF NOT EXISTS idx_context_groups_position ON context_groups(project_id, position);
    CREATE INDEX IF NOT EXISTS idx_contexts_project_id ON contexts(project_id);
    CREATE INDEX IF NOT EXISTS idx_contexts_group_id ON contexts(group_id);
    CREATE INDEX IF NOT EXISTS idx_events_project_id ON events(project_id);
    CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(project_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_events_type ON events(project_id, type);
    CREATE INDEX IF NOT EXISTS idx_scans_project_id ON scans(project_id);
    CREATE INDEX IF NOT EXISTS idx_scans_timestamp ON scans(project_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_ideas_scan_id ON ideas(scan_id);
    CREATE INDEX IF NOT EXISTS idx_ideas_project_id ON ideas(project_id);
    CREATE INDEX IF NOT EXISTS idx_ideas_context_id ON ideas(context_id);
    CREATE INDEX IF NOT EXISTS idx_ideas_status ON ideas(project_id, status);
    CREATE INDEX IF NOT EXISTS idx_ideas_category ON ideas(category);
    CREATE INDEX IF NOT EXISTS idx_ideas_project_status_category ON ideas(project_id, status, category);
    CREATE INDEX IF NOT EXISTS idx_implementation_log_project_id ON implementation_log(project_id);
    CREATE INDEX IF NOT EXISTS idx_implementation_log_created_at ON implementation_log(project_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_tech_debt_project_id ON tech_debt(project_id);
    CREATE INDEX IF NOT EXISTS idx_tech_debt_status ON tech_debt(project_id, status);
    CREATE INDEX IF NOT EXISTS idx_tech_debt_severity ON tech_debt(project_id, severity);
    CREATE INDEX IF NOT EXISTS idx_tech_debt_category ON tech_debt(category);
    CREATE INDEX IF NOT EXISTS idx_tech_debt_risk_score ON tech_debt(project_id, risk_score);
    CREATE INDEX IF NOT EXISTS idx_scan_queue_project_id ON scan_queue(project_id);
    CREATE INDEX IF NOT EXISTS idx_scan_queue_status ON scan_queue(project_id, status);
    CREATE INDEX IF NOT EXISTS idx_scan_queue_priority ON scan_queue(status, priority DESC);
    CREATE INDEX IF NOT EXISTS idx_scan_queue_created_at ON scan_queue(project_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_scan_notifications_queue_item ON scan_notifications(queue_item_id);
    CREATE INDEX IF NOT EXISTS idx_scan_notifications_project ON scan_notifications(project_id, read);
    CREATE INDEX IF NOT EXISTS idx_file_watch_config_project_id ON file_watch_config(project_id);
  `);
}
