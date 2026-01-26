/**
 * Reflector Module Database Types
 * Types for Executive Analysis feature
 */

export type ExecutiveAnalysisStatus = 'pending' | 'running' | 'completed' | 'failed';
export type ExecutiveAnalysisTriggerType = 'manual' | 'scheduled';

/**
 * Database record for Executive Analysis sessions
 */
export interface DbExecutiveAnalysis {
  id: string;
  project_id: string | null;  // null = global analysis
  context_id: string | null;
  status: ExecutiveAnalysisStatus;
  trigger_type: ExecutiveAnalysisTriggerType;

  // Scope of analysis
  ideas_analyzed: number;
  directions_analyzed: number;
  time_window: string;  // 'all' | 'week' | 'month' | 'quarter' | 'year'

  // Results from Claude Code
  ai_insights: string | null;      // JSON array of ExecutiveAIInsight
  ai_narrative: string | null;     // AI-generated narrative summary
  ai_recommendations: string | null; // JSON array of recommendations
  error_message: string | null;

  // Timing
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

/**
 * AI-generated insight from Claude Code analysis
 */
export interface ExecutiveAIInsight {
  type: 'pattern' | 'anomaly' | 'opportunity' | 'warning' | 'recommendation';
  title: string;
  description: string;
  confidence: number;  // 0-100
  evidence: string[];  // Specific data points supporting this insight
  actionable: boolean;
  suggestedAction?: string;
}

/**
 * Input for creating a new Executive Analysis record
 */
export interface CreateExecutiveAnalysisInput {
  id: string;
  project_id: string | null;
  context_id: string | null;
  trigger_type: ExecutiveAnalysisTriggerType;
  time_window: string;
}

/**
 * Data for completing an Executive Analysis
 */
export interface CompleteExecutiveAnalysisData {
  ideasAnalyzed: number;
  directionsAnalyzed: number;
  insights: ExecutiveAIInsight[];
  narrative: string;
  recommendations: string[];
}
