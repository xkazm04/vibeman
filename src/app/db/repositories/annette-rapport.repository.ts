/**
 * Annette Rapport Repository
 * Manages the developer relationship model for personality adaptation
 */

import { getConnection } from '../drivers';
import { v4 as uuidv4 } from 'uuid';
import type { DbAnnetteRapport } from '../models/annette.types';

export const annetteRapportRepository = {
  /**
   * Get or create the rapport model for a project
   */
  getOrCreate(projectId: string): DbAnnetteRapport {
    const db = getConnection();
    const existing = db.prepare(
      'SELECT * FROM annette_rapport WHERE project_id = ?'
    ).get(projectId) as unknown as DbAnnetteRapport | undefined;

    if (existing) return existing;

    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO annette_rapport (
        id, project_id, tone_formal_casual, depth_expert_teaching,
        initiative_reactive_proactive, humor_level, detected_mood,
        frustration_score, total_turns_analyzed, expertise_areas,
        work_rhythm, emotional_history, communication_signals,
        created_at, updated_at
      ) VALUES (?, ?, 0.5, 0.5, 0.5, 0.2, 'neutral', 0.0, 0, '[]', '{}', '[]', '{}', ?, ?)
    `).run(id, projectId, now, now);

    return this.getOrCreate(projectId);
  },

  /**
   * Update rapport axes and mood from conversation analysis
   */
  update(projectId: string, updates: Partial<{
    tone_formal_casual: number;
    depth_expert_teaching: number;
    initiative_reactive_proactive: number;
    humor_level: number;
    detected_mood: DbAnnetteRapport['detected_mood'];
    frustration_score: number;
    total_turns_analyzed: number;
    expertise_areas: string;
    work_rhythm: string;
    emotional_history: string;
    communication_signals: string;
  }>): void {
    const db = getConnection();
    const fields: string[] = [];
    const values: (string | number | boolean | null)[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value as string | number);
      }
    }

    if (fields.length === 0) return;

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(projectId);

    db.prepare(
      `UPDATE annette_rapport SET ${fields.join(', ')} WHERE project_id = ?`
    ).run(...values);
  },

  /**
   * Increment the turn counter
   */
  incrementTurns(projectId: string): void {
    const db = getConnection();
    db.prepare(
      `UPDATE annette_rapport SET total_turns_analyzed = total_turns_analyzed + 1, updated_at = ? WHERE project_id = ?`
    ).run(new Date().toISOString(), projectId);
  },
};
