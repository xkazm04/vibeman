/**
 * Scan Queue Background Worker
 * Processes queued scans with progress tracking and notifications
 */

import { scanQueueDb, ideaDb } from '@/app/db';
import { DbScanQueueItem } from '@/app/db/models/types';
import { executeContextScan } from '@/app/features/Ideas/sub_IdeasSetup/lib/scanHandlers';
import { ScanType, getScanTypeName } from '@/app/features/Ideas/lib/scanTypes';
import { SupportedProvider } from '@/lib/llm/types';
import { contextRepository } from '@/app/db/repositories/context.repository';
import { generateNotificationId } from '@/lib/idGenerator';

interface WorkerConfig {
  pollIntervalMs: number;
  maxConcurrent: number;
  provider: SupportedProvider;
}

// Adaptive polling intervals for exponential backoff when queue is empty
// Reduces idle CPU usage while maintaining responsiveness during active periods
const ADAPTIVE_POLL_INTERVALS = {
  BASE_MS: 5000,      // 5 seconds - used when items found or first poll
  LEVEL_1_MS: 10000,  // 10 seconds - after 1 empty poll
  LEVEL_2_MS: 30000,  // 30 seconds - after 2 empty polls
  MAX_MS: 60000,      // 60 seconds - maximum backoff
} as const;

type NotificationType = 'scan_started' | 'scan_completed' | 'scan_failed' | 'auto_merge_completed';

interface NotificationData {
  [key: string]: unknown;
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
    pollIntervalMs: ADAPTIVE_POLL_INTERVALS.BASE_MS, // Base poll interval
    maxConcurrent: 1, // Process one scan at a time by default
    provider: 'gemini' // Default provider
  };

  // Adaptive polling state - tracks consecutive empty polls for backoff
  private consecutiveEmptyPolls = 0;

  /**
   * Generate a unique notification ID
   * Uses shared idGenerator for consistency
   */
  private generateNotificationId(): string {
    return generateNotificationId();
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

    // Reset adaptive polling state on start
    this.consecutiveEmptyPolls = 0;

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
   * Get adaptive poll interval based on consecutive empty polls
   * Implements exponential backoff: 5s -> 10s -> 30s -> 60s
   * Resets to base interval when items are found
   */
  private getAdaptivePollInterval(): number {
    switch (this.consecutiveEmptyPolls) {
      case 0:
        return ADAPTIVE_POLL_INTERVALS.BASE_MS;
      case 1:
        return ADAPTIVE_POLL_INTERVALS.LEVEL_1_MS;
      case 2:
        return ADAPTIVE_POLL_INTERVALS.LEVEL_2_MS;
      default:
        return ADAPTIVE_POLL_INTERVALS.MAX_MS;
    }
  }

  /**
   * Reset adaptive polling to base interval (called when work is found)
   */
  private resetAdaptivePolling(): void {
    this.consecutiveEmptyPolls = 0;
  }

  /**
   * Increment backoff level for adaptive polling (called when queue is empty)
   */
  private incrementBackoff(): void {
    // Cap at 3 to stay at MAX_MS level
    if (this.consecutiveEmptyPolls < 3) {
      this.consecutiveEmptyPolls++;
    }
  }

  /**
   * Poll for pending queue items
   * Uses adaptive polling intervals based on queue activity
   */
  private poll(): void {
    if (!this.isRunning) {
      return;
    }

    // Process queue and track if items were found
    this.processQueue()
      .then((itemsFound) => {
        if (itemsFound) {
          // Reset to base interval when work is found
          this.resetAdaptivePolling();
        } else {
          // Increase backoff when queue is empty
          this.incrementBackoff();
        }
      })
      .catch(() => {
        // Error handled in processQueue, but don't increase backoff on errors
      });

    // Schedule next poll with adaptive interval
    const nextInterval = this.getAdaptivePollInterval();
    this.pollTimer = setTimeout(() => this.poll(), nextInterval);
  }

  /**
   * Process the scan queue
   * Uses atomic claim to prevent race conditions between poll cycles
   * @returns true if items were found and processed, false if queue was empty
   */
  private async processQueue(): Promise<boolean> {
    // Check if we can process more items
    if (this.currentlyProcessing.size >= this.config.maxConcurrent) {
      // Already at max capacity - consider this as "active" to maintain responsiveness
      return true;
    }

    // Atomically claim the next pending item
    // This prevents race conditions where multiple poll cycles claim the same item
    const queueItem = scanQueueDb.claimNextPending();

    if (!queueItem) {
      return false; // No pending items - queue is empty
    }

    // Track that we're processing this item
    this.currentlyProcessing.add(queueItem.id);

    try {
      // Process the item (status already set to 'running' by claimNextPending)
      await this.processQueueItem(queueItem);
    } catch (error) {
      // Errors are handled in processQueueItem, but ensure we don't leave items stuck
      // If processQueueItem failed to update status, mark as failed
      try {
        const currentItem = scanQueueDb.getQueueItemById(queueItem.id);
        if (currentItem && currentItem.status === 'running') {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          scanQueueDb.updateStatus(queueItem.id, 'failed', `Worker error: ${errorMessage}`);
        }
      } catch {
        // Best effort - database might be unavailable
      }
    } finally {
      // Always clean up the processing set to prevent items getting stuck
      this.currentlyProcessing.delete(queueItem.id);
    }

    return true; // Item was found and processed
  }

  /**
   * Process a single queue item
   * Note: Status is already set to 'running' by claimNextPending()
   */
  private async processQueueItem(queueItem: DbScanQueueItem): Promise<void> {
    try {
      // Status already set to 'running' by claimNextPending(), just update progress
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

      // Get ideas from this project to find the latest scan ID
      const projectIdeas = ideaDb.getIdeasByProject(queueItem.project_id);
      const relevantIdeas = projectIdeas.filter(idea => idea.scan_type === queueItem.scan_type);
      const latestScanId = relevantIdeas.length > 0 ? relevantIdeas[0].scan_id : null;

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
   * Implements transaction-like behavior: tracks successful updates and rolls back on failure
   */
  private async handleAutoMerge(queueItem: DbScanQueueItem): Promise<void> {
    try {
      scanQueueDb.updateAutoMergeStatus(queueItem.id, 'in_progress');

      // Get all ideas from the scan
      if (!queueItem.scan_id) {
        throw new Error('No scan ID available for auto-merge');
      }

      const allProjectIdeas = ideaDb.getIdeasByProject(queueItem.project_id);
      const ideas = allProjectIdeas.filter(idea => idea.scan_id === queueItem.scan_id);

      // Filter ideas that qualify for auto-accept (high-impact, low-effort)
      const eligibleIdeas = ideas.filter(idea => idea.impact === 3 && idea.effort === 1);

      // Track successful updates for potential rollback
      const successfullyUpdatedIds: string[] = [];
      const failedUpdates: { id: string; title: string; error: string }[] = [];

      // Auto-accept high-impact, low-effort ideas with error checking
      for (const idea of eligibleIdeas) {
        try {
          const result = ideaDb.updateIdea(idea.id, { status: 'accepted' });

          if (result === null) {
            // Update failed - idea may not exist or database lock occurred
            failedUpdates.push({
              id: idea.id,
              title: idea.title,
              error: 'Update returned null - row not affected'
            });
          } else {
            successfullyUpdatedIds.push(idea.id);
          }
        } catch (updateError) {
          // Catch any database errors during individual update
          const errorMsg = updateError instanceof Error ? updateError.message : 'Unknown error';
          failedUpdates.push({
            id: idea.id,
            title: idea.title,
            error: errorMsg
          });
        }
      }

      // Determine final status based on update results
      const totalEligible = eligibleIdeas.length;
      const successCount = successfullyUpdatedIds.length;
      const failCount = failedUpdates.length;

      if (totalEligible === 0) {
        // No eligible ideas - complete with informative status
        scanQueueDb.updateAutoMergeStatus(queueItem.id, 'completed: no eligible ideas');
      } else if (failCount === 0) {
        // All updates succeeded
        scanQueueDb.updateAutoMergeStatus(queueItem.id, 'completed');

        if (successCount > 0) {
          this.createNotification(
            queueItem,
            'auto_merge_completed',
            'Auto-merge completed',
            `Auto-accepted ${successCount} high-impact, low-effort ideas`,
            {
              autoAcceptedCount: successCount,
              scanId: queueItem.scan_id
            }
          );
        }
      } else if (successCount === 0) {
        // All updates failed - rollback not needed, mark as failed
        const errorDetails = failedUpdates.map(f => `${f.title}: ${f.error}`).join('; ');
        throw new Error(`All ${failCount} auto-merge updates failed: ${errorDetails}`);
      } else {
        // Partial failure - rollback successful updates to maintain consistency
        let rollbackSuccessCount = 0;
        for (const ideaId of successfullyUpdatedIds) {
          try {
            const rollbackResult = ideaDb.updateIdea(ideaId, { status: 'pending' });
            if (rollbackResult !== null) {
              rollbackSuccessCount++;
            }
          } catch {
            // Best effort rollback - log but continue
          }
        }

        const errorDetails = failedUpdates.slice(0, 3).map(f => f.title).join(', ');
        const rollbackInfo = rollbackSuccessCount > 0
          ? ` (rolled back ${rollbackSuccessCount} successful updates)`
          : '';
        throw new Error(
          `Partial failure: ${successCount}/${totalEligible} succeeded, ` +
          `${failCount} failed (${errorDetails})${rollbackInfo}`
        );
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      scanQueueDb.updateAutoMergeStatus(queueItem.id, `failed: ${errorMessage}`);
    }
  }

  /**
   * Get human-readable scan type name
   * Uses centralized config from scanTypes.ts
   */
  private getScanTypeName(scanType: string): string {
    return getScanTypeName(scanType as ScanType);
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
    adaptivePolling: {
      consecutiveEmptyPolls: number;
      currentIntervalMs: number;
    };
  } {
    return {
      isRunning: this.isRunning,
      currentlyProcessing: this.currentlyProcessing.size,
      config: this.config,
      adaptivePolling: {
        consecutiveEmptyPolls: this.consecutiveEmptyPolls,
        currentIntervalMs: this.getAdaptivePollInterval(),
      },
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
