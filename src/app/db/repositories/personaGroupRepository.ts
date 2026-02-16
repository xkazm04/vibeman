/**
 * Persona Group Repository
 * CRUD for persona groups used to organize agents
 */

import { getConnection } from '../drivers';
import type { DbPersonaGroup, CreatePersonaGroupInput, UpdatePersonaGroupInput } from '../models/persona.types';

function generateId(): string {
  return 'pgrp_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function getCurrentTimestamp(): string {
  return new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
}

export const personaGroupRepository = {
  getAll(): DbPersonaGroup[] {
    const db = getConnection();
    return db.prepare(
      'SELECT * FROM persona_groups ORDER BY sort_order, created_at'
    ).all() as unknown as DbPersonaGroup[];
  },

  getById(id: string): DbPersonaGroup | null {
    const db = getConnection();
    return (db.prepare(
      'SELECT * FROM persona_groups WHERE id = ?'
    ).get(id) as unknown as DbPersonaGroup) || null;
  },

  create(input: CreatePersonaGroupInput): DbPersonaGroup {
    const db = getConnection();
    const id = input.id || generateId();
    const now = getCurrentTimestamp();

    // Get next sort_order if not specified
    const maxSort = db.prepare(
      'SELECT MAX(sort_order) as max_sort FROM persona_groups'
    ).get() as unknown as { max_sort: number | null } | undefined;
    const sortOrder = input.sort_order ?? ((maxSort?.max_sort ?? -1) + 1);

    db.prepare(`
      INSERT INTO persona_groups (id, name, color, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.name,
      input.color || '#6B7280',
      sortOrder,
      now,
      now
    );

    return db.prepare('SELECT * FROM persona_groups WHERE id = ?').get(id) as unknown as DbPersonaGroup;
  },

  update(id: string, updates: UpdatePersonaGroupInput): DbPersonaGroup | null {
    const db = getConnection();
    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.color !== undefined) { fields.push('color = ?'); values.push(updates.color); }
    if (updates.sort_order !== undefined) { fields.push('sort_order = ?'); values.push(updates.sort_order); }
    if (updates.collapsed !== undefined) { fields.push('collapsed = ?'); values.push(updates.collapsed); }

    if (fields.length === 0) return personaGroupRepository.getById(id);

    fields.push("updated_at = datetime('now')");
    values.push(id);

    db.prepare(
      `UPDATE persona_groups SET ${fields.join(', ')} WHERE id = ?`
    ).run(...values);

    return personaGroupRepository.getById(id);
  },

  delete(id: string): boolean {
    const db = getConnection();
    // ON DELETE SET NULL handles persona.group_id
    const result = db.prepare('DELETE FROM persona_groups WHERE id = ?').run(id);
    return (result as any).changes > 0;
  },

  reorder(orderedIds: string[]): void {
    const db = getConnection();
    const stmt = db.prepare('UPDATE persona_groups SET sort_order = ? WHERE id = ?');
    for (let i = 0; i < orderedIds.length; i++) {
      stmt.run(i, orderedIds[i]);
    }
  },
};
