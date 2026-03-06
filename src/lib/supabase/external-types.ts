/**
 * Type definitions for External Requirements via Supabase
 */

export type ExternalRequirementStatus =
  | 'open'
  | 'claimed'
  | 'in_progress'
  | 'implemented'
  | 'discarded'
  | 'failed';

export interface ExternalRequirement {
  id: string;
  project_id: string;
  device_id: string | null;
  title: string;
  description: string;
  reasoning: string | null;
  category: string;
  priority: number;
  effort: number | null;
  impact: number | null;
  risk: number | null;
  status: ExternalRequirementStatus;
  source_app: string;
  source_ref: string | null;
  context_hints: string | null;
  metadata: Record<string, unknown>;
  claimed_by: string | null;
  claimed_at: string | null;
  completed_at: string | null;
  implementation_log_id: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface VibemanProjectSync {
  device_id: string;
  project_id: string;
  project_name: string;
  project_path?: string;
}

export interface ExternalPipelineConfig {
  deviceId: string;
  provider: string;
  model: string;
  timeoutMs?: number;
  abortSignal?: AbortSignal;
}

export type ExternalProcessingStatus =
  | 'analyzing'
  | 'executing'
  | 'cleanup'
  | 'completed'
  | 'failed';

export interface ExternalProcessingState {
  status: ExternalProcessingStatus;
  startedAt: number;
  error?: string;
}

export interface MatchedContext {
  id: string;
  name: string;
  description: string | null;
  filePaths: string[];
  entryPoints: string | null;
  dbTables: string | null;
  apiSurface: string | null;
  techStack: string | null;
  matchScore: number;
}
