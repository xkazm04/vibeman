/**
 * Project Architecture Metadata Repository
 * Handles database operations for project tier, framework, and visualization metadata
 */

import { getDatabase } from '../connection';
import { getCurrentTimestamp, selectOne, selectAll } from './repository.utils';
import type {
  DbProjectArchitectureMetadata,
  CreateProjectArchitectureMetadataInput,
  UpdateProjectArchitectureMetadataInput,
} from '../models/cross-project-architecture.types';

export const projectArchitectureMetadataRepository = {
  getByProject: (projectId: string): DbProjectArchitectureMetadata | null => {
    const db = getDatabase();
    return selectOne<DbProjectArchitectureMetadata>(
      db,
      'SELECT * FROM project_architecture_metadata WHERE project_id = ?',
      projectId
    );
  },

  getByWorkspace: (workspaceId: string | null): DbProjectArchitectureMetadata[] => {
    const db = getDatabase();
    if (workspaceId) {
      return selectAll<DbProjectArchitectureMetadata>(
        db,
        'SELECT * FROM project_architecture_metadata WHERE workspace_id = ?',
        workspaceId
      );
    }
    return selectAll<DbProjectArchitectureMetadata>(
      db,
      'SELECT * FROM project_architecture_metadata WHERE workspace_id IS NULL'
    );
  },

  upsert: (input: CreateProjectArchitectureMetadataInput): DbProjectArchitectureMetadata => {
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

  update: (
    projectId: string,
    updates: UpdateProjectArchitectureMetadataInput
  ): DbProjectArchitectureMetadata | null => {
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

  delete: (projectId: string): boolean => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM project_architecture_metadata WHERE project_id = ?');
    const result = stmt.run(projectId);
    return result.changes > 0;
  },
};
