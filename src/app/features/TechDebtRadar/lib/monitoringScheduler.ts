/**
 * Continuous Monitoring Scheduler for Technical Debt
 * Automatically runs periodic scans and tracks debt trends
 */

import { techDebtDb, scanDb } from '@/app/db';
import { scanProjectForTechDebt, prepareIssuesForDatabase } from './techDebtScanner';
import type { TechDebtScanConfig } from '@/app/db/models/tech-debt.types';

/**
 * Scheduler configuration
 */
interface SchedulerConfig {
  projectId: string;
  interval: 'daily' | 'weekly' | 'monthly';
  autoCreateBacklog: boolean;
  notifyOnCritical: boolean;
}

/**
 * Scheduler state management
 */
const activeSchedulers = new Map<string, NodeJS.Timeout>();

/**
 * Start continuous monitoring for a project
 */
export function startMonitoring(config: SchedulerConfig): void {
  const key = `${config.projectId}-${config.interval}`;

  // Clear existing scheduler if any
  if (activeSchedulers.has(key)) {
    stopMonitoring(config.projectId, config.interval);
  }

  // Calculate interval in milliseconds
  const intervalMs = getIntervalMs(config.interval);

  // Schedule periodic scans
  const timerId = setInterval(async () => {
    await runScheduledScan(config);
  }, intervalMs);

  activeSchedulers.set(key, timerId);

  console.log(`[TechDebt] Started monitoring for project ${config.projectId} (${config.interval})`);
}

/**
 * Stop continuous monitoring for a project
 */
export function stopMonitoring(projectId: string, interval: 'daily' | 'weekly' | 'monthly'): void {
  const key = `${projectId}-${interval}`;

  const timerId = activeSchedulers.get(key);
  if (timerId) {
    clearInterval(timerId);
    activeSchedulers.delete(key);
    console.log(`[TechDebt] Stopped monitoring for project ${projectId} (${interval})`);
  }
}

/**
 * Run a scheduled scan
 */
async function runScheduledScan(config: SchedulerConfig): Promise<void> {
  console.log(`[TechDebt] Running scheduled scan for project ${config.projectId}`);

  try {
    // Create scan record
    const scanId = `scan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    scanDb.createScan({
      id: scanId,
      project_id: config.projectId,
      scan_type: 'tech_debt_scheduled',
      summary: `Scheduled tech debt scan (${config.interval})`,
      input_tokens: null,
      output_tokens: null
    });

    // Configure and run scan
    const scanConfig: TechDebtScanConfig = {
      projectId: config.projectId,
      scanTypes: [
        'code_quality',
        'security',
        'performance',
        'testing',
        'documentation',
        'dependencies',
        'architecture',
        'maintainability',
        'accessibility'
      ],
      maxItems: 100,
      autoCreateBacklog: config.autoCreateBacklog
    };

    const detectedIssues = await scanProjectForTechDebt(scanConfig);
    const techDebtItems = prepareIssuesForDatabase(detectedIssues, config.projectId, scanId);

    // Insert into database
    const createdItems = techDebtItems.map((item) => techDebtDb.createTechDebt(item));

    console.log(`[TechDebt] Scan complete: ${createdItems.length} items detected`);

    // Auto-create backlog items for critical/high severity
    if (config.autoCreateBacklog) {
      const { backlogDb } = await import('@/app/db');

      for (const item of createdItems) {
        if (item.severity === 'critical' || item.severity === 'high') {
          const backlogId = `backlog-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

          backlogDb.createBacklogItem({
            id: backlogId,
            project_id: config.projectId,
            goal_id: null,
            agent: 'developer',
            title: `[Tech Debt] ${item.title}`,
            description: item.description,
            status: 'pending',
            type: 'custom',
            impacted_files: item.file_paths ? JSON.parse(item.file_paths).map((path: string) => ({
              path,
              changeType: 'modify',
              description: 'Address technical debt'
            })) : []
          });

          techDebtDb.updateTechDebt(item.id, {
            backlog_item_id: backlogId
          });
        }
      }
    }

    // Send notifications for critical items
    if (config.notifyOnCritical) {
      const criticalItems = createdItems.filter((item) => item.severity === 'critical');
      if (criticalItems.length > 0) {
        await notifyCriticalIssues(config.projectId, criticalItems.length);
      }
    }
  } catch (error) {
    console.error(`[TechDebt] Error running scheduled scan:`, error);
  }
}

/**
 * Notify about critical issues (placeholder for future implementation)
 */
async function notifyCriticalIssues(projectId: string, count: number): Promise<void> {
  console.log(`[TechDebt] ALERT: ${count} critical tech debt items detected for project ${projectId}`);

  // Future: Send email, Slack notification, or create event log
  const { eventDb } = await import('@/app/db');

  eventDb.createEvent({
    id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    project_id: projectId,
    title: 'Critical Tech Debt Detected',
    description: `${count} critical technical debt items require immediate attention`,
    type: 'warning',
    agent: 'tech_debt_monitor',
    message: `Automated scan detected ${count} critical issues. Review Tech Debt Radar for details.`
  });
}

/**
 * Get interval in milliseconds
 */
function getIntervalMs(interval: 'daily' | 'weekly' | 'monthly'): number {
  switch (interval) {
    case 'daily':
      return 24 * 60 * 60 * 1000; // 24 hours
    case 'weekly':
      return 7 * 24 * 60 * 60 * 1000; // 7 days
    case 'monthly':
      return 30 * 24 * 60 * 60 * 1000; // 30 days
  }
}

/**
 * Get active schedulers status
 */
export function getSchedulerStatus(): Array<{
  projectId: string;
  interval: string;
  active: boolean;
}> {
  const status: Array<{ projectId: string; interval: string; active: boolean }> = [];

  for (const [key, timerId] of activeSchedulers.entries()) {
    const [projectId, interval] = key.split('-');
    status.push({
      projectId,
      interval,
      active: true
    });
  }

  return status;
}

/**
 * Cleanup all schedulers (call on shutdown)
 */
export function cleanupSchedulers(): void {
  for (const [key, timerId] of activeSchedulers.entries()) {
    clearInterval(timerId);
  }
  activeSchedulers.clear();
  console.log('[TechDebt] All schedulers stopped');
}
