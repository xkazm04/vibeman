/**
 * Persona Memory Repository
 * Manages memories/notes stored by persona agents during execution
 */

import { getConnection } from '../drivers';
import type { DbPersonaMemory, CreatePersonaMemoryInput } from '../models/persona.types';

function generateId(): string {
  return 'pmem_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export const personaMemoryRepository = {
  getAll(filters?: {
    persona_id?: string;
    category?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): { memories: DbPersonaMemory[]; total: number } {
    const db = getConnection();
    const where: string[] = [];
    const params: Array<string | number | boolean | null> = [];

    if (filters?.persona_id) {
      where.push('persona_id = ?');
      params.push(filters.persona_id);
    }
    if (filters?.category) {
      where.push('category = ?');
      params.push(filters.category);
    }
    if (filters?.search) {
      where.push('(title LIKE ? OR content LIKE ? OR tags LIKE ?)');
      const term = `%${filters.search}%`;
      params.push(term, term, term);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const countResult = db.prepare(
      `SELECT COUNT(*) as count FROM persona_memories ${whereClause}`
    ).get(...params) as unknown as { count: number } | undefined;
    const total = countResult?.count || 0;

    const limit = filters?.limit || 100;
    const offset = filters?.offset || 0;

    const memories = db.prepare(
      `SELECT * FROM persona_memories ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).all(...params, limit, offset) as unknown as DbPersonaMemory[];

    return { memories, total };
  },

  getById(id: string): DbPersonaMemory | null {
    const db = getConnection();
    return (db.prepare(
      'SELECT * FROM persona_memories WHERE id = ?'
    ).get(id) as unknown as DbPersonaMemory) || null;
  },

  getByPersona(personaId: string, limit = 50): DbPersonaMemory[] {
    const db = getConnection();
    return db.prepare(
      'SELECT * FROM persona_memories WHERE persona_id = ? ORDER BY importance DESC, created_at DESC LIMIT ?'
    ).all(personaId, limit) as unknown as DbPersonaMemory[];
  },

  getByExecution(executionId: string): DbPersonaMemory[] {
    const db = getConnection();
    return db.prepare(
      'SELECT * FROM persona_memories WHERE source_execution_id = ? ORDER BY created_at'
    ).all(executionId) as unknown as DbPersonaMemory[];
  },

  create(input: CreatePersonaMemoryInput): DbPersonaMemory {
    const db = getConnection();
    const id = input.id || generateId();
    const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    const tagsJson = input.tags ? JSON.stringify(input.tags) : null;

    db.prepare(`
      INSERT INTO persona_memories (id, persona_id, title, content, category, source_execution_id, importance, tags, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.persona_id,
      input.title,
      input.content,
      input.category || 'fact',
      input.source_execution_id || null,
      input.importance ?? 3,
      tagsJson,
      now,
      now
    );

    return db.prepare('SELECT * FROM persona_memories WHERE id = ?').get(id) as unknown as DbPersonaMemory;
  },

  delete(id: string): boolean {
    const db = getConnection();
    const result = db.prepare('DELETE FROM persona_memories WHERE id = ?').run(id);
    return (result as any).changes > 0;
  },
};
