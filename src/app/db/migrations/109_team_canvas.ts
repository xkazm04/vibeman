/**
 * Migration 109: Team Canvas
 *
 * Creates tables for persona teams, team members, and connections
 * enabling visual multi-agent pipeline design
 */

import type { MigrationLogger } from './migration.utils';

export function migrate109TeamCanvas(
  db: { prepare: (sql: string) => { run: (...args: unknown[]) => unknown } },
  logger: MigrationLogger
) {
  try {
    db.prepare(`
      CREATE TABLE IF NOT EXISTS persona_teams (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        name TEXT NOT NULL,
        description TEXT,
        canvas_data TEXT,
        team_config TEXT,
        icon TEXT,
        color TEXT DEFAULT '#6366f1',
        enabled INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `).run();
    logger.info('[Migration 109] Created persona_teams table');
  } catch (e: any) {
    if (!e.message?.includes('already exists')) throw e;
    logger.info('[Migration 109] persona_teams table already exists');
  }

  try {
    db.prepare(`
      CREATE TABLE IF NOT EXISTS persona_team_members (
        id TEXT PRIMARY KEY,
        team_id TEXT NOT NULL,
        persona_id TEXT NOT NULL,
        role TEXT DEFAULT 'worker',
        position_x REAL DEFAULT 0,
        position_y REAL DEFAULT 0,
        config TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `).run();
    logger.info('[Migration 109] Created persona_team_members table');
  } catch (e: any) {
    if (!e.message?.includes('already exists')) throw e;
    logger.info('[Migration 109] persona_team_members table already exists');
  }

  try {
    db.prepare(`
      CREATE TABLE IF NOT EXISTS persona_team_connections (
        id TEXT PRIMARY KEY,
        team_id TEXT NOT NULL,
        source_member_id TEXT NOT NULL,
        target_member_id TEXT NOT NULL,
        connection_type TEXT DEFAULT 'sequential',
        condition TEXT,
        label TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `).run();
    logger.info('[Migration 109] Created persona_team_connections table');
  } catch (e: any) {
    if (!e.message?.includes('already exists')) throw e;
    logger.info('[Migration 109] persona_team_connections table already exists');
  }

  // Indexes
  try {
    db.prepare('CREATE INDEX IF NOT EXISTS idx_team_members_team ON persona_team_members(team_id)').run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_team_connections_team ON persona_team_connections(team_id)').run();
    logger.info('[Migration 109] Created team canvas indexes');
  } catch (e: any) {
    logger.info('[Migration 109] Indexes already exist: ' + e.message);
  }
}
