/**
 * Cross-Project Relationship Repository
 * Handles database operations for workspace-level cross-project relationships
 */

import { getDatabase } from '../connection';
import { generateId, getCurrentTimestamp, selectOne, selectAll } from './repository.utils';
import type {
  DbCrossProjectRelationship,
  CreateCrossProjectRelationshipInput,
  IntegrationType,
} from '../models/cross-project-architecture.types';

export const crossProjectRelationshipRepository = {
  getByWorkspace: (workspaceId: string | null): DbCrossProjectRelationship[] => {
    const db = getDatabase();
    if (workspaceId) {
      return selectAll<DbCrossProjectRelationship>(
        db,
        'SELECT * FROM cross_project_relationships WHERE workspace_id = ? ORDER BY created_at DESC',
        workspaceId
      );
    }
    return selectAll<DbCrossProjectRelationship>(
      db,
      'SELECT * FROM cross_project_relationships WHERE workspace_id IS NULL ORDER BY created_at DESC'
    );
  },

  getByProject: (projectId: string): DbCrossProjectRelationship[] => {
    const db = getDatabase();
    return selectAll<DbCrossProjectRelationship>(
      db,
      'SELECT * FROM cross_project_relationships WHERE source_project_id = ? OR target_project_id = ? ORDER BY created_at DESC',
      projectId,
      projectId
    );
  },

  getBetweenProjects: (projectA: string, projectB: string): DbCrossProjectRelationship[] => {
    const db = getDatabase();
    return selectAll<DbCrossProjectRelationship>(
      db,
      `SELECT * FROM cross_project_relationships
       WHERE (source_project_id = ? AND target_project_id = ?)
          OR (source_project_id = ? AND target_project_id = ?)
       ORDER BY created_at DESC`,
      projectA,
      projectB,
      projectB,
      projectA
    );
  },

  getById: (id: string): DbCrossProjectRelationship | null => {
    const db = getDatabase();
    return selectOne<DbCrossProjectRelationship>(
      db,
      'SELECT * FROM cross_project_relationships WHERE id = ?',
      id
    );
  },

  create: (input: CreateCrossProjectRelationshipInput): DbCrossProjectRelationship => {
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

  delete: (id: string): boolean => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM cross_project_relationships WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  deleteByWorkspace: (workspaceId: string | null): number => {
    const db = getDatabase();
    if (workspaceId) {
      const stmt = db.prepare('DELETE FROM cross_project_relationships WHERE workspace_id = ?');
      const result = stmt.run(workspaceId);
      return result.changes;
    }
    const stmt = db.prepare('DELETE FROM cross_project_relationships WHERE workspace_id IS NULL');
    const result = stmt.run();
    return result.changes;
  },
};
