/**
 * Scan Prediction Types
 * Types for predictive scan scheduling system
 */

/**
 * Scan History Entry
 * Tracks execution history of scans for pattern analysis
 */
export interface DbScanHistory {
  id: string;
  project_id: string;
  scan_type: string;
  context_id: string | null;
  triggered_by: 'manual' | 'scheduled' | 'file_change' | 'commit';
  file_changes: string | null; // JSON array of changed file paths
  commit_sha: string | null;
  execution_time_ms: number | null;
  status: 'completed' | 'failed' | 'skipped';
  error_message: string | null;
  findings_count: number;
  staleness_score: number | null; // 0-100
  executed_at: string;
  created_at: string;
}

/**
 * Scan Prediction
 * AI-generated recommendation for when to run a scan
 */
export interface DbScanPrediction {
  id: string;
  project_id: string;
  scan_type: string;
  context_id: string | null;
  confidence_score: number; // 0-100
  staleness_score: number; // 0-100
  priority_score: number; // 0-100
  predicted_findings: number | null;
  recommendation: 'immediate' | 'soon' | 'scheduled' | 'skip';
  reasoning: string | null;
  affected_file_patterns: string | null; // JSON array
  last_scan_at: string | null;
  last_change_at: string | null;
  next_recommended_at: string | null;
  change_frequency_days: number | null;
  scan_frequency_days: number | null;
  dismissed: number; // 0 or 1 (boolean)
  scheduled: number; // 0 or 1 (boolean)
  calculated_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * File Change Pattern
 * Tracks file change patterns to predict scan staleness
 */
export interface DbFileChangePattern {
  id: string;
  project_id: string;
  file_pattern: string; // Glob pattern
  scan_types: string; // JSON array of scan type strings
  change_frequency_days: number | null;
  last_changed_at: string | null;
  commit_count: number;
  total_changes: number;
  created_at: string;
  updated_at: string;
}

/**
 * Parsed File Change Pattern (with JSON fields parsed)
 */
export interface FileChangePattern extends Omit<DbFileChangePattern, 'scan_types'> {
  scan_types: string[];
}

/**
 * Parsed Scan Prediction (with JSON fields parsed)
 */
export interface ScanPrediction extends Omit<DbScanPrediction, 'affected_file_patterns' | 'dismissed' | 'scheduled'> {
  affected_file_patterns: string[];
  dismissed: boolean;
  scheduled: boolean;
}

/**
 * Parsed Scan History (with JSON fields parsed)
 */
export interface ScanHistory extends Omit<DbScanHistory, 'file_changes'> {
  file_changes: string[];
}

/**
 * Scan Recommendation for UI
 */
export interface ScanRecommendation {
  scanType: string;
  contextId?: string;
  priority: 'immediate' | 'high' | 'medium' | 'low';
  confidenceScore: number;
  stalenessScore: number;
  reasoning: string;
  lastScanAt?: string;
  lastChangeAt?: string;
  nextRecommendedAt?: string;
  predictedFindings?: number;
}
