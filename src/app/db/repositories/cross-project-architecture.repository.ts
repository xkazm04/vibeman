/**
 * Cross-Project Architecture Repository
 * Handles database operations for workspace-level architecture visualization
 */

import { getDatabase } from '../connection';
import { generateId, getCurrentTimestamp } from './repository.utils';
import type {
  DbCrossProjectRelationship,
  DbArchitectureAnalysisSession,
  DbProjectArchitectureMetadata,
  CreateCrossProjectRelationshipInput,
  CreateArchitectureAnalysisInput,
  UpdateArchitectureAnalysisInput,
  CreateProjectArchitectureMetadataInput,
  UpdateProjectArchitectureMetadataInput,
  IntegrationType,
  AnalysisStatus,
} from '../models/cross-project-architecture.types';

let tablesEnsured = false;

function ensureTables(): void {
  if (tablesEnsured) return;
  const db = getDatabase();

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
      integration_type TEXT NOT NULL,
      label TEXT,
      protocol TEXT,
      data_flow TEXT,
      confidence REAL NOT NULL DEFAULT 0.5,
      detected_by TEXT,
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS architecture_analysis_sessions (
      id TEXT PRIMARY KEY,
      workspace_id TEXT,
      project_id TEXT,
      scope TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      trigger_type TEXT NOT NULL,
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

    CREATE TABLE IF NOT EXISTS project_architecture_metadata (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL UNIQUE,
      workspace_id TEXT,
      tier TEXT NOT NULL DEFAULT 'backend',
      framework TEXT,
      framework_category TEXT,
      description TEXT,
      icon TEXT,
      color TEXT,
      position_x REAL,
      position_y REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_cross_rel_workspace ON cross_project_relationships(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_cross_rel_source ON cross_project_relationships(source_project_id);
    CREATE INDEX IF NOT EXISTS idx_cross_rel_target ON cross_project_relationships(target_project_id);
    CREATE INDEX IF NOT EXISTS idx_arch_analysis_workspace ON architecture_analysis_sessions(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_arch_analysis_status ON architecture_analysis_sessions(status);
    CREATE INDEX IF NOT EXISTS idx_project_arch_meta_workspace ON project_architecture_metadata(workspace_id);
  `);

  tablesEnsured = true;
}

// ============================================================================
// Cross-Project Relationships
// ============================================================================

export const crossProjectRelationshipRepository = {
  /**
   * Get all relationships for a workspace
   */
  getByWorkspace: (workspaceId: string | null): DbCrossProjectRelationship[] => {
    ensureTables();
    const db = getDatabase();

    if (workspaceId) {
      const stmt = db.prepare(`
        SELECT * FROM cross_project_relationships
        WHERE workspace_id = ?
        ORDER BY created_at DESC
      `);
      return stmt.all(workspaceId) as DbCrossProjectRelationship[];
    } else {
      const stmt = db.prepare(`
        SELECT * FROM cross_project_relationships
        WHERE workspace_id IS NULL
        ORDER BY created_at DESC
      `);
      return stmt.all() as DbCrossProjectRelationship[];
    }
  },

  /**
   * Get relationships involving a specific project (as source or target)
   */
  getByProject: (projectId: string): DbCrossProjectRelationship[] => {
    ensureTables();
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM cross_project_relationships
      WHERE source_project_id = ? OR target_project_id = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(projectId, projectId) as DbCrossProjectRelationship[];
  },

  /**
   * Get relationships between two specific projects
   */
  getBetweenProjects: (projectA: string, projectB: string): DbCrossProjectRelationship[] => {
    ensureTables();
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM cross_project_relationships
      WHERE (source_project_id = ? AND target_project_id = ?)
         OR (source_project_id = ? AND target_project_id = ?)
      ORDER BY created_at DESC
    `);
    return stmt.all(projectA, projectB, projectB, projectA) as DbCrossProjectRelationship[];
  },

  /**
   * Get relationship by ID
   */
  getById: (id: string): DbCrossProjectRelationship | null => {
    ensureTables();
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM cross_project_relationships WHERE id = ?');
    const result = stmt.get(id) as DbCrossProjectRelationship | undefined;
    return result || null;
  },

  /**
   * Create a new relationship
   */
  create: (input: CreateCrossProjectRelationshipInput): DbCrossProjectRelationship => {
    ensureTables();
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      INSERT INTO cross_project_relationships (
        id, workspace_id, source_project_id, source_context_id, source_context_group_id,
        target_project_id, target_context_id, target_context_group_id,
        integration_type, label, protocol, data_flow, confidence, detected_by, metadata,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      input.id,
      input.workspace_id || null,
      input.source_project_id,
      input.source_context_id || null,
      input.source_context_group_id || null,
      input.target_project_id,
      input.target_context_id || null,
      input.target_context_group_id || null,
      input.integration_type,
      input.label || null,
      input.protocol || null,
      input.data_flow || null,
      input.confidence ?? 0.5,
      input.detected_by || null,
      input.metadata ? JSON.stringify(input.metadata) : null,
      now,
      now
    );

    return crossProjectRelationshipRepository.getById(input.id)!;
  },

  /**
   * Bulk upsert relationships (used after AI analysis)
   */
  upsertMany: (
    workspaceId: string | null,
    relationships: Array<{
      source_project_id: string;
      target_project_id: string;
      integration_type: IntegrationType;
      label?: string;
      protocol?: string;
      data_flow?: string;
      confidence: number;
    }>
  ): number => {
    ensureTables();
    const db = getDatabase();
    const now = getCurrentTimestamp();
    let created = 0;

    const transaction = db.transaction(() => {
      const checkStmt = db.prepare(`
        SELECT id FROM cross_project_relationships
        WHERE workspace_id IS ? AND source_project_id = ? AND target_project_id = ? AND integration_type = ?
      `);

      const insertStmt = db.prepare(`
        INSERT INTO cross_project_relationships (
          id, workspace_id, source_project_id, target_project_id,
          integration_type, label, protocol, data_flow, confidence, detected_by,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ai_analysis', ?, ?)
      `);

      const updateStmt = db.prepare(`
        UPDATE cross_project_relationships
        SET label = ?, protocol = ?, data_flow = ?, confidence = ?, updated_at = ?
        WHERE id = ?
      `);

      for (const rel of relationships) {
        const existing = checkStmt.get(
          workspaceId,
          rel.source_project_id,
          rel.target_project_id,
          rel.integration_type
        ) as { id: string } | undefined;

        if (existing) {
          updateStmt.run(
            rel.label || null,
            rel.protocol || null,
            rel.data_flow || null,
            rel.confidence,
            now,
            existing.id
          );
        } else {
          const id = generateId('cpr');
          insertStmt.run(
            id,
            workspaceId,
            rel.source_project_id,
            rel.target_project_id,
            rel.integration_type,
            rel.label || null,
            rel.protocol || null,
            rel.data_flow || null,
            rel.confidence,
            now,
            now
          );
          created++;
        }
      }
    });

    transaction();
    return created;
  },

  /**
   * Delete a relationship
   */
  delete: (id: string): boolean => {
    ensureTables();
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM cross_project_relationships WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  /**
   * Delete all relationships for a workspace
   */
  deleteByWorkspace: (workspaceId: string | null): number => {
    ensureTables();
    const db = getDatabase();

    if (workspaceId) {
      const stmt = db.prepare('DELETE FROM cross_project_relationships WHERE workspace_id = ?');
      const result = stmt.run(workspaceId);
      return result.changes;
    } else {
      const stmt = db.prepare('DELETE FROM cross_project_relationships WHERE workspace_id IS NULL');
      const result = stmt.run();
      return result.changes;
    }
  },
};

// ============================================================================
// Architecture Analysis Sessions
// ============================================================================

export const architectureAnalysisRepository = {
  /**
   * Get analysis session by ID
   */
  getById: (id: string): DbArchitectureAnalysisSession | null => {
    ensureTables();
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM architecture_analysis_sessions WHERE id = ?');
    const result = stmt.get(id) as DbArchitectureAnalysisSession | undefined;
    return result || null;
  },

  /**
   * Get latest completed analysis for a scope
   */
  getLatestCompleted: (
    scope: 'project' | 'workspace',
    scopeId: string | null
  ): DbArchitectureAnalysisSession | null => {
    ensureTables();
    const db = getDatabase();

    let stmt;
    if (scope === 'workspace') {
      stmt = db.prepare(`
        SELECT * FROM architecture_analysis_sessions
        WHERE scope = 'workspace' AND workspace_id IS ? AND status = 'completed'
        ORDER BY completed_at DESC
        LIMIT 1
      `);
    } else {
      stmt = db.prepare(`
        SELECT * FROM architecture_analysis_sessions
        WHERE scope = 'project' AND project_id = ? AND status = 'completed'
        ORDER BY completed_at DESC
        LIMIT 1
      `);
    }

    const result = stmt.get(scopeId) as DbArchitectureAnalysisSession | undefined;
    return result || null;
  },

  /**
   * Get running analysis (if any)
   */
  getRunning: (
    scope: 'project' | 'workspace',
    scopeId: string | null
  ): DbArchitectureAnalysisSession | null => {
    ensureTables();
    const db = getDatabase();

    let stmt;
    if (scope === 'workspace') {
      stmt = db.prepare(`
        SELECT * FROM architecture_analysis_sessions
        WHERE scope = 'workspace' AND workspace_id IS ? AND status = 'running'
        LIMIT 1
      `);
    } else {
      stmt = db.prepare(`
        SELECT * FROM architecture_analysis_sessions
        WHERE scope = 'project' AND project_id = ? AND status = 'running'
        LIMIT 1
      `);
    }

    const result = stmt.get(scopeId) as DbArchitectureAnalysisSession | undefined;
    return result || null;
  },

  /**
   * Get analysis history
   */
  getHistory: (
    scope: 'project' | 'workspace',
    scopeId: string | null,
    limit: number = 10
  ): DbArchitectureAnalysisSession[] => {
    ensureTables();
    const db = getDatabase();

    let stmt;
    if (scope === 'workspace') {
      stmt = db.prepare(`
        SELECT * FROM architecture_analysis_sessions
        WHERE scope = 'workspace' AND workspace_id IS ?
        ORDER BY created_at DESC
        LIMIT ?
      `);
    } else {
      stmt = db.prepare(`
        SELECT * FROM architecture_analysis_sessions
        WHERE scope = 'project' AND project_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `);
    }

    return stmt.all(scopeId, limit) as DbArchitectureAnalysisSession[];
  },

  /**
   * Create a new analysis session
   */
  create: (input: CreateArchitectureAnalysisInput): DbArchitectureAnalysisSession => {
    ensureTables();
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      INSERT INTO architecture_analysis_sessions (
        id, workspace_id, project_id, scope, status, trigger_type, created_at
      ) VALUES (?, ?, ?, ?, 'pending', ?, ?)
    `);

    stmt.run(
      input.id,
      input.workspace_id || null,
      input.project_id || null,
      input.scope,
      input.trigger_type,
      now
    );

    return architectureAnalysisRepository.getById(input.id)!;
  },

  /**
   * Start analysis (mark as running)
   */
  startAnalysis: (id: string, executionId?: string): DbArchitectureAnalysisSession | null => {
    ensureTables();
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      UPDATE architecture_analysis_sessions
      SET status = 'running', execution_id = ?, started_at = ?
      WHERE id = ? AND status = 'pending'
    `);
    stmt.run(executionId || null, now, id);

    return architectureAnalysisRepository.getById(id);
  },

  /**
   * Complete analysis with results
   */
  completeAnalysis: (
    id: string,
    results: {
      projects_analyzed: number;
      relationships_discovered: number;
      ai_analysis?: string;
      ai_recommendations?: string;
      detected_patterns?: string;
    }
  ): DbArchitectureAnalysisSession | null => {
    ensureTables();
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      UPDATE architecture_analysis_sessions
      SET status = 'completed',
          projects_analyzed = ?,
          relationships_discovered = ?,
          ai_analysis = ?,
          ai_recommendations = ?,
          detected_patterns = ?,
          completed_at = ?
      WHERE id = ?
    `);

    stmt.run(
      results.projects_analyzed,
      results.relationships_discovered,
      results.ai_analysis || null,
      results.ai_recommendations || null,
      results.detected_patterns || null,
      now,
      id
    );

    return architectureAnalysisRepository.getById(id);
  },

  /**
   * Fail analysis with error
   */
  failAnalysis: (id: string, errorMessage: string): DbArchitectureAnalysisSession | null => {
    ensureTables();
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      UPDATE architecture_analysis_sessions
      SET status = 'failed', error_message = ?, completed_at = ?
      WHERE id = ?
    `);
    stmt.run(errorMessage, now, id);

    return architectureAnalysisRepository.getById(id);
  },

  /**
   * Delete analysis session
   */
  delete: (id: string): boolean => {
    ensureTables();
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM architecture_analysis_sessions WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },
};

// ============================================================================
// Project Architecture Metadata
// ============================================================================

export const projectArchitectureMetadataRepository = {
  /**
   * Get metadata for a project
   */
  getByProject: (projectId: string): DbProjectArchitectureMetadata | null => {
    ensureTables();
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM project_architecture_metadata WHERE project_id = ?');
    const result = stmt.get(projectId) as DbProjectArchitectureMetadata | undefined;
    return result || null;
  },

  /**
   * Get all metadata for a workspace
   */
  getByWorkspace: (workspaceId: string | null): DbProjectArchitectureMetadata[] => {
    ensureTables();
    const db = getDatabase();

    if (workspaceId) {
      const stmt = db.prepare(`
        SELECT * FROM project_architecture_metadata
        WHERE workspace_id = ?
      `);
      return stmt.all(workspaceId) as DbProjectArchitectureMetadata[];
    } else {
      const stmt = db.prepare(`
        SELECT * FROM project_architecture_metadata
        WHERE workspace_id IS NULL
      `);
      return stmt.all() as DbProjectArchitectureMetadata[];
    }
  },

  /**
   * Create or update metadata for a project
   */
  upsert: (input: CreateProjectArchitectureMetadataInput): DbProjectArchitectureMetadata => {
    ensureTables();
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const existing = projectArchitectureMetadataRepository.getByProject(input.project_id);

    if (existing) {
      const stmt = db.prepare(`
        UPDATE project_architecture_metadata
        SET workspace_id = ?, tier = ?, framework = ?, framework_category = ?,
            description = ?, icon = ?, color = ?, position_x = ?, position_y = ?,
            updated_at = ?
        WHERE project_id = ?
      `);

      stmt.run(
        input.workspace_id ?? existing.workspace_id,
        input.tier ?? existing.tier,
        input.framework ?? existing.framework,
        input.framework_category ?? existing.framework_category,
        input.description ?? existing.description,
        input.icon ?? existing.icon,
        input.color ?? existing.color,
        input.position_x ?? existing.position_x,
        input.position_y ?? existing.position_y,
        now,
        input.project_id
      );
    } else {
      const stmt = db.prepare(`
        INSERT INTO project_architecture_metadata (
          id, project_id, workspace_id, tier, framework, framework_category,
          description, icon, color, position_x, position_y, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        input.id,
        input.project_id,
        input.workspace_id || null,
        input.tier || 'backend',
        input.framework || null,
        input.framework_category || null,
        input.description || null,
        input.icon || null,
        input.color || null,
        input.position_x ?? null,
        input.position_y ?? null,
        now,
        now
      );
    }

    return projectArchitectureMetadataRepository.getByProject(input.project_id)!;
  },

  /**
   * Update metadata
   */
  update: (
    projectId: string,
    updates: UpdateProjectArchitectureMetadataInput
  ): DbProjectArchitectureMetadata | null => {
    ensureTables();
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const existing = projectArchitectureMetadataRepository.getByProject(projectId);
    if (!existing) return null;

    const updateFields: string[] = ['updated_at = ?'];
    const values: (string | number | null)[] = [now];

    if (updates.tier !== undefined) {
      updateFields.push('tier = ?');
      values.push(updates.tier);
    }
    if (updates.framework !== undefined) {
      updateFields.push('framework = ?');
      values.push(updates.framework);
    }
    if (updates.framework_category !== undefined) {
      updateFields.push('framework_category = ?');
      values.push(updates.framework_category);
    }
    if (updates.description !== undefined) {
      updateFields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.icon !== undefined) {
      updateFields.push('icon = ?');
      values.push(updates.icon);
    }
    if (updates.color !== undefined) {
      updateFields.push('color = ?');
      values.push(updates.color);
    }
    if (updates.position_x !== undefined) {
      updateFields.push('position_x = ?');
      values.push(updates.position_x);
    }
    if (updates.position_y !== undefined) {
      updateFields.push('position_y = ?');
      values.push(updates.position_y);
    }

    values.push(projectId);

    const stmt = db.prepare(`
      UPDATE project_architecture_metadata
      SET ${updateFields.join(', ')}
      WHERE project_id = ?
    `);
    stmt.run(...values);

    return projectArchitectureMetadataRepository.getByProject(projectId);
  },

  /**
   * Delete metadata
   */
  delete: (projectId: string): boolean => {
    ensureTables();
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM project_architecture_metadata WHERE project_id = ?');
    const result = stmt.run(projectId);
    return result.changes > 0;
  },
};
