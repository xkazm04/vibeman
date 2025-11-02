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

// Documentation Hub types
export interface DbDocumentation {
  id: string;
  project_id: string;
  title: string;
  content: string; // Markdown content
  section_type: 'overview' | 'architecture' | 'api' | 'database' | 'components' | 'custom';
  auto_generated: number; // Boolean flag (0 or 1)
  source_metadata: string | null; // JSON string of source information
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocSourceMetadata {
  contexts?: string[]; // Context IDs
  files?: string[]; // File paths
  schemas?: string[]; // Database table names
  apiEndpoints?: string[]; // API route paths
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
  [key: string]: any; // Allow additional metadata
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

// Export standard category type for use in type annotations
export type { IdeaCategory };
