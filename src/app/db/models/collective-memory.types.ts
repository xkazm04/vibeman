export type CollectiveMemoryType = 'pattern' | 'error_fix' | 'approach' | 'optimization' | 'conflict_resolution';
export type ApplicationOutcome = 'success' | 'failure' | 'partial' | 'pending';

export interface DbCollectiveMemoryEntry {
  id: string;
  project_id: string;
  session_id: string | null;
  task_id: string | null;
  memory_type: CollectiveMemoryType;
  title: string;
  description: string;
  code_pattern: string | null;
  tags: string | null; // JSON string[]
  context_ids: string | null; // JSON string[]
  file_patterns: string | null; // JSON string[]
  success_count: number;
  failure_count: number;
  effectiveness_score: number;
  last_applied_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbCollectiveMemoryApplication {
  id: string;
  memory_id: string;
  project_id: string;
  session_id: string | null;
  task_id: string | null;
  requirement_name: string | null;
  applied_at: string;
  outcome: ApplicationOutcome | null;
  outcome_details: string | null;
  resolved_at: string | null;
}

export interface CreateCollectiveMemoryInput {
  id: string;
  project_id: string;
  session_id?: string | null;
  task_id?: string | null;
  memory_type: CollectiveMemoryType;
  title: string;
  description: string;
  code_pattern?: string | null;
  tags?: string[];
  context_ids?: string[];
  file_patterns?: string[];
}

export interface CreateApplicationInput {
  id: string;
  memory_id: string;
  project_id: string;
  session_id?: string | null;
  task_id?: string | null;
  requirement_name?: string | null;
}
