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
  created_at: string;
  updated_at: string;
  implemented_at: string | null; // Date when idea was implemented
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

// Export standard category type for use in type annotations
export type { IdeaCategory };
