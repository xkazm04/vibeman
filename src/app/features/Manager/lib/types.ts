/**
 * Manager Feature Types
 * Types for implementation log management and improvement suggestions
 */

export interface EnrichedImplementationLog {
  id: string;
  project_id: string;
  project_name: string | null;
  context_id: string | null;
  context_name: string | null;
  context_group_id?: string | null;
  requirement_name: string;
  title: string;
  overview: string;
  overview_bullets: string | null;
  tested: number;
  screenshot: string | null;
  created_at: string;
}

export type AdvisorType = 'improve' | 'optimize' | 'refactor' | 'enhance';

export interface AdvisorConfig {
  type: AdvisorType;
  label: string;
  icon: any; // Lucide icon component
  color: string;
  description: string;
}

export interface LLMPromptContext {
  contextDescription?: string;
  previousOverview?: string;
  previousBullets?: string;
  userInput?: string;
}

export interface NewTaskPromptContext {
  contextDescription?: string;
  userInput: string;
  secondaryContextDescription?: string;
  isMultiproject?: boolean;
}

export interface ProjectContext {
  id: string;
  name: string;
  path: string;
}

export interface ImprovementRequest {
  log: EnrichedImplementationLog;
  advisorType?: AdvisorType;
  userInput: string;
  contextDescription?: string;
}

// Flow analysis types (shared between useFlowAnalysis hook and flow-analysis API route)

export interface FlowPair {
  source_group_id: string;
  target_group_id: string;
  total_count: number;
  success_count: number;
  fail_count: number;
  success_rate: number;
  log_ids: string[];
}

export interface Bottleneck {
  group_id: string;
  cross_context_fail_count: number;
}

export interface FlowAnalysisData {
  pairs: FlowPair[];
  bottlenecks: Bottleneck[];
  total_logs: number;
  cross_context_count: number;
}

export interface LogEntry {
  id: string;
  title: string;
  requirement_name: string;
  overview: string;
  tested: number;
  created_at: string;
  context_name: string | null;
}
