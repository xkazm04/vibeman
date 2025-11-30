/**
 * Security Intelligence Types
 * Defines interfaces for the global security intelligence dashboard
 */

/**
 * Database model for aggregated security metrics per project
 */
export interface DbSecurityIntelligence {
  id: string;
  project_id: string;
  project_name: string;
  project_path: string;
  total_vulnerabilities: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  patch_health_score: number; // 0-100
  ci_status: 'passing' | 'failing' | 'unknown' | 'pending';
  ci_last_run: string | null;
  risk_score: number; // 0-100 predictive risk score
  risk_trend: 'improving' | 'stable' | 'degrading';
  last_scan_at: string | null;
  patches_pending: number;
  patches_applied: number;
  stale_branches_count: number;
  community_score: number | null; // 0-100 from community scoring API
  last_community_update: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Database model for security alerts
 */
export interface DbSecurityAlert {
  id: string;
  project_id: string;
  alert_type: 'critical_vulnerability' | 'new_vulnerability' | 'patch_available' | 'ci_failure' | 'risk_threshold' | 'stale_branch';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  message: string;
  source: string; // vulnerability ID, branch name, etc.
  acknowledged: number; // Boolean flag (0 or 1)
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  resolved: number; // Boolean flag (0 or 1)
  resolved_at: string | null;
  created_at: string;
}

/**
 * Database model for stale branches tracking
 */
export interface DbStaleBranch {
  id: string;
  project_id: string;
  branch_name: string;
  last_commit_at: string;
  last_commit_author: string | null;
  days_stale: number;
  has_vulnerabilities: number; // Boolean flag (0 or 1)
  vulnerability_count: number;
  auto_close_eligible: number; // Boolean flag (0 or 1)
  auto_closed: number; // Boolean flag (0 or 1)
  auto_closed_at: string | null;
  manually_preserved: number; // Boolean flag (0 or 1)
  created_at: string;
  updated_at: string;
}

/**
 * Database model for community security scores
 */
export interface DbCommunitySecurityScore {
  id: string;
  project_id: string;
  package_name: string;
  package_version: string;
  community_score: number; // 0-100
  total_votes: number;
  positive_votes: number;
  negative_votes: number;
  source: 'internal' | 'npm' | 'github' | 'snyk' | 'other';
  notes: string | null;
  last_updated: string;
  created_at: string;
}

/**
 * Application model for security intelligence
 */
export interface SecurityIntelligence {
  id: string;
  projectId: string;
  projectName: string;
  projectPath: string;
  totalVulnerabilities: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  patchHealthScore: number;
  ciStatus: 'passing' | 'failing' | 'unknown' | 'pending';
  ciLastRun: Date | null;
  riskScore: number;
  riskTrend: 'improving' | 'stable' | 'degrading';
  lastScanAt: Date | null;
  patchesPending: number;
  patchesApplied: number;
  staleBranchesCount: number;
  communityScore: number | null;
  lastCommunityUpdate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Application model for security alerts
 */
export interface SecurityAlert {
  id: string;
  projectId: string;
  alertType: DbSecurityAlert['alert_type'];
  severity: DbSecurityAlert['severity'];
  title: string;
  message: string;
  source: string;
  acknowledged: boolean;
  acknowledgedAt: Date | null;
  acknowledgedBy: string | null;
  resolved: boolean;
  resolvedAt: Date | null;
  createdAt: Date;
}

/**
 * Application model for stale branches
 */
export interface StaleBranch {
  id: string;
  projectId: string;
  branchName: string;
  lastCommitAt: Date;
  lastCommitAuthor: string | null;
  daysStale: number;
  hasVulnerabilities: boolean;
  vulnerabilityCount: number;
  autoCloseEligible: boolean;
  autoClosed: boolean;
  autoClosedAt: Date | null;
  manuallyPreserved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Application model for community security scores
 */
export interface CommunitySecurityScore {
  id: string;
  projectId: string;
  packageName: string;
  packageVersion: string;
  communityScore: number;
  totalVotes: number;
  positiveVotes: number;
  negativeVotes: number;
  source: DbCommunitySecurityScore['source'];
  notes: string | null;
  lastUpdated: Date;
  createdAt: Date;
}

/**
 * Dashboard summary for cross-project view
 */
export interface SecurityDashboardSummary {
  totalProjects: number;
  projectsAtRisk: number;
  totalVulnerabilities: number;
  criticalVulnerabilities: number;
  averageRiskScore: number;
  averagePatchHealthScore: number;
  ciPassingCount: number;
  ciFailingCount: number;
  staleBranchesTotal: number;
  pendingAlerts: number;
  projects: SecurityIntelligence[];
}

/**
 * Predictive risk calculation input
 */
export interface RiskCalculationInput {
  vulnerabilities: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  patchAge: number; // days since last patch
  ciHealth: boolean;
  staleBranchCount: number;
  communityScore: number | null;
  historicalTrend: 'improving' | 'stable' | 'degrading';
}

/**
 * Risk prediction output
 */
export interface RiskPrediction {
  score: number; // 0-100
  trend: 'improving' | 'stable' | 'degrading';
  factors: RiskFactor[];
  recommendations: string[];
}

/**
 * Individual risk factor
 */
export interface RiskFactor {
  name: string;
  weight: number;
  contribution: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
}

/**
 * Community score submission
 */
export interface CommunityScoreSubmission {
  packageName: string;
  packageVersion: string;
  score: number;
  vote: 'positive' | 'negative' | 'neutral';
  notes?: string;
  source?: string;
}

/**
 * Public API response for community scoring
 */
export interface CommunityScoreApiResponse {
  success: boolean;
  packageName: string;
  packageVersion: string;
  aggregatedScore: number;
  totalVotes: number;
  breakdown: {
    positive: number;
    negative: number;
    neutral: number;
  };
  sources: string[];
  lastUpdated: string;
}
