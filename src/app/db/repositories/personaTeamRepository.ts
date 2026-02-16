/**
 * Persona Team Repository
 * Manages multi-agent teams, members, and connections
 */

import { getConnection } from '../drivers';

function generateId(prefix: string): string {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export const personaTeamRepository = {
  getAll() {
    const db = getConnection();
    return db.prepare('SELECT * FROM persona_teams ORDER BY updated_at DESC').all() as any[];
  },

  getById(id: string) {
    const db = getConnection();
    return db.prepare('SELECT * FROM persona_teams WHERE id = ?').get(id) as any | null;
  },

  create(input: {
    name: string;
    description?: string;
    project_id?: string;
    canvas_data?: string;
    team_config?: string;
    icon?: string;
    color?: string;
    enabled?: boolean;
  }) {
    const db = getConnection();
    const id = generateId('pteam');
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO persona_teams (id, project_id, name, description, canvas_data, team_config, icon, color, enabled, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.project_id || null,
      input.name,
      input.description || null,
      input.canvas_data || null,
      input.team_config || null,
      input.icon || null,
      input.color || '#6366f1',
      input.enabled ? 1 : 0,
      now,
      now
    );
    return { id, ...input, created_at: now, updated_at: now };
  },

  update(id: string, input: Record<string, any>) {
    const db = getConnection();
    const fields: string[] = [];
    const values: any[] = [];

    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined) {
        if (key === 'enabled') {
          fields.push(`${key} = ?`);
          values.push(value ? 1 : 0);
        } else {
          fields.push(`${key} = ?`);
          values.push(value);
        }
      }
    }

    if (fields.length === 0) return;
    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    db.prepare(`UPDATE persona_teams SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  },

  delete(id: string) {
    const db = getConnection();
    db.prepare('DELETE FROM persona_team_connections WHERE team_id = ?').run(id);
    db.prepare('DELETE FROM persona_team_members WHERE team_id = ?').run(id);
    db.prepare('DELETE FROM persona_teams WHERE id = ?').run(id);
  },
};

export const personaTeamMemberRepository = {
  getByTeam(teamId: string) {
    const db = getConnection();
    return db.prepare(`
      SELECT m.*, p.name as persona_name, p.icon as persona_icon, p.color as persona_color, p.enabled as persona_enabled
      FROM persona_team_members m
      LEFT JOIN personas p ON m.persona_id = p.id
      WHERE m.team_id = ?
      ORDER BY m.created_at ASC
    `).all(teamId) as any[];
  },

  add(input: {
    team_id: string;
    persona_id: string;
    role?: string;
    position_x?: number;
    position_y?: number;
    config?: string;
  }) {
    const db = getConnection();
    const id = generateId('ptm');
    db.prepare(`
      INSERT INTO persona_team_members (id, team_id, persona_id, role, position_x, position_y, config, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.team_id,
      input.persona_id,
      input.role || 'worker',
      input.position_x ?? 0,
      input.position_y ?? 0,
      input.config || null,
      new Date().toISOString()
    );
    return id;
  },

  update(id: string, input: Record<string, any>) {
    const db = getConnection();
    const fields: string[] = [];
    const values: any[] = [];
    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    if (fields.length === 0) return;
    values.push(id);
    db.prepare(`UPDATE persona_team_members SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  },

  remove(id: string) {
    const db = getConnection();
    db.prepare('DELETE FROM persona_team_connections WHERE source_member_id = ? OR target_member_id = ?').run(id, id);
    db.prepare('DELETE FROM persona_team_members WHERE id = ?').run(id);
  },
};

export const personaTeamConnectionRepository = {
  getByTeam(teamId: string) {
    const db = getConnection();
    return db.prepare(
      'SELECT * FROM persona_team_connections WHERE team_id = ? ORDER BY created_at ASC'
    ).all(teamId) as any[];
  },

  create(input: {
    team_id: string;
    source_member_id: string;
    target_member_id: string;
    connection_type?: string;
    condition?: string;
    label?: string;
  }) {
    const db = getConnection();
    const id = generateId('ptc');
    db.prepare(`
      INSERT INTO persona_team_connections (id, team_id, source_member_id, target_member_id, connection_type, condition, label, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.team_id,
      input.source_member_id,
      input.target_member_id,
      input.connection_type || 'sequential',
      input.condition || null,
      input.label || null,
      new Date().toISOString()
    );
    return id;
  },

  update(id: string, input: Record<string, any>) {
    const db = getConnection();
    const fields: string[] = [];
    const values: any[] = [];
    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    if (fields.length === 0) return;
    values.push(id);
    db.prepare(`UPDATE persona_team_connections SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  },

  remove(id: string) {
    const db = getConnection();
    db.prepare('DELETE FROM persona_team_connections WHERE id = ?').run(id);
  },
};
