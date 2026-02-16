/**
 * Persona Prompt Version Repository
 * Tracks prompt changes over time for observability
 */

import { getConnection } from '../drivers';

function generateId(): string {
  return 'ppv_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export const personaPromptVersionRepository = {
  createVersion(data: {
    persona_id: string;
    structured_prompt?: string | null;
    system_prompt?: string | null;
    change_summary?: string | null;
  }) {
    const db = getConnection();
    const id = generateId();

    // Get next version number
    const last = db.prepare(
      'SELECT MAX(version_number) as max_ver FROM persona_prompt_versions WHERE persona_id = ?'
    ).get(data.persona_id) as Record<string, unknown> | null;
    const versionNumber = ((last?.max_ver as number) ?? 0) + 1;

    db.prepare(`
      INSERT INTO persona_prompt_versions (id, persona_id, version_number, structured_prompt, system_prompt, change_summary)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.persona_id,
      versionNumber,
      data.structured_prompt ?? null,
      data.system_prompt ?? null,
      data.change_summary ?? null
    );
    return { id, version_number: versionNumber };
  },

  getVersions(personaId: string, limit: number = 50) {
    const db = getConnection();
    return db.prepare(
      'SELECT * FROM persona_prompt_versions WHERE persona_id = ? ORDER BY version_number DESC LIMIT ?'
    ).all(personaId, limit) as Record<string, unknown>[];
  },

  getVersion(id: string) {
    const db = getConnection();
    return db.prepare('SELECT * FROM persona_prompt_versions WHERE id = ?').get(id) as Record<string, unknown> | null;
  },

  getLatestVersion(personaId: string) {
    const db = getConnection();
    return db.prepare(
      'SELECT * FROM persona_prompt_versions WHERE persona_id = ? ORDER BY version_number DESC LIMIT 1'
    ).get(personaId) as Record<string, unknown> | null;
  },
};
