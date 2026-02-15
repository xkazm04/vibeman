/**
 * Daily Standup Types
 * Types for automated standup reports and summaries
 */

/**
 * Automation session phases matching the DB CHECK constraint
 * (migrations 043 + 048)
 */
export type AutomationPhase =
  | 'pending'
  | 'running'
  | 'exploring'
  | 'generating'
  | 'evaluating'
  | 'complete'
  | 'failed'
  | 'paused';

// Database types for standup summaries
export interface DbStandupSummary {
  id: string;
  project_id: string;
  period_type: 'daily' | 'weekly';
  period_start: string; // ISO date
  period_end: string; // ISO date

  // Summary content
  title: string;
  summary: string; // AI-generated summary

  // Stats
  implementations_count: number;
  ideas_generated: number;
  ideas_accepted: number;
  ideas_rejected: number;
  ideas_implemented: number;
  scans_count: number;

  // Blockers and highlights
  blockers: string | null; // JSON array of blocker objects
  highlights: string | null; // JSON array of highlight objects

  // AI-detected patterns
  velocity_trend: 'increasing' | 'stable' | 'decreasing' | null;
  burnout_risk: 'low' | 'medium' | 'high' | null;
  focus_areas: string | null; // JSON array of focus area strings

  // Token tracking
  input_tokens: number | null;
  output_tokens: number | null;

  // Metadata
  generated_at: string;
  created_at: string;
  updated_at: string;
}

// Blocker structure
export interface StandupBlocker {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  relatedContext?: string;
  suggestedAction?: string;
}

// Highlight structure
export interface StandupHighlight {
  id: string;
  title: string;
  description: string;
  type: 'achievement' | 'milestone' | 'quality_improvement' | 'velocity_boost';
  metric?: string;
}

// Focus area structure
export interface StandupFocusArea {
  area: string;
  contextId?: string;
  scanType?: string;
  priority: 'high' | 'medium' | 'low';
  reason: string;
}

// API response types
export interface StandupSummaryResponse {
  id: string;
  projectId: string;
  periodType: 'daily' | 'weekly';
  periodStart: string;
  periodEnd: string;
  title: string;
  summary: string;
  stats: {
    implementationsCount: number;
    ideasGenerated: number;
    ideasAccepted: number;
    ideasRejected: number;
    ideasImplemented: number;
    scansCount: number;
  };
  blockers: StandupBlocker[];
  highlights: StandupHighlight[];
  insights: {
    velocityTrend: 'increasing' | 'stable' | 'decreasing' | null;
    burnoutRisk: 'low' | 'medium' | 'high' | null;
    focusAreas: StandupFocusArea[];
  };
  generatedAt: string;
}

// Generation request
export interface GenerateStandupRequest {
  projectId: string;
  periodType: 'daily' | 'weekly';
  periodStart?: string; // Defaults to today/this week
  forceRegenerate?: boolean;
}

// ── Predictive Standup Types ──

export interface PredictiveStandupData {
  /** Goals at risk of stalling based on velocity and signal patterns */
  goalsAtRisk: GoalRiskAssessment[];
  /** Contexts needing attention based on decay signals */
  contextDecayAlerts: ContextDecayAlert[];
  /** Optimal task ordering for the day */
  recommendedTaskOrder: TaskRecommendation[];
  /** Proactive blocker detection */
  predictedBlockers: PredictedBlocker[];
  /** Velocity metrics for the current vs previous period */
  velocityComparison: VelocityComparison;
  /** Overall prescriptive summary */
  missionBriefing: string;
}

export interface GoalRiskAssessment {
  goalId: string;
  goalTitle: string;
  status: string;
  progress: number;
  /** Days since last signal */
  daysSinceActivity: number;
  /** Velocity trend for this specific goal */
  velocityTrend: 'accelerating' | 'steady' | 'slowing' | 'stalled';
  /** Risk level: high = stalling, medium = slowing, low = on track */
  riskLevel: 'high' | 'medium' | 'low';
  riskReason: string;
  suggestedAction: string;
}

export interface ContextDecayAlert {
  contextId: string;
  contextName: string;
  /** Signal weight decay percentage (0-100, higher = more decayed) */
  decayPercent: number;
  lastActivityDate: string | null;
  /** Whether this context is linked to active goals */
  linkedToActiveGoals: boolean;
  urgency: 'critical' | 'warning' | 'info';
  suggestion: string;
}

export interface TaskRecommendation {
  /** What to work on */
  title: string;
  /** Why this task is recommended */
  reason: string;
  /** Associated goal or context */
  goalId?: string;
  contextId?: string;
  contextName?: string;
  /** Priority score (higher = do first) */
  priorityScore: number;
  /** Estimated complexity based on historical patterns */
  estimatedComplexity: 'light' | 'medium' | 'heavy';
  /** Suggested time slot */
  suggestedSlot: 'morning' | 'afternoon' | 'anytime';
}

export interface PredictedBlocker {
  title: string;
  description: string;
  /** What will be blocked if not addressed */
  affectedGoals: string[];
  severity: 'critical' | 'warning';
  /** Recommended action to prevent the blocker */
  preventiveAction: string;
  /** Confidence 0-100 */
  confidence: number;
}

export interface VelocityComparison {
  currentPeriod: VelocityMetrics;
  previousPeriod: VelocityMetrics;
  trend: 'accelerating' | 'steady' | 'decelerating';
  percentChange: number;
}

export interface VelocityMetrics {
  implementationsPerDay: number;
  ideasAcceptedPerDay: number;
  signalsPerDay: number;
  avgTaskDurationMinutes: number;
  successRate: number;
}

// Stats for standup generation
export interface StandupSourceData {
  implementationLogs: Array<{
    id: string;
    title: string;
    overview: string;
    contextId: string | null;
    requirementName: string;
    createdAt: string;
  }>;
  ideas: Array<{
    id: string;
    title: string;
    description: string | null;
    status: string;
    scanType: string;
    category: string;
    effort: number | null;
    impact: number | null;
    createdAt: string;
    implementedAt: string | null;
  }>;
  scans: Array<{
    id: string;
    scanType: string;
    summary: string | null;
    createdAt: string;
  }>;
  contexts: Array<{
    id: string;
    name: string;
    implementedTasks: number;
  }>;
}
