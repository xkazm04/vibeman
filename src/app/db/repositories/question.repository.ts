import { getDatabase } from '../connection';
import { DbQuestion } from '../models/types';
import { buildUpdateQuery, getCurrentTimestamp, selectOne } from './repository.utils';

/**
 * Question Repository
 * Handles all database operations for questions (guided idea generation)
 * Questions are generated per context_map entry and when answered, auto-create Goals
 */
export const questionRepository = {
  /**
   * Get all questions for a project
   */
  getQuestionsByProject: (projectId: string): DbQuestion[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM questions
      WHERE project_id = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(projectId) as DbQuestion[];
  },

  /**
   * Get questions by context_map_id
   */
  getQuestionsByContextMapId: (projectId: string, contextMapId: string): DbQuestion[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM questions
      WHERE project_id = ? AND context_map_id = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(projectId, contextMapId) as DbQuestion[];
  },

  /**
   * Get pending questions for a project
   */
  getPendingQuestions: (projectId: string): DbQuestion[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM questions
      WHERE project_id = ? AND status = 'pending'
      ORDER BY created_at DESC
    `);
    return stmt.all(projectId) as DbQuestion[];
  },

  /**
   * Get answered questions for a project
   */
  getAnsweredQuestions: (projectId: string): DbQuestion[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM questions
      WHERE project_id = ? AND status = 'answered'
      ORDER BY updated_at DESC
    `);
    return stmt.all(projectId) as DbQuestion[];
  },

  /**
   * Get questions linked to a specific goal
   */
  getQuestionsByGoal: (goalId: string): DbQuestion[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM questions
      WHERE goal_id = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(goalId) as DbQuestion[];
  },

  /**
   * Get a single question by ID
   */
  getQuestionById: (questionId: string): DbQuestion | null => {
    const db = getDatabase();
    return selectOne<DbQuestion>(db, 'SELECT * FROM questions WHERE id = ?', questionId);
  },

  /**
   * Create a new question
   */
  createQuestion: (question: {
    id: string;
    project_id: string;
    context_map_id: string;
    context_map_title: string;
    question: string;
    answer?: string | null;
    status?: 'pending' | 'answered';
    goal_id?: string | null;
  }): DbQuestion => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      INSERT INTO questions (id, project_id, context_map_id, context_map_title, goal_id, question, answer, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      question.id,
      question.project_id,
      question.context_map_id,
      question.context_map_title,
      question.goal_id || null,
      question.question,
      question.answer || null,
      question.status || 'pending',
      now,
      now
    );

    return selectOne<DbQuestion>(db, 'SELECT * FROM questions WHERE id = ?', question.id)!;
  },

  /**
   * Update a question
   */
  updateQuestion: (id: string, updates: {
    answer?: string | null;
    status?: 'pending' | 'answered';
    goal_id?: string | null;
    question?: string;
    context_map_title?: string;
  }): DbQuestion | null => {
    const db = getDatabase();
    const { fields, values } = buildUpdateQuery(updates);

    if (fields.length === 0) {
      return selectOne<DbQuestion>(db, 'SELECT * FROM questions WHERE id = ?', id);
    }

    const now = getCurrentTimestamp();
    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    const stmt = db.prepare(`
      UPDATE questions
      SET ${fields.join(', ')}
      WHERE id = ?
    `);

    const result = stmt.run(...values);

    if (result.changes === 0) {
      return null;
    }

    return selectOne<DbQuestion>(db, 'SELECT * FROM questions WHERE id = ?', id);
  },

  /**
   * Answer a question (updates answer and status)
   */
  answerQuestion: (id: string, answer: string, goalId?: string): DbQuestion | null => {
    return questionRepository.updateQuestion(id, {
      answer,
      status: 'answered',
      goal_id: goalId || null
    });
  },

  /**
   * Link a question to a goal
   */
  linkQuestionToGoal: (questionId: string, goalId: string): DbQuestion | null => {
    return questionRepository.updateQuestion(questionId, {
      goal_id: goalId,
      status: 'answered'
    });
  },

  /**
   * Delete a question
   */
  deleteQuestion: (id: string): boolean => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM questions WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  /**
   * Delete all questions for a project
   */
  deleteQuestionsByProject: (projectId: string): number => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM questions WHERE project_id = ?');
    const result = stmt.run(projectId);
    return result.changes;
  },

  /**
   * Delete questions by context_map_id
   */
  deleteQuestionsByContextMapId: (projectId: string, contextMapId: string): number => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM questions WHERE project_id = ? AND context_map_id = ?');
    const result = stmt.run(projectId, contextMapId);
    return result.changes;
  },

  /**
   * Get question count by status for a project
   */
  getQuestionCounts: (projectId: string): { pending: number; answered: number; total: number } => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'answered' THEN 1 ELSE 0 END) as answered
      FROM questions
      WHERE project_id = ?
    `);
    const result = stmt.get(projectId) as { total: number; pending: number; answered: number };
    return {
      total: result.total || 0,
      pending: result.pending || 0,
      answered: result.answered || 0
    };
  }
};
