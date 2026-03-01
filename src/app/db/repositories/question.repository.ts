import { getDatabase } from '../connection';
import { DbQuestion } from '../models/types';
import { buildUpdateQuery, getCurrentTimestamp, selectOne } from './repository.utils';

/**
 * Question Repository
 * Handles all database operations for questions (guided idea generation)
 * Questions are generated per context_map entry and when answered, auto-create Goals.
 * Supports recursive question trees with parent_id linking for cascading strategic planning.
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
    parent_id?: string | null;
    tree_depth?: number;
    auto_deepened?: number;
  }): DbQuestion => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      INSERT INTO questions (id, project_id, context_map_id, context_map_title, goal_id, question, answer, status, parent_id, tree_depth, auto_deepened, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      question.parent_id || null,
      question.tree_depth ?? 0,
      question.auto_deepened ?? 0,
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
    strategic_brief?: string | null;
    gap_score?: number | null;
    gap_analysis?: string | null;
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
  },

  // ─── Question Tree Operations ───

  /**
   * Get root questions (no parent) for a project
   */
  getRootQuestions: (projectId: string): DbQuestion[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM questions
      WHERE project_id = ? AND (parent_id IS NULL OR parent_id = '')
      ORDER BY created_at DESC
    `);
    return stmt.all(projectId) as DbQuestion[];
  },

  /**
   * Get child questions of a parent question
   */
  getChildQuestions: (parentId: string): DbQuestion[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM questions
      WHERE parent_id = ?
      ORDER BY created_at ASC
    `);
    return stmt.all(parentId) as DbQuestion[];
  },

  /**
   * Get full ancestry chain from a question up to root.
   * Returns array ordered root-first: [root, ..., parent, self]
   * Uses a recursive CTE to traverse the tree in a single query.
   */
  getAncestryChain: (questionId: string): DbQuestion[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      WITH RECURSIVE ancestry AS (
        SELECT *, 0 AS _depth FROM questions WHERE id = ?
        UNION ALL
        SELECT q.*, a._depth + 1 FROM questions q
        JOIN ancestry a ON q.id = a.parent_id
      )
      SELECT * FROM ancestry ORDER BY _depth DESC
    `);
    const rows = stmt.all(questionId) as (DbQuestion & { _depth: number })[];
    // Strip the helper column
    return rows.map(({ _depth, ...rest }) => rest as DbQuestion);
  },

  /**
   * Get the full subtree under a question.
   * Returns flat array including the root question, ordered by tree depth then created_at.
   * Uses a recursive CTE to traverse the tree in a single query.
   */
  getSubtree: (questionId: string): DbQuestion[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      WITH RECURSIVE subtree AS (
        SELECT *, 0 AS _depth FROM questions WHERE id = ?
        UNION ALL
        SELECT q.*, s._depth + 1 FROM questions q
        JOIN subtree s ON q.parent_id = s.id
      )
      SELECT * FROM subtree ORDER BY _depth ASC, created_at ASC
    `);
    const rows = stmt.all(questionId) as (DbQuestion & { _depth: number })[];
    return rows.map(({ _depth, ...rest }) => rest as DbQuestion);
  },

  /**
   * Get the maximum tree depth for any question tree rooted in this project
   */
  getMaxTreeDepth: (projectId: string): number => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT MAX(tree_depth) as max_depth FROM questions WHERE project_id = ?
    `);
    const result = stmt.get(projectId) as { max_depth: number | null };
    return result.max_depth ?? 0;
  },

  /**
   * Get all question trees for a project as a nested structure.
   * Returns an array of root questions, each with a `children` array.
   */
  getQuestionTrees: (projectId: string): QuestionTreeNode[] => {
    const allQuestions = questionRepository.getQuestionsByProject(projectId);
    return buildQuestionForest(allQuestions);
  },

  /**
   * Save a strategic brief on a question (typically the root of a deep tree)
   */
  saveStrategicBrief: (questionId: string, brief: string): DbQuestion | null => {
    return questionRepository.updateQuestion(questionId, {
      strategic_brief: brief,
    });
  },
};

// ─── Tree Helpers ───

export interface QuestionTreeNode extends DbQuestion {
  children: QuestionTreeNode[];
}

/**
 * Build a forest (array of trees) from a flat list of questions.
 * Questions with parent_id = null are roots.
 */
export function buildQuestionForest(questions: DbQuestion[]): QuestionTreeNode[] {
  const nodeMap = new Map<string, QuestionTreeNode>();
  const roots: QuestionTreeNode[] = [];

  // Create nodes
  for (const q of questions) {
    nodeMap.set(q.id, { ...q, children: [] });
  }

  // Link children to parents
  for (const q of questions) {
    const node = nodeMap.get(q.id)!;
    if (q.parent_id && nodeMap.has(q.parent_id)) {
      nodeMap.get(q.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Sort children by created_at ascending
  for (const node of nodeMap.values()) {
    node.children.sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  // Sort roots by created_at descending (newest first)
  roots.sort((a, b) => b.created_at.localeCompare(a.created_at));

  return roots;
}
