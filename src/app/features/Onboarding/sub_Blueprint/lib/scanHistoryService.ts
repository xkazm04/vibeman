/**
 * Scan History Service
 * Tracks blueprint scan executions for predictive scheduling
 */

import { v4 as uuidv4 } from 'uuid';
import { scanHistoryDb, DbScanHistory } from '@/app/db';

/**
 * Scan execution context
 */
export interface ScanExecutionContext {
  projectId: string;
  scanType: string;
  contextId?: string;
  triggeredBy: 'manual' | 'scheduled' | 'file_change' | 'commit';
  fileChanges?: string[];
  commitSha?: string;
}

/**
 * Scan execution result
 */
export interface ScanExecutionResult {
  success: boolean;
  executionTimeMs: number;
  findingsCount?: number;
  stalenessScore?: number;
  error?: string;
}

/**
 * Record a scan execution in history
 */
export async function recordScanExecution(
  context: ScanExecutionContext,
  result: ScanExecutionResult
): Promise<DbScanHistory> {
  const historyEntry: Omit<DbScanHistory, 'created_at'> = {
    id: uuidv4(),
    project_id: context.projectId,
    scan_type: context.scanType,
    context_id: context.contextId || null,
    triggered_by: context.triggeredBy,
    file_changes: context.fileChanges ? JSON.stringify(context.fileChanges) : null,
    commit_sha: context.commitSha || null,
    execution_time_ms: result.executionTimeMs,
    status: result.success ? 'completed' : 'failed',
    error_message: result.error || null,
    findings_count: result.findingsCount || 0,
    staleness_score: result.stalenessScore || null,
    executed_at: new Date().toISOString(),
  };

  return scanHistoryDb.create(historyEntry);
}

/**
 * Get recent scan executions for a project
 */
export function getRecentScans(projectId: string, limit = 50) {
  return scanHistoryDb.getByProject(projectId, limit);
}

/**
 * Get last execution time for a specific scan type
 */
export function getLastScanTime(
  projectId: string,
  scanType: string,
  contextId?: string
): Date | null {
  const lastScan = scanHistoryDb.getLastScan(projectId, scanType, contextId);
  return lastScan ? new Date(lastScan.executed_at) : null;
}

/**
 * Calculate time since last scan (in hours)
 */
export function getTimeSinceLastScan(
  projectId: string,
  scanType: string,
  contextId?: string
): number | null {
  const lastScanTime = getLastScanTime(projectId, scanType, contextId);
  if (!lastScanTime) return null;

  const now = new Date();
  const diffMs = now.getTime() - lastScanTime.getTime();
  return diffMs / (1000 * 60 * 60); // Convert to hours
}

/**
 * Get average scan frequency (days between scans)
 */
export function getScanFrequency(projectId: string, scanType: string) {
  return scanHistoryDb.getScanFrequency(projectId, scanType);
}

/**
 * Calculate staleness score based on scan history
 * Returns a score from 0-100 where higher means more stale
 */
export function calculateStalenessScore(
  projectId: string,
  scanType: string,
  contextId?: string
): number {
  const hoursSinceLastScan = getTimeSinceLastScan(projectId, scanType, contextId);

  // If never scanned, return maximum staleness
  if (hoursSinceLastScan === null) return 100;

  // Get scan frequency to determine expected interval
  const frequency = getScanFrequency(projectId, scanType);

  // If we don't have enough history, use a default threshold of 7 days
  const expectedIntervalDays = frequency.scanCount >= 2 ? frequency.avgDaysBetweenScans : 7;
  const expectedIntervalHours = expectedIntervalDays * 24;

  // Calculate staleness as percentage of expected interval
  // Cap at 100
  const stalenessScore = Math.min(100, (hoursSinceLastScan / expectedIntervalHours) * 100);

  return Math.round(stalenessScore);
}

/**
 * Cleanup old scan history entries
 */
export function cleanupOldHistory(projectId: string, daysToKeep = 90): number {
  return scanHistoryDb.deleteOlderThan(projectId, daysToKeep);
}

/**
 * Get scan statistics for a project
 */
export function getScanStatistics(projectId: string) {
  const recentScans = scanHistoryDb.getByProject(projectId, 100);

  const stats = {
    totalScans: recentScans.length,
    successfulScans: recentScans.filter((s) => s.status === 'completed').length,
    failedScans: recentScans.filter((s) => s.status === 'failed').length,
    avgExecutionTimeMs: 0,
    totalFindings: 0,
    scanTypeBreakdown: {} as Record<string, number>,
    triggeredByBreakdown: {} as Record<string, number>,
  };

  let totalExecutionTime = 0;
  let executionCount = 0;

  recentScans.forEach((scan) => {
    // Execution time
    if (scan.execution_time_ms) {
      totalExecutionTime += scan.execution_time_ms;
      executionCount++;
    }

    // Findings
    stats.totalFindings += scan.findings_count || 0;

    // Scan type breakdown
    stats.scanTypeBreakdown[scan.scan_type] =
      (stats.scanTypeBreakdown[scan.scan_type] || 0) + 1;

    // Triggered by breakdown
    stats.triggeredByBreakdown[scan.triggered_by] =
      (stats.triggeredByBreakdown[scan.triggered_by] || 0) + 1;
  });

  stats.avgExecutionTimeMs = executionCount > 0 ? Math.round(totalExecutionTime / executionCount) : 0;

  return stats;
}
