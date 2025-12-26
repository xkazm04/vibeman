/**
 * Technical Debt types and interfaces
 * Used for tracking, scoring, and remediating technical debt across projects
 */

export type TechDebtSeverity = 'critical' | 'high' | 'medium' | 'low';
export type TechDebtCategory =
  | 'code_quality'
  | 'security'
  | 'performance'
  | 'maintainability'
  | 'testing'
  | 'documentation'
  | 'dependencies'
  | 'architecture'
  | 'accessibility'
  | 'other';

export type TechDebtStatus = 'detected' | 'acknowledged' | 'planned' | 'in_progress' | 'resolved' | 'dismissed';

/**
 * Database representation of a technical debt item
 */
export interface DbTechDebt {
  id: string;
  project_id: string;
  scan_id: string | null; // Link to scan that detected this debt
  category: TechDebtCategory;
  title: string;
  description: string;
  severity: TechDebtSeverity;
  risk_score: number; // 0-100 calculated risk score

  // Impact metrics
  estimated_effort_hours: number | null; // Hours estimated to fix
  impact_scope: string | null; // JSON array of impacted areas/files
  technical_impact: string | null; // Description of technical impact
  business_impact: string | null; // Description of business impact

  // Detection information
  detected_by: 'automated_scan' | 'manual_entry' | 'ai_analysis';
  detection_details: string | null; // JSON metadata about detection
  file_paths: string | null; // JSON array of affected file paths

  // Remediation planning
  status: TechDebtStatus;
  remediation_plan: string | null; // JSON structured remediation plan
  remediation_steps: string | null; // JSON array of step-by-step instructions
  estimated_completion_date: string | null;

  // Backlog integration
  backlog_item_id: string | null; // Link to generated backlog item
  goal_id: string | null; // Link to associated goal

  // Tracking
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  dismissed_at: string | null;
  dismissal_reason: string | null;
}

/**
 * Technical debt scan configuration
 */
export interface TechDebtScanConfig {
  projectId: string;
  scanTypes: TechDebtCategory[];
  filePatterns?: string[];
  excludePatterns?: string[];
  maxItems?: number;
  autoCreateBacklog?: boolean;
}

/**
 * Risk scoring factors
 */
export interface RiskFactors {
  severity: number; // Weight: 30
  ageInDays: number; // Weight: 20
  fileCount: number; // Weight: 15
  businessImpact: number; // Weight: 20
  technicalImpact: number; // Weight: 15
}

/**
 * Remediation plan structure
 */
export interface RemediationPlan {
  summary: string;
  estimatedEffort: number; // hours
  prerequisites: string[];
  steps: RemediationStep[];
  impactedFiles: Array<{
    path: string;
    changeType: 'modify' | 'create' | 'delete';
    description: string;
  }>;
  testingStrategy: string;
  rollbackPlan: string;
}

/**
 * Individual remediation step
 */
export interface RemediationStep {
  order: number;
  title: string;
  description: string;
  estimatedMinutes: number;
  validation: string; // How to verify this step is complete
}

/**
 * Technical debt statistics
 */
export interface TechDebtStats {
  totalItems: number;
  byCategory: Record<TechDebtCategory, number>;
  bySeverity: Record<TechDebtSeverity, number>;
  byStatus: Record<TechDebtStatus, number>;
  averageRiskScore: number;
  totalEstimatedHours: number;
  criticalCount: number;
  trendData: {
    date: string;
    detected: number;
    resolved: number;
    totalActive: number;
  }[];
}
