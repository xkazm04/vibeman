/**
 * Group Health Scan Type Definitions
 * Types for tracking code health scans per context group
 */

export type HealthScanStatus = 'pending' | 'running' | 'completed' | 'failed';

/**
 * Database record for a group health scan
 */
export interface DbGroupHealthScan {
  id: string;
  group_id: string;
  project_id: string;
  status: HealthScanStatus;
  health_score: number | null;
  issues_found: number;
  issues_fixed: number;
  scan_summary: string | null; // JSON stringified HealthScanSummary
  git_commit_hash: string | null;
  git_pushed: number; // SQLite boolean (0 or 1)
  execution_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Issue category counts from a health scan
 */
export interface IssueCategory {
  found: number;
  fixed: number;
}

/**
 * Summary of a completed health scan
 */
export interface HealthScanSummary {
  filesScanned: number;
  filesFixed: number;
  issues: {
    unusedImports: IssueCategory;
    consoleStatements: IssueCategory;
    anyTypes: IssueCategory;
    longFunctions: IssueCategory;
    complexity: IssueCategory;
    duplication: IssueCategory;
  };
  healthScore: number;
}

/**
 * Input for creating a new health scan
 */
export interface CreateHealthScanInput {
  group_id: string;
  project_id: string;
  execution_id?: string;
}

/**
 * Input for updating a health scan
 */
export interface UpdateHealthScanInput {
  status?: HealthScanStatus;
  health_score?: number;
  issues_found?: number;
  issues_fixed?: number;
  scan_summary?: HealthScanSummary;
  git_commit_hash?: string;
  git_pushed?: boolean;
  started_at?: string;
  completed_at?: string;
}
