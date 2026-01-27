/**
 * Cross Task Type Definitions
 * Types for cross-project requirement analysis and implementation planning
 */

// Analysis status
export type CrossTaskStatus = 'pending' | 'running' | 'completed' | 'failed';

/**
 * Cross Task Plan - stores cross-project analysis session and results
 */
export interface DbCrossTaskPlan {
  id: string;
  workspace_id: string | null;

  // Projects involved (JSON array of project IDs)
  project_ids: string;

  // User's requirement
  requirement: string;
  requirement_summary: string | null; // AI-generated one-liner

  // Analysis configuration
  prompt_used: string | null; // Full prompt sent to Claude Code

  // Results - 3 plan options as markdown
  plan_option_1: string | null;
  plan_option_1_title: string | null;
  plan_option_2: string | null;
  plan_option_2_title: string | null;
  plan_option_3: string | null;
  plan_option_3_title: string | null;

  // Flow breakdown (AI analysis of current implementation)
  current_flow_analysis: string | null; // Markdown

  // User selection
  selected_plan: number | null; // 1, 2, or 3
  user_notes: string | null;

  // Execution tracking
  status: CrossTaskStatus;
  execution_id: string | null; // CLI execution ID
  error_message: string | null;

  // Timestamps
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Plan option structure for API responses
 */
export interface CrossTaskPlanOption {
  number: 1 | 2 | 3;
  title: string;
  content: string; // Markdown
}

/**
 * Create input
 */
export interface CreateCrossTaskPlanInput {
  id: string;
  workspace_id?: string | null;
  project_ids: string[];
  requirement: string;
}

/**
 * Update input for completion
 */
export interface CompleteCrossTaskPlanInput {
  requirement_summary?: string;
  current_flow_analysis?: string;
  plan_option_1?: string;
  plan_option_1_title?: string;
  plan_option_2?: string;
  plan_option_2_title?: string;
  plan_option_3?: string;
  plan_option_3_title?: string;
}

/**
 * Context data passed to prompt builder
 */
export interface CrossTaskContextData {
  projectId: string;
  projectName: string;
  projectPath: string;
  contexts: Array<{
    id: string;
    name: string;
    businessFeature: string | null;
    category: 'ui' | 'lib' | 'api' | 'data' | null;
    apiRoutes: string[] | null;
    filePaths: string[];
    contextFilePath: string | null;
  }>;
}

/**
 * Architecture relationship for cross-task context
 */
export interface CrossTaskArchitectureRelationship {
  sourceProjectId: string;
  sourceProjectName: string;
  targetProjectId: string;
  targetProjectName: string;
  integrationType: 'rest' | 'graphql' | 'grpc' | 'websocket' | 'event' | 'database' | 'storage';
  label: string;
  protocol: string | null;
  dataFlow: string | null;
}

/**
 * Architecture context for cross-task analysis
 */
export interface CrossTaskArchitectureContext {
  relationships: CrossTaskArchitectureRelationship[];
  patterns: Array<{
    name: string;
    description: string;
    projectsInvolved: string[];
  }>;
  narrative: string | null;
}

/**
 * Prompt builder configuration
 */
export interface CrossTaskPromptConfig {
  planId: string;
  workspaceId: string | null;
  requirement: string;
  projects: CrossTaskContextData[];
  architecture: CrossTaskArchitectureContext | null;
  callbackUrl: string;
}
