import { getDatabase } from '../connection';
import { DbGoalCheckin } from '../models/types';
import { getCurrentTimestamp } from './repository.utils';

/**
 * Goal Check-in Repository
 * Handles CRUD for weekly goal confidence check-ins.
 */
export const goalCheckinRepository = {
  /**
   * Get all check-ins for a goal, ordered by week descending
   */
  getCheckinsByGoal: (goalId: string, limit = 12): DbGoalCheckin[] => {
    const db = getDatabase();
    return db.prepare(`
      SELECT * FROM goal_checkins
      WHERE goal_id = ?
      ORDER BY week_of DESC
      LIMIT ?
    `).all(goalId, limit) as DbGoalCheckin[];
  },

  /**
   * Get all check-ins for a project in a specific week
   */
  getCheckinsByProjectWeek: (projectId: string, weekOf: string): DbGoalCheckin[] => {
    const db = getDatabase();
    return db.prepare(`
      SELECT * FROM goal_checkins
      WHERE project_id = ? AND week_of = ?
      ORDER BY created_at DESC
    `).all(projectId, weekOf) as DbGoalCheckin[];
  },

  /**
   * Get the latest check-in for each goal in a project
   */
  getLatestCheckinsByProject: (projectId: string): DbGoalCheckin[] => {
    const db = getDatabase();
    return db.prepare(`
      SELECT gc.* FROM goal_checkins gc
      INNER JOIN (
        SELECT goal_id, MAX(week_of) as max_week
        FROM goal_checkins
        WHERE project_id = ?
        GROUP BY goal_id
      ) latest ON gc.goal_id = latest.goal_id AND gc.week_of = latest.max_week
      WHERE gc.project_id = ?
    `).all(projectId, projectId) as DbGoalCheckin[];
  },

  /**
   * Upsert a check-in (one per goal per week via UNIQUE constraint)
   */
  upsertCheckin: (checkin: {
    id: string;
    goal_id: string;
    project_id: string;
    confidence: number;
    note?: string | null;
    week_of: string;
  }): DbGoalCheckin => {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    db.prepare(`
      INSERT INTO goal_checkins (id, goal_id, project_id, confidence, note, week_of, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(goal_id, week_of) DO UPDATE SET
        confidence = excluded.confidence,
        note = excluded.note,
        created_at = excluded.created_at
    `).run(
      checkin.id,
      checkin.goal_id,
      checkin.project_id,
      checkin.confidence,
      checkin.note || null,
      checkin.week_of,
      now
    );
    return db.prepare(`
      SELECT * FROM goal_checkins WHERE goal_id = ? AND week_of = ?
    `).get(checkin.goal_id, checkin.week_of) as DbGoalCheckin;
  },

  /**
   * Get check-ins with recent confidence drops (for standup risk signals)
   */
  getRecentConfidenceDrops: (projectId: string): Array<{ goal_id: string; previous: number; current: number; drop: number }> => {
    const db = getDatabase();
    return db.prepare(`
      SELECT
        curr.goal_id,
        prev.confidence as previous,
        curr.confidence as current,
        (prev.confidence - curr.confidence) as drop
      FROM goal_checkins curr
      INNER JOIN goal_checkins prev
        ON curr.goal_id = prev.goal_id
        AND prev.week_of = (
          SELECT MAX(week_of) FROM goal_checkins
          WHERE goal_id = curr.goal_id AND week_of < curr.week_of
        )
      WHERE curr.project_id = ?
        AND curr.week_of = (
          SELECT MAX(week_of) FROM goal_checkins WHERE project_id = ?
        )
        AND curr.confidence < prev.confidence
      ORDER BY drop DESC
    `).all(projectId, projectId) as Array<{ goal_id: string; previous: number; current: number; drop: number }>;
  },
};
