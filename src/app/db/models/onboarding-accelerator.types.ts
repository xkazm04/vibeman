/**
 * Onboarding Accelerator Type Definitions
 * Types for the AI-powered developer onboarding system
 */

// Learning path status types
export type LearningPathStatus = 'draft' | 'active' | 'completed' | 'archived';
export type LearningModuleStatus = 'locked' | 'available' | 'in_progress' | 'completed' | 'skipped';
export type QuizAnswerStatus = 'correct' | 'incorrect' | 'partial';
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

/**
 * Developer Learning Path - Main entity for tracking onboarding progress
 */
export interface DbLearningPath {
  id: string;
  project_id: string;
  developer_name: string;
  assigned_work: string; // JSON array of assigned work items/tasks
  status: LearningPathStatus;
  total_modules: number;
  completed_modules: number;
  progress_percentage: number;
  estimated_hours: number;
  actual_hours: number;
  learning_speed: number; // Multiplier: 1.0 = average, >1 = faster, <1 = slower
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Learning Module - Individual learning unit within a path
 */
export interface DbLearningModule {
  id: string;
  path_id: string;
  context_id: string | null; // Related context from codebase
  title: string;
  description: string;
  order_index: number;
  status: LearningModuleStatus;
  difficulty: DifficultyLevel;
  estimated_minutes: number;
  actual_minutes: number | null;
  relevance_score: number; // 0-100 how relevant to assigned work
  prerequisites: string; // JSON array of module IDs
  key_concepts: string; // JSON array of concepts to learn
  code_areas: string; // JSON array of file paths to understand
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Interactive Walkthrough - Step-by-step code explanation
 */
export interface DbCodeWalkthrough {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  file_path: string;
  start_line: number;
  end_line: number;
  order_index: number;
  explanation: string; // AI-generated explanation
  key_points: string; // JSON array of key takeaways
  related_files: string; // JSON array of related file paths
  viewed: number; // Boolean flag
  viewed_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Quiz Question - Assessment for verifying understanding
 */
export interface DbQuizQuestion {
  id: string;
  module_id: string;
  question: string;
  question_type: 'multiple_choice' | 'code_review' | 'true_false' | 'fill_blank';
  options: string; // JSON array of options (for multiple choice)
  correct_answer: string;
  explanation: string; // Explanation shown after answering
  code_snippet: string | null; // Code context for code_review type
  difficulty: DifficultyLevel;
  points: number;
  order_index: number;
  created_at: string;
}

/**
 * Quiz Response - Developer's answer to a question
 */
export interface DbQuizResponse {
  id: string;
  question_id: string;
  path_id: string;
  answer: string;
  status: QuizAnswerStatus;
  points_earned: number;
  time_taken_seconds: number;
  attempt_number: number;
  feedback: string | null; // AI-generated feedback
  created_at: string;
}

/**
 * Learning Progress Metrics - Adaptive learning tracking
 */
export interface DbLearningMetrics {
  id: string;
  path_id: string;
  module_id: string | null; // null for overall path metrics
  // Time metrics
  estimated_time_minutes: number;
  actual_time_minutes: number;
  // Quiz metrics
  quiz_attempts: number;
  quiz_correct: number;
  quiz_total: number;
  average_quiz_score: number;
  // Speed metrics
  reading_speed_factor: number; // Relative to average
  comprehension_score: number; // 0-100 based on quiz performance
  // Engagement
  walkthroughs_viewed: number;
  walkthroughs_total: number;
  revisits: number; // Number of times module was revisited
  // Timestamps
  last_activity_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Onboarding Recommendation - AI suggestions for learning path
 */
export interface DbOnboardingRecommendation {
  id: string;
  path_id: string;
  recommendation_type: 'add_module' | 'skip_module' | 'revisit_module' | 'adjust_pace' | 'add_practice';
  title: string;
  description: string;
  reason: string; // AI reasoning
  context_id: string | null;
  module_id: string | null;
  priority: number; // 1-10
  status: 'pending' | 'accepted' | 'dismissed';
  created_at: string;
  updated_at: string;
}

// JSON structure types for complex fields
export interface AssignedWorkItem {
  title: string;
  type: 'feature' | 'bugfix' | 'refactor' | 'documentation' | 'other';
  description?: string;
  relatedContexts?: string[];
}

export interface KeyConcept {
  name: string;
  description: string;
  importance: 'critical' | 'important' | 'helpful';
}

export interface WalkthroughKeyPoint {
  text: string;
  lineReference?: number;
}

export interface QuizOption {
  id: string;
  text: string;
  isCorrect?: boolean;
}
