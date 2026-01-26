/**
 * Migration 060: Cross-Project Architecture
 * Creates tables for workspace-level cross-project relationships and architecture analysis
 */

import Database from 'better-sqlite3';

function tableExists(db: Database.Database, tableName: string): boolean {
  const result = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name=?
  `).get(tableName) as { name: string } | undefined;
  return !!result;
}

export function migrate060CrossProjectArchitecture(db: Database.Database): void {
  // Table 1: Cross-project relationships (connections between projects)
  if (!tableExists(db, 'cross_project_relationships')) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS cross_project_relationships (
        id TEXT PRIMARY KEY,
        workspace_id TEXT,
        source_project_id TEXT NOT NULL,
        source_context_id TEXT,
        source_context_group_id TEXT,
        target_project_id TEXT NOT NULL,
        target_context_id TEXT,
        target_context_group_id TEXT,
        integration_type TEXT NOT NULL CHECK (integration_type IN (
          'rest', 'graphql', 'grpc', 'websocket', 'event', 'database', 'storage'
        )),
        label TEXT,
        protocol TEXT,
        data_flow TEXT,
        confidence REAL NOT NULL DEFAULT 0.5,
        detected_by TEXT CHECK (detected_by IN ('manual', 'ai_analysis', 'import_scan')),
        metadata TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_cross_rel_workspace
        ON cross_project_relationships(workspace_id);
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_cross_rel_source
        ON cross_project_relationships(source_project_id);
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_cross_rel_target
        ON cross_project_relationships(target_project_id);
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_cross_rel_type
        ON cross_project_relationships(integration_type);
    `);

    console.log('[Migration 060] Created cross_project_relationships table');
  }

  // Table 2: Architecture analysis sessions (tracks AI analysis runs)
  if (!tableExists(db, 'architecture_analysis_sessions')) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS architecture_analysis_sessions (
        id TEXT PRIMARY KEY,
        workspace_id TEXT,
        project_id TEXT,
        scope TEXT NOT NULL CHECK (scope IN ('project', 'workspace')),
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
        trigger_type TEXT NOT NULL CHECK (trigger_type IN ('manual', 'onboarding', 'scheduled')),
        projects_analyzed INTEGER DEFAULT 0,
        relationships_discovered INTEGER DEFAULT 0,
        ai_analysis TEXT,
        ai_recommendations TEXT,
        detected_patterns TEXT,
        execution_id TEXT,
        error_message TEXT,
        started_at TEXT,
        completed_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_arch_analysis_workspace
        ON architecture_analysis_sessions(workspace_id);
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_arch_analysis_project
        ON architecture_analysis_sessions(project_id);
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_arch_analysis_status
        ON architecture_analysis_sessions(status);
    `);

    console.log('[Migration 060] Created architecture_analysis_sessions table');
  }

  // Table 3: Project metadata for architecture (tier, framework info)
  if (!tableExists(db, 'project_architecture_metadata')) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS project_architecture_metadata (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL UNIQUE,
        workspace_id TEXT,
        tier TEXT NOT NULL DEFAULT 'backend' CHECK (tier IN ('frontend', 'backend', 'external', 'shared')),
        framework TEXT,
        framework_category TEXT CHECK (framework_category IN (
          'react', 'nextjs', 'vue', 'node', 'python', 'go', 'java', 'database', 'cloud', 'other'
        )),
        description TEXT,
        icon TEXT,
        color TEXT,
        position_x REAL,
        position_y REAL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_project_arch_meta_workspace
        ON project_architecture_metadata(workspace_id);
    `);

    console.log('[Migration 060] Created project_architecture_metadata table');
  }
}
