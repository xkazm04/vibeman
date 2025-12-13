/**
 * Migration: Onboarding Accelerator Tables
 * Creates tables for the intelligent onboarding system
 */

import { getConnection } from '../drivers';

export function migrate028OnboardingAccelerator() {
  const db = getConnection();

  // Learning Paths - Main onboarding tracking entity
  db.exec(`
    CREATE TABLE IF NOT EXISTS learning_paths (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      developer_name TEXT NOT NULL,
      assigned_work TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'completed', 'archived')) DEFAULT 'draft',
      total_modules INTEGER NOT NULL DEFAULT 0,
      completed_modules INTEGER NOT NULL DEFAULT 0,
      progress_percentage INTEGER NOT NULL DEFAULT 0,
      estimated_hours REAL NOT NULL DEFAULT 0,
      actual_hours REAL NOT NULL DEFAULT 0,
      learning_speed REAL NOT NULL DEFAULT 1.0,
      started_at TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Learning Modules - Individual learning units
  db.exec(`
    CREATE TABLE IF NOT EXISTS learning_modules (
      id TEXT PRIMARY KEY,
      path_id TEXT NOT NULL,
      context_id TEXT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      order_index INTEGER NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('locked', 'available', 'in_progress', 'completed', 'skipped')) DEFAULT 'locked',
      difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')) DEFAULT 'beginner',
      estimated_minutes INTEGER NOT NULL DEFAULT 30,
      actual_minutes INTEGER,
      relevance_score INTEGER NOT NULL DEFAULT 50 CHECK (relevance_score >= 0 AND relevance_score <= 100),
      prerequisites TEXT NOT NULL DEFAULT '[]',
      key_concepts TEXT NOT NULL DEFAULT '[]',
      code_areas TEXT NOT NULL DEFAULT '[]',
      started_at TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (path_id) REFERENCES learning_paths(id) ON DELETE CASCADE,
      FOREIGN KEY (context_id) REFERENCES contexts(id) ON DELETE SET NULL
    );
  `);

  // Code Walkthroughs - Interactive code explanations
  db.exec(`
    CREATE TABLE IF NOT EXISTS code_walkthroughs (
      id TEXT PRIMARY KEY,
      module_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      file_path TEXT NOT NULL,
      start_line INTEGER NOT NULL,
      end_line INTEGER NOT NULL,
      order_index INTEGER NOT NULL,
      explanation TEXT NOT NULL,
      key_points TEXT NOT NULL DEFAULT '[]',
      related_files TEXT NOT NULL DEFAULT '[]',
      viewed INTEGER NOT NULL DEFAULT 0,
      viewed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (module_id) REFERENCES learning_modules(id) ON DELETE CASCADE
    );
  `);

  // Quiz Questions - Assessment questions
  db.exec(`
    CREATE TABLE IF NOT EXISTS quiz_questions (
      id TEXT PRIMARY KEY,
      module_id TEXT NOT NULL,
      question TEXT NOT NULL,
      question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'code_review', 'true_false', 'fill_blank')),
      options TEXT NOT NULL DEFAULT '[]',
      correct_answer TEXT NOT NULL,
      explanation TEXT NOT NULL,
      code_snippet TEXT,
      difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')) DEFAULT 'intermediate',
      points INTEGER NOT NULL DEFAULT 10,
      order_index INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (module_id) REFERENCES learning_modules(id) ON DELETE CASCADE
    );
  `);

  // Quiz Responses - Developer answers
  db.exec(`
    CREATE TABLE IF NOT EXISTS quiz_responses (
      id TEXT PRIMARY KEY,
      question_id TEXT NOT NULL,
      path_id TEXT NOT NULL,
      answer TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('correct', 'incorrect', 'partial')),
      points_earned INTEGER NOT NULL DEFAULT 0,
      time_taken_seconds INTEGER NOT NULL DEFAULT 0,
      attempt_number INTEGER NOT NULL DEFAULT 1,
      feedback TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (question_id) REFERENCES quiz_questions(id) ON DELETE CASCADE,
      FOREIGN KEY (path_id) REFERENCES learning_paths(id) ON DELETE CASCADE
    );
  `);

  // Learning Metrics - Adaptive tracking
  db.exec(`
    CREATE TABLE IF NOT EXISTS learning_metrics (
      id TEXT PRIMARY KEY,
      path_id TEXT NOT NULL,
      module_id TEXT,
      estimated_time_minutes INTEGER NOT NULL DEFAULT 0,
      actual_time_minutes INTEGER NOT NULL DEFAULT 0,
      quiz_attempts INTEGER NOT NULL DEFAULT 0,
      quiz_correct INTEGER NOT NULL DEFAULT 0,
      quiz_total INTEGER NOT NULL DEFAULT 0,
      average_quiz_score REAL NOT NULL DEFAULT 0,
      reading_speed_factor REAL NOT NULL DEFAULT 1.0,
      comprehension_score REAL NOT NULL DEFAULT 0,
      walkthroughs_viewed INTEGER NOT NULL DEFAULT 0,
      walkthroughs_total INTEGER NOT NULL DEFAULT 0,
      revisits INTEGER NOT NULL DEFAULT 0,
      last_activity_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (path_id) REFERENCES learning_paths(id) ON DELETE CASCADE,
      FOREIGN KEY (module_id) REFERENCES learning_modules(id) ON DELETE SET NULL
    );
  `);

  // Onboarding Recommendations - AI suggestions
  db.exec(`
    CREATE TABLE IF NOT EXISTS onboarding_recommendations (
      id TEXT PRIMARY KEY,
      path_id TEXT NOT NULL,
      recommendation_type TEXT NOT NULL CHECK (recommendation_type IN ('add_module', 'skip_module', 'revisit_module', 'adjust_pace', 'add_practice')),
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      reason TEXT NOT NULL,
      context_id TEXT,
      module_id TEXT,
      priority INTEGER NOT NULL DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
      status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'dismissed')) DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (path_id) REFERENCES learning_paths(id) ON DELETE CASCADE,
      FOREIGN KEY (context_id) REFERENCES contexts(id) ON DELETE SET NULL,
      FOREIGN KEY (module_id) REFERENCES learning_modules(id) ON DELETE SET NULL
    );
  `);

  // Create indexes for performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_learning_paths_project ON learning_paths(project_id);
    CREATE INDEX IF NOT EXISTS idx_learning_paths_status ON learning_paths(status);
    CREATE INDEX IF NOT EXISTS idx_learning_modules_path ON learning_modules(path_id);
    CREATE INDEX IF NOT EXISTS idx_learning_modules_context ON learning_modules(context_id);
    CREATE INDEX IF NOT EXISTS idx_learning_modules_status ON learning_modules(status);
    CREATE INDEX IF NOT EXISTS idx_code_walkthroughs_module ON code_walkthroughs(module_id);
    CREATE INDEX IF NOT EXISTS idx_quiz_questions_module ON quiz_questions(module_id);
    CREATE INDEX IF NOT EXISTS idx_quiz_responses_question ON quiz_responses(question_id);
    CREATE INDEX IF NOT EXISTS idx_quiz_responses_path ON quiz_responses(path_id);
    CREATE INDEX IF NOT EXISTS idx_learning_metrics_path ON learning_metrics(path_id);
    CREATE INDEX IF NOT EXISTS idx_learning_metrics_module ON learning_metrics(module_id);
    CREATE INDEX IF NOT EXISTS idx_onboarding_recommendations_path ON onboarding_recommendations(path_id);
    CREATE INDEX IF NOT EXISTS idx_onboarding_recommendations_status ON onboarding_recommendations(status);
  `);
}
