/**
 * Onboarding Accelerator Repository
 * Database operations for the AI-powered developer onboarding system
 */

import { getDatabase } from '../connection';
import type {
  DbLearningPath,
  DbLearningModule,
  DbCodeWalkthrough,
  DbQuizQuestion,
  DbQuizResponse,
  DbLearningMetrics,
  DbOnboardingRecommendation,
  LearningPathStatus,
  LearningModuleStatus,
  DifficultyLevel,
  QuizAnswerStatus,
  KeyConcept,
  WalkthroughKeyPoint,
  QuizOption,
  AssignedWorkItem,
} from '../models/onboarding-accelerator.types';
import { generateId, getCurrentTimestamp, selectOne, selectAll } from './repository.utils';

/**
 * Learning Path Repository
 */
export const learningPathRepository = {
  /**
   * Create a new learning path
   */
  create: (data: {
    project_id: string;
    developer_name: string;
    assigned_work?: string[];
  }): DbLearningPath => {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const id = generateId('lpath');

    const stmt = db.prepare(`
      INSERT INTO learning_paths (
        id, project_id, developer_name, assigned_work, status,
        total_modules, completed_modules, progress_percentage,
        estimated_hours, actual_hours, learning_speed,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.project_id,
      data.developer_name,
      JSON.stringify(data.assigned_work || []),
      'draft',
      0,
      0,
      0,
      0,
      0,
      1.0,
      now,
      now
    );

    return selectOne<DbLearningPath>(db, 'SELECT * FROM learning_paths WHERE id = ?', id)!;
  },

  /**
   * Get learning path by ID
   */
  getById: (id: string): DbLearningPath | null => {
    const db = getDatabase();
    return selectOne<DbLearningPath>(db, 'SELECT * FROM learning_paths WHERE id = ?', id);
  },

  /**
   * Get learning paths by project
   */
  getByProject: (projectId: string): DbLearningPath[] => {
    const db = getDatabase();
    return selectAll<DbLearningPath>(
      db,
      'SELECT * FROM learning_paths WHERE project_id = ? ORDER BY created_at DESC',
      projectId
    );
  },

  /**
   * Get active learning paths by project
   */
  getActiveByProject: (projectId: string): DbLearningPath[] => {
    const db = getDatabase();
    return selectAll<DbLearningPath>(
      db,
      "SELECT * FROM learning_paths WHERE project_id = ? AND status = 'active' ORDER BY updated_at DESC",
      projectId
    );
  },

  /**
   * Update learning path
   */
  update: (id: string, updates: Partial<{
    developer_name: string;
    assigned_work: AssignedWorkItem[];
    status: LearningPathStatus;
    total_modules: number;
    completed_modules: number;
    progress_percentage: number;
    estimated_hours: number;
    actual_hours: number;
    learning_speed: number;
    started_at: string | null;
    completed_at: string | null;
  }>): DbLearningPath | null => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const updateFields: string[] = ['updated_at = ?'];
    const values: (string | number | null)[] = [now];

    if (updates.developer_name !== undefined) {
      updateFields.push('developer_name = ?');
      values.push(updates.developer_name);
    }
    if (updates.assigned_work !== undefined) {
      updateFields.push('assigned_work = ?');
      values.push(JSON.stringify(updates.assigned_work));
    }
    if (updates.status !== undefined) {
      updateFields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.total_modules !== undefined) {
      updateFields.push('total_modules = ?');
      values.push(updates.total_modules);
    }
    if (updates.completed_modules !== undefined) {
      updateFields.push('completed_modules = ?');
      values.push(updates.completed_modules);
    }
    if (updates.progress_percentage !== undefined) {
      updateFields.push('progress_percentage = ?');
      values.push(updates.progress_percentage);
    }
    if (updates.estimated_hours !== undefined) {
      updateFields.push('estimated_hours = ?');
      values.push(updates.estimated_hours);
    }
    if (updates.actual_hours !== undefined) {
      updateFields.push('actual_hours = ?');
      values.push(updates.actual_hours);
    }
    if (updates.learning_speed !== undefined) {
      updateFields.push('learning_speed = ?');
      values.push(updates.learning_speed);
    }
    if (updates.started_at !== undefined) {
      updateFields.push('started_at = ?');
      values.push(updates.started_at);
    }
    if (updates.completed_at !== undefined) {
      updateFields.push('completed_at = ?');
      values.push(updates.completed_at);
    }

    values.push(id);
    const stmt = db.prepare(`UPDATE learning_paths SET ${updateFields.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return selectOne<DbLearningPath>(db, 'SELECT * FROM learning_paths WHERE id = ?', id);
  },

  /**
   * Start a learning path
   */
  start: (id: string): DbLearningPath | null => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      UPDATE learning_paths
      SET status = 'active', started_at = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(now, now, id);

    return selectOne<DbLearningPath>(db, 'SELECT * FROM learning_paths WHERE id = ?', id);
  },

  /**
   * Complete a learning path
   */
  complete: (id: string): DbLearningPath | null => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      UPDATE learning_paths
      SET status = 'completed', completed_at = ?, progress_percentage = 100, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(now, now, id);

    return selectOne<DbLearningPath>(db, 'SELECT * FROM learning_paths WHERE id = ?', id);
  },

  /**
   * Update progress based on completed modules
   */
  updateProgress: (id: string): DbLearningPath | null => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    // Get the learning path
    const path = selectOne<DbLearningPath>(db, 'SELECT * FROM learning_paths WHERE id = ?', id);
    if (!path) return null;

    // Count modules
    const moduleStats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'completed' THEN actual_minutes ELSE 0 END) as actual_minutes
      FROM learning_modules WHERE path_id = ?
    `).get(id) as { total: number; completed: number; actual_minutes: number };

    const progress = moduleStats.total > 0
      ? Math.round((moduleStats.completed / moduleStats.total) * 100)
      : 0;

    const actualHours = (moduleStats.actual_minutes || 0) / 60;

    const stmt = db.prepare(`
      UPDATE learning_paths
      SET total_modules = ?, completed_modules = ?, progress_percentage = ?, actual_hours = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(moduleStats.total, moduleStats.completed, progress, actualHours, now, id);

    return selectOne<DbLearningPath>(db, 'SELECT * FROM learning_paths WHERE id = ?', id);
  },

  /**
   * Delete a learning path
   */
  delete: (id: string): void => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM learning_paths WHERE id = ?');
    stmt.run(id);
  },
};

/**
 * Learning Module Repository
 */
export const learningModuleRepository = {
  /**
   * Create a new learning module
   */
  create: (data: {
    path_id: string;
    context_id?: string | null;
    title: string;
    description: string;
    order_index: number;
    difficulty?: DifficultyLevel;
    estimated_minutes?: number;
    relevance_score?: number;
    prerequisites?: string[];
    key_concepts?: KeyConcept[];
    code_areas?: string[];
  }): DbLearningModule => {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const id = generateId('lmod');

    const stmt = db.prepare(`
      INSERT INTO learning_modules (
        id, path_id, context_id, title, description, order_index,
        status, difficulty, estimated_minutes, relevance_score,
        prerequisites, key_concepts, code_areas, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.path_id,
      data.context_id ?? null,
      data.title,
      data.description,
      data.order_index,
      data.order_index === 0 ? 'available' : 'locked',
      data.difficulty ?? 'beginner',
      data.estimated_minutes ?? 30,
      data.relevance_score ?? 50,
      JSON.stringify(data.prerequisites || []),
      JSON.stringify(data.key_concepts || []),
      JSON.stringify(data.code_areas || []),
      now,
      now
    );

    return selectOne<DbLearningModule>(db, 'SELECT * FROM learning_modules WHERE id = ?', id)!;
  },

  /**
   * Get module by ID
   */
  getById: (id: string): DbLearningModule | null => {
    const db = getDatabase();
    return selectOne<DbLearningModule>(db, 'SELECT * FROM learning_modules WHERE id = ?', id);
  },

  /**
   * Get modules by learning path
   */
  getByPath: (pathId: string): DbLearningModule[] => {
    const db = getDatabase();
    return selectAll<DbLearningModule>(
      db,
      'SELECT * FROM learning_modules WHERE path_id = ? ORDER BY order_index ASC',
      pathId
    );
  },

  /**
   * Get available modules for a path
   */
  getAvailable: (pathId: string): DbLearningModule[] => {
    const db = getDatabase();
    return selectAll<DbLearningModule>(
      db,
      "SELECT * FROM learning_modules WHERE path_id = ? AND status IN ('available', 'in_progress') ORDER BY order_index ASC",
      pathId
    );
  },

  /**
   * Update module
   */
  update: (id: string, updates: Partial<{
    title: string;
    description: string;
    order_index: number;
    status: LearningModuleStatus;
    difficulty: DifficultyLevel;
    estimated_minutes: number;
    actual_minutes: number | null;
    relevance_score: number;
    prerequisites: string[];
    key_concepts: KeyConcept[];
    code_areas: string[];
    started_at: string | null;
    completed_at: string | null;
  }>): DbLearningModule | null => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const updateFields: string[] = ['updated_at = ?'];
    const values: (string | number | null)[] = [now];

    if (updates.title !== undefined) {
      updateFields.push('title = ?');
      values.push(updates.title);
    }
    if (updates.description !== undefined) {
      updateFields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.order_index !== undefined) {
      updateFields.push('order_index = ?');
      values.push(updates.order_index);
    }
    if (updates.status !== undefined) {
      updateFields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.difficulty !== undefined) {
      updateFields.push('difficulty = ?');
      values.push(updates.difficulty);
    }
    if (updates.estimated_minutes !== undefined) {
      updateFields.push('estimated_minutes = ?');
      values.push(updates.estimated_minutes);
    }
    if (updates.actual_minutes !== undefined) {
      updateFields.push('actual_minutes = ?');
      values.push(updates.actual_minutes);
    }
    if (updates.relevance_score !== undefined) {
      updateFields.push('relevance_score = ?');
      values.push(updates.relevance_score);
    }
    if (updates.prerequisites !== undefined) {
      updateFields.push('prerequisites = ?');
      values.push(JSON.stringify(updates.prerequisites));
    }
    if (updates.key_concepts !== undefined) {
      updateFields.push('key_concepts = ?');
      values.push(JSON.stringify(updates.key_concepts));
    }
    if (updates.code_areas !== undefined) {
      updateFields.push('code_areas = ?');
      values.push(JSON.stringify(updates.code_areas));
    }
    if (updates.started_at !== undefined) {
      updateFields.push('started_at = ?');
      values.push(updates.started_at);
    }
    if (updates.completed_at !== undefined) {
      updateFields.push('completed_at = ?');
      values.push(updates.completed_at);
    }

    values.push(id);
    const stmt = db.prepare(`UPDATE learning_modules SET ${updateFields.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return selectOne<DbLearningModule>(db, 'SELECT * FROM learning_modules WHERE id = ?', id);
  },

  /**
   * Start a module
   */
  start: (id: string): DbLearningModule | null => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      UPDATE learning_modules
      SET status = 'in_progress', started_at = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(now, now, id);

    return selectOne<DbLearningModule>(db, 'SELECT * FROM learning_modules WHERE id = ?', id);
  },

  /**
   * Complete a module and unlock next
   */
  complete: (id: string, actualMinutes: number): DbLearningModule | null => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    // Complete this module
    const stmt = db.prepare(`
      UPDATE learning_modules
      SET status = 'completed', completed_at = ?, actual_minutes = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(now, actualMinutes, now, id);

    // Get the module to find path_id and order_index
    const module = selectOne<DbLearningModule>(db, 'SELECT * FROM learning_modules WHERE id = ?', id);
    if (module) {
      // Unlock the next module
      const unlockStmt = db.prepare(`
        UPDATE learning_modules
        SET status = 'available', updated_at = ?
        WHERE path_id = ? AND order_index = ? AND status = 'locked'
      `);
      unlockStmt.run(now, module.path_id, module.order_index + 1);

      // Update path progress
      learningPathRepository.updateProgress(module.path_id);
    }

    return module;
  },

  /**
   * Skip a module
   */
  skip: (id: string): DbLearningModule | null => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      UPDATE learning_modules
      SET status = 'skipped', updated_at = ?
      WHERE id = ?
    `);
    stmt.run(now, id);

    // Unlock next module
    const module = selectOne<DbLearningModule>(db, 'SELECT * FROM learning_modules WHERE id = ?', id);
    if (module) {
      const unlockStmt = db.prepare(`
        UPDATE learning_modules
        SET status = 'available', updated_at = ?
        WHERE path_id = ? AND order_index = ? AND status = 'locked'
      `);
      unlockStmt.run(now, module.path_id, module.order_index + 1);
    }

    return module;
  },

  /**
   * Delete a module
   */
  delete: (id: string): void => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM learning_modules WHERE id = ?');
    stmt.run(id);
  },
};

/**
 * Code Walkthrough Repository
 */
export const codeWalkthroughRepository = {
  /**
   * Create a new walkthrough
   */
  create: (data: {
    module_id: string;
    title: string;
    description?: string | null;
    file_path: string;
    start_line: number;
    end_line: number;
    order_index: number;
    explanation: string;
    key_points?: WalkthroughKeyPoint[];
    related_files?: string[];
  }): DbCodeWalkthrough => {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const id = generateId('walk');

    const stmt = db.prepare(`
      INSERT INTO code_walkthroughs (
        id, module_id, title, description, file_path, start_line, end_line,
        order_index, explanation, key_points, related_files, viewed,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.module_id,
      data.title,
      data.description ?? null,
      data.file_path,
      data.start_line,
      data.end_line,
      data.order_index,
      data.explanation,
      JSON.stringify(data.key_points || []),
      JSON.stringify(data.related_files || []),
      0,
      now,
      now
    );

    return selectOne<DbCodeWalkthrough>(db, 'SELECT * FROM code_walkthroughs WHERE id = ?', id)!;
  },

  /**
   * Get walkthrough by ID
   */
  getById: (id: string): DbCodeWalkthrough | null => {
    const db = getDatabase();
    return selectOne<DbCodeWalkthrough>(db, 'SELECT * FROM code_walkthroughs WHERE id = ?', id);
  },

  /**
   * Get walkthroughs by module
   */
  getByModule: (moduleId: string): DbCodeWalkthrough[] => {
    const db = getDatabase();
    return selectAll<DbCodeWalkthrough>(
      db,
      'SELECT * FROM code_walkthroughs WHERE module_id = ? ORDER BY order_index ASC',
      moduleId
    );
  },

  /**
   * Mark as viewed
   */
  markViewed: (id: string): DbCodeWalkthrough | null => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      UPDATE code_walkthroughs
      SET viewed = 1, viewed_at = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(now, now, id);

    return selectOne<DbCodeWalkthrough>(db, 'SELECT * FROM code_walkthroughs WHERE id = ?', id);
  },

  /**
   * Update walkthrough
   */
  update: (id: string, updates: Partial<{
    title: string;
    description: string | null;
    explanation: string;
    key_points: WalkthroughKeyPoint[];
    related_files: string[];
  }>): DbCodeWalkthrough | null => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const updateFields: string[] = ['updated_at = ?'];
    const values: (string | null)[] = [now];

    if (updates.title !== undefined) {
      updateFields.push('title = ?');
      values.push(updates.title);
    }
    if (updates.description !== undefined) {
      updateFields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.explanation !== undefined) {
      updateFields.push('explanation = ?');
      values.push(updates.explanation);
    }
    if (updates.key_points !== undefined) {
      updateFields.push('key_points = ?');
      values.push(JSON.stringify(updates.key_points));
    }
    if (updates.related_files !== undefined) {
      updateFields.push('related_files = ?');
      values.push(JSON.stringify(updates.related_files));
    }

    values.push(id);
    const stmt = db.prepare(`UPDATE code_walkthroughs SET ${updateFields.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return selectOne<DbCodeWalkthrough>(db, 'SELECT * FROM code_walkthroughs WHERE id = ?', id);
  },

  /**
   * Delete walkthrough
   */
  delete: (id: string): void => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM code_walkthroughs WHERE id = ?');
    stmt.run(id);
  },
};

/**
 * Quiz Question Repository
 */
export const quizQuestionRepository = {
  /**
   * Create a quiz question
   */
  create: (data: {
    module_id: string;
    question: string;
    question_type: DbQuizQuestion['question_type'];
    options?: QuizOption[];
    correct_answer: string;
    explanation: string;
    code_snippet?: string | null;
    difficulty?: DifficultyLevel;
    points?: number;
    order_index: number;
  }): DbQuizQuestion => {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const id = generateId('quiz');

    const stmt = db.prepare(`
      INSERT INTO quiz_questions (
        id, module_id, question, question_type, options, correct_answer,
        explanation, code_snippet, difficulty, points, order_index, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.module_id,
      data.question,
      data.question_type,
      JSON.stringify(data.options || []),
      data.correct_answer,
      data.explanation,
      data.code_snippet ?? null,
      data.difficulty ?? 'intermediate',
      data.points ?? 10,
      data.order_index,
      now
    );

    return selectOne<DbQuizQuestion>(db, 'SELECT * FROM quiz_questions WHERE id = ?', id)!;
  },

  /**
   * Get question by ID
   */
  getById: (id: string): DbQuizQuestion | null => {
    const db = getDatabase();
    return selectOne<DbQuizQuestion>(db, 'SELECT * FROM quiz_questions WHERE id = ?', id);
  },

  /**
   * Get questions by module
   */
  getByModule: (moduleId: string): DbQuizQuestion[] => {
    const db = getDatabase();
    return selectAll<DbQuizQuestion>(
      db,
      'SELECT * FROM quiz_questions WHERE module_id = ? ORDER BY order_index ASC',
      moduleId
    );
  },

  /**
   * Delete question
   */
  delete: (id: string): void => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM quiz_questions WHERE id = ?');
    stmt.run(id);
  },
};

/**
 * Quiz Response Repository
 */
export const quizResponseRepository = {
  /**
   * Record a quiz response
   */
  create: (data: {
    question_id: string;
    path_id: string;
    answer: string;
    status: QuizAnswerStatus;
    points_earned: number;
    time_taken_seconds: number;
    feedback?: string | null;
  }): DbQuizResponse => {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const id = generateId('resp');

    // Get attempt number
    const existingResponses = db.prepare(
      'SELECT COUNT(*) as count FROM quiz_responses WHERE question_id = ? AND path_id = ?'
    ).get(data.question_id, data.path_id) as { count: number };

    const stmt = db.prepare(`
      INSERT INTO quiz_responses (
        id, question_id, path_id, answer, status, points_earned,
        time_taken_seconds, attempt_number, feedback, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.question_id,
      data.path_id,
      data.answer,
      data.status,
      data.points_earned,
      data.time_taken_seconds,
      existingResponses.count + 1,
      data.feedback ?? null,
      now
    );

    return selectOne<DbQuizResponse>(db, 'SELECT * FROM quiz_responses WHERE id = ?', id)!;
  },

  /**
   * Get responses by path
   */
  getByPath: (pathId: string): DbQuizResponse[] => {
    const db = getDatabase();
    return selectAll<DbQuizResponse>(
      db,
      'SELECT * FROM quiz_responses WHERE path_id = ? ORDER BY created_at DESC',
      pathId
    );
  },

  /**
   * Get responses for a question
   */
  getByQuestion: (questionId: string, pathId: string): DbQuizResponse[] => {
    const db = getDatabase();
    return selectAll<DbQuizResponse>(
      db,
      'SELECT * FROM quiz_responses WHERE question_id = ? AND path_id = ? ORDER BY attempt_number ASC',
      questionId,
      pathId
    );
  },

  /**
   * Get quiz stats for a path
   */
  getStats: (pathId: string): { total: number; correct: number; avgScore: number; avgTime: number } => {
    const db = getDatabase();
    const stats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'correct' THEN 1 ELSE 0 END) as correct,
        AVG(points_earned) as avg_score,
        AVG(time_taken_seconds) as avg_time
      FROM quiz_responses
      WHERE path_id = ?
    `).get(pathId) as { total: number; correct: number; avg_score: number; avg_time: number } | undefined;

    return {
      total: stats?.total ?? 0,
      correct: stats?.correct ?? 0,
      avgScore: stats?.avg_score ?? 0,
      avgTime: stats?.avg_time ?? 0,
    };
  },
};

/**
 * Learning Metrics Repository
 */
export const learningMetricsRepository = {
  /**
   * Get or create metrics for a path/module
   */
  getOrCreate: (pathId: string, moduleId?: string | null): DbLearningMetrics => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    let metrics = moduleId
      ? selectOne<DbLearningMetrics>(
          db,
          'SELECT * FROM learning_metrics WHERE path_id = ? AND module_id = ?',
          pathId,
          moduleId
        )
      : selectOne<DbLearningMetrics>(
          db,
          'SELECT * FROM learning_metrics WHERE path_id = ? AND module_id IS NULL',
          pathId
        );

    if (!metrics) {
      const id = generateId('metrics');
      const stmt = db.prepare(`
        INSERT INTO learning_metrics (
          id, path_id, module_id, estimated_time_minutes, actual_time_minutes,
          quiz_attempts, quiz_correct, quiz_total, average_quiz_score,
          reading_speed_factor, comprehension_score, walkthroughs_viewed,
          walkthroughs_total, revisits, last_activity_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        id,
        pathId,
        moduleId ?? null,
        0, 0, 0, 0, 0, 0, 1.0, 0, 0, 0, 0,
        now, now, now
      );

      metrics = selectOne<DbLearningMetrics>(db, 'SELECT * FROM learning_metrics WHERE id = ?', id)!;
    }

    return metrics;
  },

  /**
   * Update metrics
   */
  update: (id: string, updates: Partial<{
    estimated_time_minutes: number;
    actual_time_minutes: number;
    quiz_attempts: number;
    quiz_correct: number;
    quiz_total: number;
    average_quiz_score: number;
    reading_speed_factor: number;
    comprehension_score: number;
    walkthroughs_viewed: number;
    walkthroughs_total: number;
    revisits: number;
  }>): DbLearningMetrics | null => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const updateFields: string[] = ['updated_at = ?', 'last_activity_at = ?'];
    const values: (string | number)[] = [now, now];

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        updateFields.push(`${key} = ?`);
        values.push(value);
      }
    });

    values.push(id);
    const stmt = db.prepare(`UPDATE learning_metrics SET ${updateFields.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return selectOne<DbLearningMetrics>(db, 'SELECT * FROM learning_metrics WHERE id = ?', id);
  },

  /**
   * Increment walkthrough view count
   */
  incrementWalkthroughView: (pathId: string, moduleId: string): void => {
    const metrics = learningMetricsRepository.getOrCreate(pathId, moduleId);
    learningMetricsRepository.update(metrics.id, {
      walkthroughs_viewed: metrics.walkthroughs_viewed + 1,
    });
  },

  /**
   * Record quiz attempt
   */
  recordQuizAttempt: (pathId: string, moduleId: string, correct: boolean, score: number): void => {
    const metrics = learningMetricsRepository.getOrCreate(pathId, moduleId);
    const newTotal = metrics.quiz_total + 1;
    const newCorrect = metrics.quiz_correct + (correct ? 1 : 0);
    const newAvg = ((metrics.average_quiz_score * metrics.quiz_total) + score) / newTotal;

    learningMetricsRepository.update(metrics.id, {
      quiz_attempts: metrics.quiz_attempts + 1,
      quiz_correct: newCorrect,
      quiz_total: newTotal,
      average_quiz_score: newAvg,
      comprehension_score: (newCorrect / newTotal) * 100,
    });
  },

  /**
   * Get metrics by path
   */
  getByPath: (pathId: string): DbLearningMetrics[] => {
    const db = getDatabase();
    return selectAll<DbLearningMetrics>(
      db,
      'SELECT * FROM learning_metrics WHERE path_id = ? ORDER BY created_at ASC',
      pathId
    );
  },
};

/**
 * Onboarding Recommendation Repository
 */
export const onboardingRecommendationRepository = {
  /**
   * Create a recommendation
   */
  create: (data: {
    path_id: string;
    recommendation_type: DbOnboardingRecommendation['recommendation_type'];
    title: string;
    description: string;
    reason: string;
    context_id?: string | null;
    module_id?: string | null;
    priority?: number;
  }): DbOnboardingRecommendation => {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const id = generateId('rec');

    const stmt = db.prepare(`
      INSERT INTO onboarding_recommendations (
        id, path_id, recommendation_type, title, description, reason,
        context_id, module_id, priority, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.path_id,
      data.recommendation_type,
      data.title,
      data.description,
      data.reason,
      data.context_id ?? null,
      data.module_id ?? null,
      data.priority ?? 5,
      'pending',
      now,
      now
    );

    return selectOne<DbOnboardingRecommendation>(db, 'SELECT * FROM onboarding_recommendations WHERE id = ?', id)!;
  },

  /**
   * Get pending recommendations
   */
  getPending: (pathId: string): DbOnboardingRecommendation[] => {
    const db = getDatabase();
    return selectAll<DbOnboardingRecommendation>(
      db,
      "SELECT * FROM onboarding_recommendations WHERE path_id = ? AND status = 'pending' ORDER BY priority DESC",
      pathId
    );
  },

  /**
   * Accept recommendation
   */
  accept: (id: string): DbOnboardingRecommendation | null => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      UPDATE onboarding_recommendations
      SET status = 'accepted', updated_at = ?
      WHERE id = ?
    `);
    stmt.run(now, id);

    return selectOne<DbOnboardingRecommendation>(db, 'SELECT * FROM onboarding_recommendations WHERE id = ?', id);
  },

  /**
   * Dismiss recommendation
   */
  dismiss: (id: string): DbOnboardingRecommendation | null => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      UPDATE onboarding_recommendations
      SET status = 'dismissed', updated_at = ?
      WHERE id = ?
    `);
    stmt.run(now, id);

    return selectOne<DbOnboardingRecommendation>(db, 'SELECT * FROM onboarding_recommendations WHERE id = ?', id);
  },

  /**
   * Get all recommendations for a path
   */
  getByPath: (pathId: string): DbOnboardingRecommendation[] => {
    const db = getDatabase();
    return selectAll<DbOnboardingRecommendation>(
      db,
      'SELECT * FROM onboarding_recommendations WHERE path_id = ? ORDER BY priority DESC, created_at DESC',
      pathId
    );
  },
};
