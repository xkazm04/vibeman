/**
 * Saved View Repository
 * CRUD operations for cross-entity queryable views
 */

import { getDatabase } from '../connection';
import { createGenericRepository } from './generic.repository';
import { generateId, getCurrentTimestamp, selectAll, selectOne } from './repository.utils';
import type { DbSavedView } from '../models/types';

const base = createGenericRepository<DbSavedView>({
  tableName: 'saved_views',
  defaultOrder: 'pinned DESC, updated_at DESC',
});

export const savedViewRepository = {
  ...base,

  create(
    projectId: string,
    data: {
      name: string;
      description?: string;
      entity_types: string[];
      filters?: Record<string, unknown>;
      visible_columns?: string[];
      sort_field?: string;
      sort_direction?: 'asc' | 'desc';
      group_by?: string;
      icon?: string;
      color?: string;
      pinned?: boolean;
    },
  ): DbSavedView {
    const db = getDatabase();
    const id = generateId('sv');
    const now = getCurrentTimestamp();

    db.prepare(`
      INSERT INTO saved_views (id, project_id, name, description, entity_types, filters, visible_columns, sort_field, sort_direction, group_by, icon, color, pinned, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      projectId,
      data.name,
      data.description ?? null,
      JSON.stringify(data.entity_types),
      JSON.stringify(data.filters ?? {}),
      JSON.stringify(data.visible_columns ?? []),
      data.sort_field ?? null,
      data.sort_direction ?? 'desc',
      data.group_by ?? null,
      data.icon ?? null,
      data.color ?? null,
      data.pinned ? 1 : 0,
      now,
      now,
    );

    return selectOne<DbSavedView>(db, 'SELECT * FROM saved_views WHERE id = ?', id)!;
  },

  getByProject(projectId: string): DbSavedView[] {
    const db = getDatabase();
    return selectAll<DbSavedView>(
      db,
      'SELECT * FROM saved_views WHERE project_id = ? ORDER BY pinned DESC, updated_at DESC',
      projectId,
    );
  },

  togglePin(id: string): DbSavedView | null {
    const db = getDatabase();
    const view = selectOne<DbSavedView>(db, 'SELECT * FROM saved_views WHERE id = ?', id);
    if (!view) return null;

    const newPinned = view.pinned ? 0 : 1;
    db.prepare('UPDATE saved_views SET pinned = ?, updated_at = ? WHERE id = ?').run(
      newPinned,
      getCurrentTimestamp(),
      id,
    );

    return selectOne<DbSavedView>(db, 'SELECT * FROM saved_views WHERE id = ?', id);
  },

  duplicate(id: string): DbSavedView | null {
    const db = getDatabase();
    const view = selectOne<DbSavedView>(db, 'SELECT * FROM saved_views WHERE id = ?', id);
    if (!view) return null;

    const newId = generateId('sv');
    const now = getCurrentTimestamp();

    db.prepare(`
      INSERT INTO saved_views (id, project_id, name, description, entity_types, filters, visible_columns, sort_field, sort_direction, group_by, icon, color, pinned, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `).run(
      newId,
      view.project_id,
      `${view.name} (copy)`,
      view.description,
      view.entity_types,
      view.filters,
      view.visible_columns,
      view.sort_field,
      view.sort_direction,
      view.group_by,
      view.icon,
      view.color,
      now,
      now,
    );

    return selectOne<DbSavedView>(db, 'SELECT * FROM saved_views WHERE id = ?', newId);
  },
};
