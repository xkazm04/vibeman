/**
 * Scan Scheduler Service
 * Manages automated scan scheduling based on predictions
 */

import { scanQueueDb } from '@/app/db';
import {
  generateAllPredictions,
  generateScanPrediction,
  markRecommendationScheduled,
} from './predictiveModel';
import { recordScanExecution, ScanExecutionContext } from './scanHistoryService';

/**
 * Scheduled scan entry
 */
export interface ScheduledScan {
  scanType: string;
  contextId?: string;
  scheduledFor: Date;
  priority: number;
  predictionId: string;
}

/**
 * In-memory queue for scheduled scans
 */
const scheduledScans: Map<string, ScheduledScan[]> = new Map();

/**
 * Auto-schedule scans based on predictions
 */
export async function autoScheduleScans(projectId: string): Promise<ScheduledScan[]> {
  // Generate fresh predictions
  const predictions = await generateAllPredictions(projectId);

  // Filter to actionable recommendations
  const actionable = predictions.filter(
    (p) =>
      (p.recommendation === 'immediate' || p.recommendation === 'soon' || p.recommendation === 'scheduled') &&
      p.dismissed === 0 &&
      p.scheduled === 0
  );

  // Sort by priority
  actionable.sort((a, b) => b.priority_score - a.priority_score);

  // Create scheduled scans
  const scheduled: ScheduledScan[] = actionable.map((p) => {
    const scheduledFor = p.next_recommended_at
      ? new Date(p.next_recommended_at)
      : new Date();

    return {
      scanType: p.scan_type,
      contextId: p.context_id || undefined,
      scheduledFor,
      priority: p.priority_score,
      predictionId: p.id,
    };
  });

  // Store in queue
  scheduledScans.set(projectId, scheduled);

  // Mark as scheduled in database
  scheduled.forEach((s) => {
    markRecommendationScheduled(s.predictionId);
  });

  return scheduled;
}

/**
 * Get scheduled scans for a project
 */
export function getScheduledScans(projectId: string): ScheduledScan[] {
  return scheduledScans.get(projectId) || [];
}

/**
 * Get due scans (ready to execute)
 */
export function getDueScans(projectId: string): ScheduledScan[] {
  const scans = getScheduledScans(projectId);
  const now = new Date();

  return scans.filter((s) => s.scheduledFor <= now).sort((a, b) => b.priority - a.priority);
}

/**
 * Remove a scan from the schedule
 */
export function removeScanFromSchedule(projectId: string, scanType: string, contextId?: string): boolean {
  const scans = scheduledScans.get(projectId) || [];
  const filtered = scans.filter(
    (s) => !(s.scanType === scanType && s.contextId === contextId)
  );

  if (filtered.length < scans.length) {
    scheduledScans.set(projectId, filtered);
    return true;
  }

  return false;
}

/**
 * Execute a scheduled scan
 */
export async function executeScheduledScan(
  projectId: string,
  scanType: string,
  contextId?: string,
  executor?: (scanType: string, contextId?: string) => Promise<{ success: boolean; findingsCount?: number; error?: string }>
): Promise<{ success: boolean; error?: string }> {
  if (!executor) {
    return { success: false, error: 'No scan executor provided' };
  }

  const startTime = Date.now();

  try {
    // Execute the scan
    const result = await executor(scanType, contextId);

    const executionTimeMs = Date.now() - startTime;

    // Record in history
    const context: ScanExecutionContext = {
      projectId,
      scanType,
      contextId,
      triggeredBy: 'scheduled',
    };

    await recordScanExecution(context, {
      success: result.success,
      executionTimeMs,
      findingsCount: result.findingsCount,
      error: result.error,
    });

    // Remove from schedule
    removeScanFromSchedule(projectId, scanType, contextId);

    // Generate new prediction for next cycle
    await generateScanPrediction(projectId, scanType, contextId);

    return { success: result.success, error: result.error };
  } catch (error) {
    const executionTimeMs = Date.now() - startTime;

    // Record failure
    const context: ScanExecutionContext = {
      projectId,
      scanType,
      contextId,
      triggeredBy: 'scheduled',
    };

    await recordScanExecution(context, {
      success: false,
      executionTimeMs,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Process due scans (background job)
 */
export async function processDueScans(
  projectId: string,
  executor: (scanType: string, contextId?: string) => Promise<{ success: boolean; findingsCount?: number; error?: string }>
): Promise<{ processed: number; succeeded: number; failed: number }> {
  const dueScans = getDueScans(projectId);

  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  for (const scan of dueScans) {
    const result = await executeScheduledScan(
      projectId,
      scan.scanType,
      scan.contextId,
      executor
    );

    processed++;

    if (result.success) {
      succeeded++;
    } else {
      failed++;
    }
  }

  return { processed, succeeded, failed };
}

/**
 * Clear all scheduled scans for a project
 */
export function clearSchedule(projectId: string): void {
  scheduledScans.delete(projectId);
}

/**
 * Get schedule statistics
 */
export function getScheduleStats(projectId: string) {
  const scans = getScheduledScans(projectId);
  const now = new Date();

  const stats = {
    totalScheduled: scans.length,
    due: scans.filter((s) => s.scheduledFor <= now).length,
    upcoming: scans.filter((s) => s.scheduledFor > now).length,
    byPriority: {
      immediate: scans.filter((s) => s.priority >= 80).length,
      high: scans.filter((s) => s.priority >= 60 && s.priority < 80).length,
      medium: scans.filter((s) => s.priority >= 40 && s.priority < 60).length,
      low: scans.filter((s) => s.priority < 40).length,
    },
    byScanType: {} as Record<string, number>,
  };

  scans.forEach((s) => {
    stats.byScanType[s.scanType] = (stats.byScanType[s.scanType] || 0) + 1;
  });

  return stats;
}

/**
 * Add manual scan to queue
 */
export async function scheduleManualScan(
  projectId: string,
  scanType: string,
  contextId?: string,
  scheduledFor?: Date
): Promise<ScheduledScan> {
  // Generate prediction for priority
  const prediction = await generateScanPrediction(projectId, scanType, contextId);

  const scheduled: ScheduledScan = {
    scanType,
    contextId,
    scheduledFor: scheduledFor || new Date(),
    priority: prediction.priority_score,
    predictionId: prediction.id,
  };

  const scans = scheduledScans.get(projectId) || [];
  scans.push(scheduled);
  scheduledScans.set(projectId, scans);

  markRecommendationScheduled(prediction.id);

  return scheduled;
}
