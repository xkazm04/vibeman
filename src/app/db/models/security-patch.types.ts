/**
 * Security Patch Types
 * Defines interfaces for the security scanning and patching pipeline
 */

export interface DbSecurityScan {
  id: string;
  project_id: string;
  scan_date: string;
  total_vulnerabilities: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  scan_output: string; // JSON string of full npm audit/pip audit output
  status: 'pending' | 'analyzing' | 'patch_generated' | 'pr_created' | 'tests_running' | 'tests_passed' | 'tests_failed' | 'merged' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface DbSecurityPatch {
  id: string;
  scan_id: string;
  project_id: string;
  vulnerability_id: string; // CVE or npm/pip vulnerability ID
  package_name: string;
  current_version: string;
  fixed_version: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  ai_analysis: string | null; // LLM analysis of the vulnerability
  patch_proposal: string | null; // LLM-generated patch suggestion
  patch_applied: number; // Boolean flag
  created_at: string;
  updated_at: string;
}

export interface DbSecurityPr {
  id: string;
  scan_id: string;
  project_id: string;
  pr_number: number | null;
  pr_url: string | null;
  branch_name: string;
  commit_sha: string | null;
  test_status: 'pending' | 'running' | 'passed' | 'failed' | 'cancelled';
  test_output: string | null; // JSON string of test results
  merge_status: 'pending' | 'merged' | 'rejected' | 'conflict';
  merge_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface SecurityScan {
  id: string;
  projectId: string;
  scanDate: Date;
  totalVulnerabilities: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  scanOutput: Record<string, unknown>; // Parsed JSON
  status: DbSecurityScan['status'];
  createdAt: Date;
  updatedAt: Date;
}

export interface SecurityPatch {
  id: string;
  scanId: string;
  projectId: string;
  vulnerabilityId: string;
  packageName: string;
  currentVersion: string;
  fixedVersion: string;
  severity: DbSecurityPatch['severity'];
  description: string;
  aiAnalysis: string | null;
  patchProposal: string | null;
  patchApplied: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SecurityPr {
  id: string;
  scanId: string;
  projectId: string;
  prNumber: number | null;
  prUrl: string | null;
  branchName: string;
  commitSha: string | null;
  testStatus: DbSecurityPr['test_status'];
  testOutput: Record<string, unknown> | null; // Parsed JSON
  mergeStatus: DbSecurityPr['merge_status'];
  mergeError: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface VulnerabilityInfo {
  id: string;
  packageName: string;
  currentVersion: string;
  fixedVersion: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  url?: string;
}
