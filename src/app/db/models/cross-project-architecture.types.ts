/**
 * Cross-Project Architecture Type Definitions
 * Types for workspace-level architecture visualization and analysis
 */

// Integration types (determines connection styling)
export type IntegrationType = 'rest' | 'graphql' | 'grpc' | 'websocket' | 'event' | 'database' | 'storage';

// Project tier for visual grouping
export type ProjectTier = 'frontend' | 'backend' | 'external' | 'shared';

// Framework categories for visual identification
export type FrameworkCategory = 'react' | 'nextjs' | 'vue' | 'node' | 'python' | 'go' | 'java' | 'database' | 'cloud' | 'other';

// Analysis scope
export type AnalysisScope = 'project' | 'workspace';

// Analysis status
export type AnalysisStatus = 'pending' | 'running' | 'completed' | 'failed';

// Analysis trigger type
export type AnalysisTriggerType = 'manual' | 'onboarding' | 'scheduled';

// Detection method
export type DetectionMethod = 'manual' | 'ai_analysis' | 'import_scan';

/**
 * Cross-project relationship (connection between two projects)
 */
export interface DbCrossProjectRelationship {
  id: string;
  workspace_id: string | null;
  source_project_id: string;
  source_context_id: string | null;
  source_context_group_id: string | null;
  target_project_id: string;
  target_context_id: string | null;
  target_context_group_id: string | null;
  integration_type: IntegrationType;
  label: string | null;
  protocol: string | null;
  data_flow: string | null;
  confidence: number;
  detected_by: DetectionMethod | null;
  metadata: string | null; // JSON
  created_at: string;
  updated_at: string;
}

/**
 * Architecture analysis session
 */
export interface DbArchitectureAnalysisSession {
  id: string;
  workspace_id: string | null;
  project_id: string | null;
  scope: AnalysisScope;
  status: AnalysisStatus;
  trigger_type: AnalysisTriggerType;
  projects_analyzed: number;
  relationships_discovered: number;
  ai_analysis: string | null; // JSON - full analysis result
  ai_recommendations: string | null; // JSON - list of recommendations
  detected_patterns: string | null; // JSON - list of patterns
  execution_id: string | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

/**
 * Project architecture metadata
 */
export interface DbProjectArchitectureMetadata {
  id: string;
  project_id: string;
  workspace_id: string | null;
  tier: ProjectTier;
  framework: string | null;
  framework_category: FrameworkCategory | null;
  description: string | null;
  icon: string | null;
  color: string | null;
  position_x: number | null;
  position_y: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * Create input types
 */
export interface CreateCrossProjectRelationshipInput {
  id: string;
  workspace_id?: string | null;
  source_project_id: string;
  source_context_id?: string | null;
  source_context_group_id?: string | null;
  target_project_id: string;
  target_context_id?: string | null;
  target_context_group_id?: string | null;
  integration_type: IntegrationType;
  label?: string;
  protocol?: string;
  data_flow?: string;
  confidence?: number;
  detected_by?: DetectionMethod;
  metadata?: Record<string, unknown>;
}

export interface CreateArchitectureAnalysisInput {
  id: string;
  workspace_id?: string | null;
  project_id?: string | null;
  scope: AnalysisScope;
  trigger_type: AnalysisTriggerType;
}

export interface UpdateArchitectureAnalysisInput {
  status?: AnalysisStatus;
  projects_analyzed?: number;
  relationships_discovered?: number;
  ai_analysis?: string;
  ai_recommendations?: string;
  detected_patterns?: string;
  execution_id?: string;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
}

export interface CreateProjectArchitectureMetadataInput {
  id: string;
  project_id: string;
  workspace_id?: string | null;
  tier?: ProjectTier;
  framework?: string;
  framework_category?: FrameworkCategory;
  description?: string;
  icon?: string;
  color?: string;
  position_x?: number;
  position_y?: number;
}

export interface UpdateProjectArchitectureMetadataInput {
  tier?: ProjectTier;
  framework?: string;
  framework_category?: FrameworkCategory;
  description?: string;
  icon?: string;
  color?: string;
  position_x?: number;
  position_y?: number;
}

/**
 * Analysis result types (for AI responses)
 */
export interface ArchitecturePattern {
  name: string;
  description: string;
  projects_involved: string[];
  strength: 'strong' | 'moderate' | 'weak';
}

export interface ArchitectureRecommendation {
  type: 'optimization' | 'warning' | 'suggestion' | 'risk';
  title: string;
  description: string;
  affected_projects: string[];
  priority: 'high' | 'medium' | 'low';
}

export interface AnalysisResult {
  relationships: Array<{
    source_project_id: string;
    target_project_id: string;
    integration_type: IntegrationType;
    label: string;
    protocol?: string;
    data_flow?: string;
    confidence: number;
  }>;
  patterns: ArchitecturePattern[];
  recommendations: ArchitectureRecommendation[];
  narrative: string;
}
