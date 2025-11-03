/**
 * Scan Queue Background Worker
 * Processes queued scans with progress tracking and notifications
 */

import { scanQueueDb, ideaDb } from '@/app/db';
import { DbScanQueueItem } from '@/app/db/models/types';
import { executeContextScan } from '@/app/features/Ideas/sub_IdeasSetup/lib/scanHandlers';
import { ScanType } from '@/app/features/Ideas/lib/scanTypes';
import { SupportedProvider } from '@/lib/llm/types';
import { contextRepository } from '@/app/db/repositories/context.repository';

interface WorkerConfig {
  pollIntervalMs: number;
  maxConcurrent: number;
  provider: SupportedProvider;
}

type NotificationType = 'scan_started' | 'scan_completed' | 'scan_failed' | 'auto_merge_completed';

interface NotificationData {
  scanType?: string;
  contextId?: string | null;
  ideaCount?: number;
  scanId?: string | null;
  error?: string;
  autoAcceptedCount?: number;
}

class ScanQueueWorker {
  private isRunning = false;
  private pollTimer: NodeJS.Timeout | null = null;
  private currentlyProcessing: Set<string> = new Set();
  private config: WorkerConfig = {
    pollIntervalMs: 5000, // Poll every 5 seconds
    maxConcurrent: 1, // Process one scan at a time by default
    provider: 'gemini' // Default provider
  };

  /**
   * Generate a unique notification ID
   */
  private generateNotificationId(): string {
    return `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create a notification for a queue item
   */
  private createNotification(
    queueItem: DbScanQueueItem,
    notificationType: NotificationType,
    title: string,
    message: string,
    data: NotificationData
  ): void {
    scanQueueDb.createNotification({
      id: this.generateNotificationId(),
      queue_item_id: queueItem.id,
      project_id: queueItem.project_id,
      notification_type: notificationType,
      title,
      message,
      data
    });
  }

  /**
   * Start the worker
   */
  start(config?: Partial<WorkerConfig>): void {
    if (this.isRunning) {
      return;
    }

    // Update config
    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.isRunning = true;

    // Start polling
    this.poll();
  }

  /**
   * Stop the worker
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }

  /**
   * Update worker configuration
   */
  updateConfig(config: Partial<WorkerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Poll for pending queue items
   */
  private poll(): void {
    if (!this.isRunning) {
      return;
    }

    // Process queue
    this.processQueue().catch(() => {
      // Error handled in processQueue
    });

    // Schedule next poll
    this.pollTimer = setTimeout(() => this.poll(), this.config.pollIntervalMs);
  }

  /**
   * Process the scan queue
   */
  private async processQueue(): Promise<void> {
    try {
      // Check if we can process more items
      if (this.currentlyProcessing.size >= this.config.maxConcurrent) {
        return;
      }

      // Get next pending item
      const queueItem = scanQueueDb.getNextPending();

      if (!queueItem) {
        return; // No pending items
      }

      // Check if already processing
      if (this.currentlyProcessing.has(queueItem.id)) {
        return;
      }

      // Process the item
      this.currentlyProcessing.add(queueItem.id);
      await this.processQueueItem(queueItem);
      this.currentlyProcessing.delete(queueItem.id);
    } catch (error) {
      // Silent error - errors are handled in processQueueItem
    }
  }

  /**
   * Process a single queue item
   */
  private async processQueueItem(queueItem: DbScanQueueItem): Promise<void> {
    try {
      // Update status to running
      scanQueueDb.updateStatus(queueItem.id, 'running');
      scanQueueDb.updateProgress(queueItem.id, 0, 'Starting scan...', 'initialize', 4);

      // Create notification for scan started
      this.createNotification(
        queueItem,
        'scan_started',
        'Scan started',
        `${this.getScanTypeName(queueItem.scan_type)} scan is now running`,
        {
          scanType: queueItem.scan_type,
          contextId: queueItem.context_id
        }
      );

      // Get project info (simplified - you'll need to get this from project store/db)
      const projectInfo = await this.getProjectInfo(queueItem.project_id);

      // Update progress: gathering files
      scanQueueDb.updateProgress(queueItem.id, 25, 'Gathering codebase files...', 'gather_files', 4);

      // Get context file paths if context_id is specified
      let contextFilePaths: string[] | undefined;
      if (queueItem.context_id) {
        const context = contextRepository.getContextById(queueItem.context_id);
        if (context) {
          contextFilePaths = JSON.parse(context.file_paths);
        }
      }

      // Update progress: executing scan
      scanQueueDb.updateProgress(queueItem.id, 50, 'Analyzing code with AI...', 'execute_scan', 4);

      // Execute the scan
      const ideaCount = await executeContextScan({
        projectId: queueItem.project_id,
        projectName: projectInfo.name,
        projectPath: projectInfo.path,
        scanType: queueItem.scan_type as ScanType,
        provider: this.config.provider,
        contextId: queueItem.context_id || undefined,
        contextFilePaths
      });

      // Update progress: processing results
      scanQueueDb.updateProgress(queueItem.id, 75, 'Processing scan results...', 'process_results', 4);

      // Get the most recent scan for this project and type
      const scans = await ideaDb.getIdeasByScanType(queueItem.project_id, queueItem.scan_type);
      const latestScanId = scans.length > 0 ? scans[0].scan_id : null;

      // Link the scan to the queue item
      if (latestScanId) {
        scanQueueDb.linkScan(queueItem.id, latestScanId, `Generated ${ideaCount} ideas`);
      }

      // Update progress: finalizing
      scanQueueDb.updateProgress(queueItem.id, 100, 'Scan completed successfully', 'complete', 4);

      // Update status to completed
      scanQueueDb.updateStatus(queueItem.id, 'completed');

      // Create completion notification
      this.createNotification(
        queueItem,
        'scan_completed',
        'Scan completed',
        `${this.getScanTypeName(queueItem.scan_type)} scan generated ${ideaCount} ideas`,
        {
          scanType: queueItem.scan_type,
          ideaCount,
          scanId: latestScanId
        }
      );

      // Handle auto-merge if enabled
      if (queueItem.auto_merge_enabled) {
        await this.handleAutoMerge(queueItem);
      }
    } catch (error) {
      // Update status to failed
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      scanQueueDb.updateStatus(queueItem.id, 'failed', errorMessage);
      scanQueueDb.updateProgress(queueItem.id, 0, `Failed: ${errorMessage}`, 'error', 4);

      // Create failure notification
      this.createNotification(
        queueItem,
        'scan_failed',
        'Scan failed',
        `${this.getScanTypeName(queueItem.scan_type)} scan failed: ${errorMessage}`,
        {
          scanType: queueItem.scan_type,
          error: errorMessage
        }
      );
    }
  }

  /**
   * Handle auto-merge functionality
   */
  private async handleAutoMerge(queueItem: DbScanQueueItem): Promise<void> {
    try {
      scanQueueDb.updateAutoMergeStatus(queueItem.id, 'in_progress');

      // Get all ideas from the scan
      if (!queueItem.scan_id) {
        throw new Error('No scan ID available for auto-merge');
      }

      const ideas = await ideaDb.getIdeasByScan(queueItem.scan_id);

      // Auto-accept high-impact, low-effort ideas
      let autoAcceptedCount = 0;
      for (const idea of ideas) {
        if (idea.impact === 3 && idea.effort === 1) {
          ideaDb.updateStatus(idea.id, 'accepted');
          autoAcceptedCount++;
        }
      }

      scanQueueDb.updateAutoMergeStatus(queueItem.id, 'completed');

      // Create notification for auto-merge
      if (autoAcceptedCount > 0) {
        this.createNotification(
          queueItem,
          'auto_merge_completed',
          'Auto-merge completed',
          `Auto-accepted ${autoAcceptedCount} high-impact, low-effort ideas`,
          {
            autoAcceptedCount,
            scanId: queueItem.scan_id
          }
        );
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      scanQueueDb.updateAutoMergeStatus(queueItem.id, `failed: ${errorMessage}`);
    }
  }

  /**
   * Scan type display names mapping
   */
  private readonly SCAN_TYPE_NAMES: Readonly<Record<string, string>> = {
    zen_architect: 'Zen Architect',
    bug_hunter: 'Bug Hunter',
    perf_optimizer: 'Performance Optimizer',
    security_protector: 'Security Protector',
    insight_synth: 'Insight Synthesizer',
    ambiguity_guardian: 'Ambiguity Guardian',
    business_visionary: 'Business Visionary',
    ui_perfectionist: 'UI Perfectionist',
    feature_scout: 'Feature Scout',
    onboarding_optimizer: 'Onboarding Optimizer',
    ai_integration_scout: 'AI Integration Scout',
    delight_designer: 'Delight Designer'
  };

  /**
   * Get human-readable scan type name
   */
  private getScanTypeName(scanType: string): string {
    return this.SCAN_TYPE_NAMES[scanType] || scanType;
  }

  /**
   * Get project info (simplified - extend based on your project structure)
   */
  private async getProjectInfo(projectId: string): Promise<{ name: string; path: string }> {
    // In a real implementation, this would query your project database or store
    // For now, return a placeholder
    return {
      name: 'Project',
      path: process.cwd() // Fallback to current working directory
    };
  }

  /**
   * Get worker status
   */
  getStatus(): {
    isRunning: boolean;
    currentlyProcessing: number;
    config: WorkerConfig;
  } {
    return {
      isRunning: this.isRunning,
      currentlyProcessing: this.currentlyProcessing.size,
      config: this.config
    };
  }
}

// Singleton instance
export const scanQueueWorker = new ScanQueueWorker();

// Cleanup on process exit
if (typeof process !== 'undefined') {
  process.on('exit', () => {
    scanQueueWorker.stop();
  });

  process.on('SIGINT', () => {
    scanQueueWorker.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    scanQueueWorker.stop();
    process.exit(0);
  });
}
