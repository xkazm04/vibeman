/**
 * Database model type definitions
 * Centralized type system for all database entities
 */

import type { IdeaCategory } from '@/types/ideaCategory';

// Goal types
export interface DbGoal {
  id: string;
  project_id: string;
  context_id: string | null;
  order_index: number;
  title: string;
  description: string | null;
  status: 'open' | 'in_progress' | 'done' | 'rejected' | 'undecided';
  created_at: string;
  updated_at: string;
}

// Backlog types
export interface ImpactedFile {
  path: string;
  changeType: 'create' | 'modify' | 'delete';
  description?: string;
}

export interface DbBacklogItem {
  id: string;
  project_id: string;
  goal_id: string | null;
  agent: 'developer' | 'mastermind' | 'tester' | 'artist' | 'custom';
  title: string;
  description: string;
  status: 'pending' | 'accepted' | 'rejected' | 'in_progress';
  type: 'proposal' | 'custom';
  impacted_files: string | null; // JSON string
  created_at: string;
  updated_at: string;
  accepted_at: string | null;
  rejected_at: string | null;
}

// Context group types
export interface DbContextGroup {
  id: string;
  project_id: string;
  name: string;
  color: string;
  position: number;
  created_at: string;
  updated_at: string;
}

// Context types
export interface DbContext {
  id: string;
  project_id: string;
  group_id: string | null;
  name: string;
  description: string | null;
  file_paths: string; // JSON string of file paths array
  has_context_file: number; // Boolean flag (0 or 1)
  context_file_path: string | null;
  preview: string | null; // Preview image path
  test_scenario: string | null; // Testing steps for automated screenshots
  test_updated: string | null; // Last time screenshot was taken
  created_at: string;
  updated_at: string;
}

// Event types
export interface DbEvent {
  id: string;
  project_id: string;
  title: string;
  description: string;
  type: 'info' | 'warning' | 'error' | 'success' | 'proposal_accepted' | 'proposal_rejected';
  agent: string | null;
  message: string | null;
  created_at: string;
}

// Scan types
export interface DbScan {
  id: string;
  project_id: string;
  scan_type: string;
  timestamp: string;
  summary: string | null;
  input_tokens: number | null; // LLM input tokens used
  output_tokens: number | null; // LLM output tokens used
  created_at: string;
}

// Idea types
export interface DbIdea {
  id: string;
  scan_id: string;
  project_id: string;
  context_id: string | null;
  scan_type: string; // Type of scan that generated this idea
  category: string; // Accepts any text, but IdeaCategory enum provides guidelines
  title: string;
  description: string | null;
  reasoning: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'implemented';
  user_feedback: string | null;
  user_pattern: number; // Boolean flag (0 or 1)
  effort: number | null; // 1 = lowest effort, 3 = highest effort
  impact: number | null; // 1 = lowest impact, 3 = highest impact
  requirement_id: string | null; // Claude Code requirement file name
  goal_id: string | null; // Related goal (foreign key to goals table)
  created_at: string;
  updated_at: string;
  implemented_at: string | null; // Date when idea was implemented
}

// Enhanced idea type with context color (from JOIN query)
export interface DbIdeaWithColor extends DbIdea {
  context_color?: string | null;
}

// Implementation log types
export interface DbImplementationLog {
  id: string;
  project_id: string;
  requirement_name: string;
  title: string;
  overview: string;
  tested: number; // SQLite boolean (0 or 1)
  created_at: string;
}


// Scan Queue types
export interface DbScanQueueItem {
  id: string;
  project_id: string;
  scan_type: string;
  context_id: string | null;
  trigger_type: 'manual' | 'git_push' | 'file_change' | 'scheduled';
  trigger_metadata: string | null; // JSON string
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  priority: number;
  progress: number; // 0-100
  progress_message: string | null;
  current_step: string | null;
  total_steps: number | null;
  scan_id: string | null;
  result_summary: string | null;
  error_message: string | null;
  auto_merge_enabled: number; // Boolean flag (0 or 1)
  auto_merge_status: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TriggerMetadata {
  files?: string[]; // Files that triggered the scan
  commitHash?: string; // Git commit hash
  branch?: string; // Git branch
  author?: string; // Commit author
  [key: string]: string | string[] | number | boolean | undefined; // Allow additional metadata
}

// Scan Notification types
export interface DbScanNotification {
  id: string;
  queue_item_id: string;
  project_id: string;
  notification_type: 'scan_started' | 'scan_completed' | 'scan_failed' | 'auto_merge_completed';
  title: string;
  message: string;
  data: string | null; // JSON string
  read: number; // Boolean flag (0 or 1)
  created_at: string;
}

// File Watch Config types
export interface DbFileWatchConfig {
  id: string;
  project_id: string;
  enabled: number; // Boolean flag (0 or 1)
  watch_patterns: string; // JSON array of glob patterns
  ignore_patterns: string | null; // JSON array of glob patterns
  scan_types: string; // JSON array of scan types
  debounce_ms: number;
  created_at: string;
  updated_at: string;
}

// Test Selectors types
export interface DbTestSelector {
  id: string;
  context_id: string;
  data_testid: string;
  title: string;
  filepath: string;
  created_at: string;
  updated_at: string;
}

// Goal Candidates types
export interface DbGoalCandidate {
  id: string;
  project_id: string;
  context_id: string | null;
  title: string;
  description: string | null;
  reasoning: string | null;
  priority_score: number; // 0-100
  source: string; // 'repository_scan' | 'git_issues' | 'pull_requests' | 'tech_debt' | 'manual'
  source_metadata: string | null; // JSON string with additional source info
  suggested_status: 'open' | 'in_progress' | 'done' | 'rejected' | 'undecided';
  user_action: 'accepted' | 'rejected' | 'tweaked' | 'pending' | null;
  goal_id: string | null; // Reference to created goal if accepted
  created_at: string;
  updated_at: string;
}

export interface GoalCandidateSourceMetadata {
  issueNumber?: number;
  prNumber?: number;
  commitHash?: string;
  filePaths?: string[];
  techDebtId?: string;
  [key: string]: string | string[] | number | boolean | undefined;
}

// Export standard category type for use in type annotations
export type { IdeaCategory };
