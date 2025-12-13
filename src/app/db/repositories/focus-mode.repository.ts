import { getDatabase } from '../connection';
import { DbFocusSession, DbFocusBreak, DbFocusStats } from '../models/focus-mode.types';

/**
 * Focus Session Repository
 * Handles all database operations for focus sessions and productivity tracking
 */
export const focusSessionRepository = {
  /**
   * Get all focus sessions for a project
   */
  getSessionsByProject: (projectId: string, limit: number = 50): DbFocusSession[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM focus_sessions
      WHERE project_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);
    return stmt.all(projectId, limit) as DbFocusSession[];
  },

  /**
   * Get a focus session by ID
   */
  getSessionById: (id: string): DbFocusSession | null => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM focus_sessions WHERE id = ?');
    const session = stmt.get(id) as DbFocusSession | undefined;
    return session || null;
  },

  /**
   * Get active focus session for a project
   */
  getActiveSession: (projectId: string): DbFocusSession | null => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM focus_sessions
      WHERE project_id = ? AND status IN ('active', 'paused')
      ORDER BY started_at DESC
      LIMIT 1
    `);
    const session = stmt.get(projectId) as DbFocusSession | undefined;
    return session || null;
  },

  /**
   * Get sessions for a specific goal
   */
  getSessionsByGoal: (goalId: string): DbFocusSession[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM focus_sessions
      WHERE goal_id = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(goalId) as DbFocusSession[];
  },

  /**
   * Get sessions for a specific context
   */
  getSessionsByContext: (contextId: string): DbFocusSession[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM focus_sessions
      WHERE context_id = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(contextId) as DbFocusSession[];
  },

  /**
   * Get sessions for a date range
   */
  getSessionsByDateRange: (
    projectId: string,
    startDate: string,
    endDate: string
  ): DbFocusSession[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM focus_sessions
      WHERE project_id = ?
        AND created_at >= ?
        AND created_at <= ?
      ORDER BY created_at DESC
    `);
    return stmt.all(projectId, startDate, endDate) as DbFocusSession[];
  },

  /**
   * Get completed sessions for today
   */
  getTodayCompletedSessions: (projectId: string): DbFocusSession[] => {
    const db = getDatabase();
    const today = new Date().toISOString().split('T')[0];
    const stmt = db.prepare(`
      SELECT * FROM focus_sessions
      WHERE project_id = ?
        AND status = 'completed'
        AND date(created_at) = ?
      ORDER BY completed_at DESC
    `);
    return stmt.all(projectId, today) as DbFocusSession[];
  },

  /**
   * Create a new focus session
   */
  createSession: (session: Omit<DbFocusSession, 'created_at' | 'updated_at'>): DbFocusSession => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO focus_sessions (
        id, project_id, goal_id, context_id,
        title, description, duration_minutes, session_type,
        status, started_at, paused_at, completed_at,
        total_elapsed_seconds, total_paused_seconds,
        pomodoro_count, pomodoro_target, current_pomodoro_start,
        productivity_score, focus_quality, distractions_count,
        ai_suggested_duration, ai_suggestion_reason,
        notes, accomplishments,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      session.id,
      session.project_id,
      session.goal_id,
      session.context_id,
      session.title,
      session.description,
      session.duration_minutes,
      session.session_type,
      session.status,
      session.started_at,
      session.paused_at,
      session.completed_at,
      session.total_elapsed_seconds,
      session.total_paused_seconds,
      session.pomodoro_count,
      session.pomodoro_target,
      session.current_pomodoro_start,
      session.productivity_score,
      session.focus_quality,
      session.distractions_count,
      session.ai_suggested_duration,
      session.ai_suggestion_reason,
      session.notes,
      session.accomplishments,
      now,
      now
    );

    const selectStmt = db.prepare('SELECT * FROM focus_sessions WHERE id = ?');
    return selectStmt.get(session.id) as DbFocusSession;
  },

  /**
   * Update a focus session
   */
  updateSession: (
    id: string,
    updates: Partial<Omit<DbFocusSession, 'id' | 'project_id' | 'created_at'>>
  ): DbFocusSession | null => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const updateFields: string[] = ['updated_at = ?'];
    const values: (string | number | null)[] = [now];

    if (updates.goal_id !== undefined) {
      updateFields.push('goal_id = ?');
      values.push(updates.goal_id);
    }
    if (updates.context_id !== undefined) {
      updateFields.push('context_id = ?');
      values.push(updates.context_id);
    }
    if (updates.title !== undefined) {
      updateFields.push('title = ?');
      values.push(updates.title);
    }
    if (updates.description !== undefined) {
      updateFields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.duration_minutes !== undefined) {
      updateFields.push('duration_minutes = ?');
      values.push(updates.duration_minutes);
    }
    if (updates.session_type !== undefined) {
      updateFields.push('session_type = ?');
      values.push(updates.session_type);
    }
    if (updates.status !== undefined) {
      updateFields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.started_at !== undefined) {
      updateFields.push('started_at = ?');
      values.push(updates.started_at);
    }
    if (updates.paused_at !== undefined) {
      updateFields.push('paused_at = ?');
      values.push(updates.paused_at);
    }
    if (updates.completed_at !== undefined) {
      updateFields.push('completed_at = ?');
      values.push(updates.completed_at);
    }
    if (updates.total_elapsed_seconds !== undefined) {
      updateFields.push('total_elapsed_seconds = ?');
      values.push(updates.total_elapsed_seconds);
    }
    if (updates.total_paused_seconds !== undefined) {
      updateFields.push('total_paused_seconds = ?');
      values.push(updates.total_paused_seconds);
    }
    if (updates.pomodoro_count !== undefined) {
      updateFields.push('pomodoro_count = ?');
      values.push(updates.pomodoro_count);
    }
    if (updates.pomodoro_target !== undefined) {
      updateFields.push('pomodoro_target = ?');
      values.push(updates.pomodoro_target);
    }
    if (updates.current_pomodoro_start !== undefined) {
      updateFields.push('current_pomodoro_start = ?');
      values.push(updates.current_pomodoro_start);
    }
    if (updates.productivity_score !== undefined) {
      updateFields.push('productivity_score = ?');
      values.push(updates.productivity_score);
    }
    if (updates.focus_quality !== undefined) {
      updateFields.push('focus_quality = ?');
      values.push(updates.focus_quality);
    }
    if (updates.distractions_count !== undefined) {
      updateFields.push('distractions_count = ?');
      values.push(updates.distractions_count);
    }
    if (updates.ai_suggested_duration !== undefined) {
      updateFields.push('ai_suggested_duration = ?');
      values.push(updates.ai_suggested_duration);
    }
    if (updates.ai_suggestion_reason !== undefined) {
      updateFields.push('ai_suggestion_reason = ?');
      values.push(updates.ai_suggestion_reason);
    }
    if (updates.notes !== undefined) {
      updateFields.push('notes = ?');
      values.push(updates.notes);
    }
    if (updates.accomplishments !== undefined) {
      updateFields.push('accomplishments = ?');
      values.push(updates.accomplishments);
    }

    values.push(id);

    const stmt = db.prepare(`
      UPDATE focus_sessions
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `);
    stmt.run(...values);

    const selectStmt = db.prepare('SELECT * FROM focus_sessions WHERE id = ?');
    return selectStmt.get(id) as DbFocusSession | null;
  },

  /**
   * Start a focus session
   */
  startSession: (id: string): DbFocusSession | null => {
    const now = new Date().toISOString();
    return focusSessionRepository.updateSession(id, {
      status: 'active',
      started_at: now,
      current_pomodoro_start: now,
    });
  },

  /**
   * Pause a focus session
   */
  pauseSession: (id: string): DbFocusSession | null => {
    const session = focusSessionRepository.getSessionById(id);
    if (!session || session.status !== 'active') return null;

    const now = new Date().toISOString();
    const startedAt = session.current_pomodoro_start || session.started_at;
    const elapsedSinceLastStart = startedAt
      ? Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
      : 0;

    return focusSessionRepository.updateSession(id, {
      status: 'paused',
      paused_at: now,
      total_elapsed_seconds: session.total_elapsed_seconds + elapsedSinceLastStart,
    });
  },

  /**
   * Resume a paused focus session
   */
  resumeSession: (id: string): DbFocusSession | null => {
    const session = focusSessionRepository.getSessionById(id);
    if (!session || session.status !== 'paused') return null;

    const now = new Date().toISOString();
    const pausedAt = session.paused_at;
    const pausedDuration = pausedAt
      ? Math.floor((Date.now() - new Date(pausedAt).getTime()) / 1000)
      : 0;

    return focusSessionRepository.updateSession(id, {
      status: 'active',
      paused_at: null,
      current_pomodoro_start: now,
      total_paused_seconds: session.total_paused_seconds + pausedDuration,
    });
  },

  /**
   * Complete a focus session
   */
  completeSession: (id: string, productivityScore?: number, focusQuality?: DbFocusSession['focus_quality']): DbFocusSession | null => {
    const session = focusSessionRepository.getSessionById(id);
    if (!session) return null;

    const now = new Date().toISOString();
    let totalElapsed = session.total_elapsed_seconds;

    // Add remaining time if session was active
    if (session.status === 'active' && session.current_pomodoro_start) {
      const elapsedSinceLastStart = Math.floor(
        (Date.now() - new Date(session.current_pomodoro_start).getTime()) / 1000
      );
      totalElapsed += elapsedSinceLastStart;
    }

    return focusSessionRepository.updateSession(id, {
      status: 'completed',
      completed_at: now,
      total_elapsed_seconds: totalElapsed,
      productivity_score: productivityScore ?? session.productivity_score,
      focus_quality: focusQuality ?? session.focus_quality,
    });
  },

  /**
   * Abandon a focus session
   */
  abandonSession: (id: string): DbFocusSession | null => {
    const session = focusSessionRepository.getSessionById(id);
    if (!session) return null;

    const now = new Date().toISOString();
    let totalElapsed = session.total_elapsed_seconds;

    // Add remaining time if session was active
    if (session.status === 'active' && session.current_pomodoro_start) {
      const elapsedSinceLastStart = Math.floor(
        (Date.now() - new Date(session.current_pomodoro_start).getTime()) / 1000
      );
      totalElapsed += elapsedSinceLastStart;
    }

    return focusSessionRepository.updateSession(id, {
      status: 'abandoned',
      completed_at: now,
      total_elapsed_seconds: totalElapsed,
    });
  },

  /**
   * Increment pomodoro count
   */
  incrementPomodoro: (id: string): DbFocusSession | null => {
    const session = focusSessionRepository.getSessionById(id);
    if (!session) return null;

    return focusSessionRepository.updateSession(id, {
      pomodoro_count: session.pomodoro_count + 1,
      current_pomodoro_start: new Date().toISOString(),
    });
  },

  /**
   * Delete a focus session
   */
  deleteSession: (id: string): boolean => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM focus_sessions WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  /**
   * Delete all sessions for a project
   */
  deleteAllForProject: (projectId: string): number => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM focus_sessions WHERE project_id = ?');
    const result = stmt.run(projectId);
    return result.changes;
  },
};

/**
 * Focus Break Repository
 * Handles break periods between focus sessions
 */
export const focusBreakRepository = {
  /**
   * Get breaks for a session
   */
  getBreaksBySession: (sessionId: string): DbFocusBreak[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM focus_breaks
      WHERE session_id = ?
      ORDER BY started_at DESC
    `);
    return stmt.all(sessionId) as DbFocusBreak[];
  },

  /**
   * Create a break
   */
  createBreak: (breakData: Omit<DbFocusBreak, 'created_at'>): DbFocusBreak => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO focus_breaks (id, session_id, break_type, duration_minutes, started_at, ended_at, skipped, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      breakData.id,
      breakData.session_id,
      breakData.break_type,
      breakData.duration_minutes,
      breakData.started_at,
      breakData.ended_at,
      breakData.skipped,
      now
    );

    const selectStmt = db.prepare('SELECT * FROM focus_breaks WHERE id = ?');
    return selectStmt.get(breakData.id) as DbFocusBreak;
  },

  /**
   * End a break
   */
  endBreak: (id: string): DbFocusBreak | null => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE focus_breaks
      SET ended_at = ?
      WHERE id = ?
    `);
    stmt.run(now, id);

    const selectStmt = db.prepare('SELECT * FROM focus_breaks WHERE id = ?');
    return selectStmt.get(id) as DbFocusBreak | null;
  },

  /**
   * Skip a break
   */
  skipBreak: (id: string): DbFocusBreak | null => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE focus_breaks
      SET skipped = 1, ended_at = ?
      WHERE id = ?
    `);
    stmt.run(now, id);

    const selectStmt = db.prepare('SELECT * FROM focus_breaks WHERE id = ?');
    return selectStmt.get(id) as DbFocusBreak | null;
  },
};

/**
 * Focus Stats Repository
 * Handles daily focus statistics and streaks
 */
export const focusStatsRepository = {
  /**
   * Get stats for a specific date
   */
  getStatsByDate: (projectId: string, date: string): DbFocusStats | null => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM focus_stats
      WHERE project_id = ? AND date = ?
    `);
    const stats = stmt.get(projectId, date) as DbFocusStats | undefined;
    return stats || null;
  },

  /**
   * Get stats for a date range
   */
  getStatsByDateRange: (
    projectId: string,
    startDate: string,
    endDate: string
  ): DbFocusStats[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM focus_stats
      WHERE project_id = ?
        AND date >= ?
        AND date <= ?
      ORDER BY date DESC
    `);
    return stmt.all(projectId, startDate, endDate) as DbFocusStats[];
  },

  /**
   * Get recent stats
   */
  getRecentStats: (projectId: string, days: number = 30): DbFocusStats[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM focus_stats
      WHERE project_id = ?
      ORDER BY date DESC
      LIMIT ?
    `);
    return stmt.all(projectId, days) as DbFocusStats[];
  },

  /**
   * Create or update stats for a date
   */
  upsertStats: (stats: Omit<DbFocusStats, 'created_at' | 'updated_at'>): DbFocusStats => {
    const db = getDatabase();
    const now = new Date().toISOString();

    // Check if stats exist for this date
    const existing = focusStatsRepository.getStatsByDate(stats.project_id, stats.date);

    if (existing) {
      // Update existing stats
      const stmt = db.prepare(`
        UPDATE focus_stats
        SET total_sessions = ?,
            completed_sessions = ?,
            abandoned_sessions = ?,
            total_focus_minutes = ?,
            total_break_minutes = ?,
            total_pomodoros = ?,
            avg_productivity_score = ?,
            avg_focus_quality = ?,
            current_streak_days = ?,
            longest_streak_days = ?,
            implementations_during_focus = ?,
            ideas_generated_during_focus = ?,
            updated_at = ?
        WHERE id = ?
      `);

      stmt.run(
        stats.total_sessions,
        stats.completed_sessions,
        stats.abandoned_sessions,
        stats.total_focus_minutes,
        stats.total_break_minutes,
        stats.total_pomodoros,
        stats.avg_productivity_score,
        stats.avg_focus_quality,
        stats.current_streak_days,
        stats.longest_streak_days,
        stats.implementations_during_focus,
        stats.ideas_generated_during_focus,
        now,
        existing.id
      );

      const selectStmt = db.prepare('SELECT * FROM focus_stats WHERE id = ?');
      return selectStmt.get(existing.id) as DbFocusStats;
    } else {
      // Create new stats
      const stmt = db.prepare(`
        INSERT INTO focus_stats (
          id, project_id, date,
          total_sessions, completed_sessions, abandoned_sessions,
          total_focus_minutes, total_break_minutes, total_pomodoros,
          avg_productivity_score, avg_focus_quality,
          current_streak_days, longest_streak_days,
          implementations_during_focus, ideas_generated_during_focus,
          created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        stats.id,
        stats.project_id,
        stats.date,
        stats.total_sessions,
        stats.completed_sessions,
        stats.abandoned_sessions,
        stats.total_focus_minutes,
        stats.total_break_minutes,
        stats.total_pomodoros,
        stats.avg_productivity_score,
        stats.avg_focus_quality,
        stats.current_streak_days,
        stats.longest_streak_days,
        stats.implementations_during_focus,
        stats.ideas_generated_during_focus,
        now,
        now
      );

      const selectStmt = db.prepare('SELECT * FROM focus_stats WHERE id = ?');
      return selectStmt.get(stats.id) as DbFocusStats;
    }
  },

  /**
   * Calculate current streak
   */
  calculateStreak: (projectId: string): { currentStreak: number; longestStreak: number } => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT date, completed_sessions
      FROM focus_stats
      WHERE project_id = ? AND completed_sessions > 0
      ORDER BY date DESC
    `);
    const results = stmt.all(projectId) as { date: string; completed_sessions: number }[];

    if (results.length === 0) {
      return { currentStreak: 0, longestStreak: 0 };
    }

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let previousDate: Date | null = null;

    for (const row of results) {
      const currentDate = new Date(row.date);

      if (previousDate === null) {
        // First date - check if it's today or yesterday
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        currentDate.setHours(0, 0, 0, 0);
        const diffDays = Math.floor((today.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays <= 1) {
          tempStreak = 1;
        }
      } else {
        const diffDays = Math.floor(
          (previousDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (diffDays === 1) {
          tempStreak++;
        } else {
          // Streak broken
          if (currentStreak === 0) {
            currentStreak = tempStreak;
          }
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      }

      previousDate = currentDate;
    }

    // Final update
    if (currentStreak === 0) {
      currentStreak = tempStreak;
    }
    longestStreak = Math.max(longestStreak, tempStreak, currentStreak);

    return { currentStreak, longestStreak };
  },

  /**
   * Get aggregated stats summary
   */
  getStatsSummary: (projectId: string, days: number = 30): {
    totalSessions: number;
    totalFocusHours: number;
    totalPomodoros: number;
    avgProductivityScore: number | null;
    completionRate: number;
    currentStreak: number;
    longestStreak: number;
  } => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT
        SUM(total_sessions) as totalSessions,
        SUM(total_focus_minutes) as totalFocusMinutes,
        SUM(total_pomodoros) as totalPomodoros,
        AVG(avg_productivity_score) as avgProductivityScore,
        SUM(completed_sessions) as completedSessions,
        SUM(abandoned_sessions) as abandonedSessions,
        MAX(current_streak_days) as currentStreak,
        MAX(longest_streak_days) as longestStreak
      FROM focus_stats
      WHERE project_id = ?
        AND date >= date('now', '-' || ? || ' days')
    `);

    const result = stmt.get(projectId, days) as {
      totalSessions: number | null;
      totalFocusMinutes: number | null;
      totalPomodoros: number | null;
      avgProductivityScore: number | null;
      completedSessions: number | null;
      abandonedSessions: number | null;
      currentStreak: number | null;
      longestStreak: number | null;
    };

    const totalSessions = (result.completedSessions || 0) + (result.abandonedSessions || 0);
    const completionRate = totalSessions > 0
      ? Math.round(((result.completedSessions || 0) / totalSessions) * 100)
      : 0;

    return {
      totalSessions: result.totalSessions || 0,
      totalFocusHours: Math.round((result.totalFocusMinutes || 0) / 60 * 10) / 10,
      totalPomodoros: result.totalPomodoros || 0,
      avgProductivityScore: result.avgProductivityScore
        ? Math.round(result.avgProductivityScore)
        : null,
      completionRate,
      currentStreak: result.currentStreak || 0,
      longestStreak: result.longestStreak || 0,
    };
  },
};
