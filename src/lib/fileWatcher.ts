/**
 * File Watcher System
 * Monitors file changes and auto-enqueues scans based on configuration
 */

import * as path from 'path';
import chokidar, { FSWatcher } from 'chokidar';
import { scanQueueRepository } from '@/app/db/repositories/scanQueue.repository';
import { DbFileWatchConfig } from '@/app/db/models/types';
import { ScanType } from '@/app/features/Ideas/lib/scanTypes';
import { generateId, generateNotificationId } from '@/lib/idGenerator';
import { scanQueueWorker } from '@/lib/scanQueueWorker';
import { projectDb } from '@/lib/project_database';

type FileChangeType = 'add' | 'change' | 'delete';

interface WatcherInstance {
  watcher: FSWatcher;
  config: DbFileWatchConfig;
}

export class FileWatcherManager {
  private watchers: Map<string, WatcherInstance> = new Map();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  // Per-project accumulator of every file touched during the current debounce
  // burst (filePath → latest change type). Aggregating the WHOLE burst — not
  // just the last event — lets a single queue item carry all changed files.
  private pendingChanges: Map<string, Map<string, FileChangeType>> = new Map();

  /**
   * Rehydrate watchers for every ENABLED file_watch_config at server boot.
   *
   * The manager is an in-process singleton that dies with the Node process, so
   * without this a configured watcher silently stays dead after a restart. Called
   * from schema.postinit (via require) alongside the scan-queue worker boot-start.
   * Returns the number of watchers actually started.
   */
  rehydrateWatchers(): number {
    let started = 0;
    try {
      const configs = scanQueueRepository.getAllEnabledFileWatchConfigs();
      for (const config of configs) {
        const project = projectDb.projects.get(config.project_id);
        if (!project?.path) {
          console.warn(`[fileWatcher] Skipping rehydrate for ${config.project_id}: no project path`);
          continue;
        }
        if (this.startWatching(config.project_id, project.path)) {
          started++;
        }
      }
    } catch (error) {
      console.warn('[fileWatcher] Rehydrate failed (non-fatal):', error instanceof Error ? error.message : error);
    }
    return started;
  }

  /**
   * Start watching a project based on its file watch config
   */
  startWatching(projectId: string, projectPath: string): boolean {
    try {
      // Get file watch config from database
      const config = scanQueueRepository.getFileWatchConfig(projectId);

      if (!config) {
        console.log(`No file watch config found for project ${projectId}`);
        return false;
      }

      if (!config.enabled) {
        console.log(`File watch disabled for project ${projectId}`);
        return false;
      }

      // Stop existing watcher if any
      this.stopWatching(projectId);

      // Parse patterns
      const watchPatterns = JSON.parse(config.watch_patterns) as string[];
      const ignorePatterns = config.ignore_patterns
        ? JSON.parse(config.ignore_patterns) as string[]
        : ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**'];

      // Create full paths for watch patterns
      const fullWatchPatterns = watchPatterns.map(pattern =>
        path.join(projectPath, pattern)
      );

      console.log(`Starting file watcher for project ${projectId}`);
      console.log(`Watching patterns:`, watchPatterns);
      console.log(`Ignoring patterns:`, ignorePatterns);

      // Create chokidar watcher
      const watcher = chokidar.watch(fullWatchPatterns, {
        ignored: ignorePatterns,
        persistent: true,
        ignoreInitial: true, // Don't trigger on initial scan
        awaitWriteFinish: {
          stabilityThreshold: 300,
          pollInterval: 100
        }
      });

      // Set up event handlers
      watcher
        .on('add', (path) => this.handleFileChange(projectId, 'add', path, config))
        .on('change', (path) => this.handleFileChange(projectId, 'change', path, config))
        .on('unlink', (path) => this.handleFileChange(projectId, 'delete', path, config))
        .on('error', (error) => console.error(`File watcher error for ${projectId}:`, error));

      // Store watcher instance
      this.watchers.set(projectId, { watcher, config });

      console.log(`File watcher started for project ${projectId}`);
      return true;
    } catch (error) {
      console.error(`Failed to start file watcher for project ${projectId}:`, error);
      return false;
    }
  }

  /**
   * Stop watching a project
   */
  async stopWatching(projectId: string): Promise<void> {
    const instance = this.watchers.get(projectId);
    if (instance) {
      await instance.watcher.close();
      this.watchers.delete(projectId);

      // Clear any pending debounce timer and dropped-on-the-floor burst state
      const timer = this.debounceTimers.get(projectId);
      if (timer) {
        clearTimeout(timer);
        this.debounceTimers.delete(projectId);
      }
      this.pendingChanges.delete(projectId);

      console.log(`File watcher stopped for project ${projectId}`);
    }
  }

  /**
   * Handle file change event with debouncing.
   *
   * Every event in the burst is accumulated into `pendingChanges` (keyed by file
   * path, last change type wins) rather than overwriting a single captured path.
   * When the debounce window elapses the WHOLE set is handed to triggerScans, so
   * one queue item carries every file the burst touched — previously only the
   * last event's file survived and the rest were lost.
   */
  private handleFileChange(
    projectId: string,
    changeType: FileChangeType,
    filePath: string,
    config: DbFileWatchConfig
  ): void {
    console.log(`File ${changeType}: ${filePath} in project ${projectId}`);

    // Accumulate this file into the current burst.
    let pending = this.pendingChanges.get(projectId);
    if (!pending) {
      pending = new Map();
      this.pendingChanges.set(projectId, pending);
    }
    pending.set(filePath, changeType);

    // Reset the debounce timer — the burst extends until edits stop.
    const existingTimer = this.debounceTimers.get(projectId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      this.debounceTimers.delete(projectId);
      const changes = this.pendingChanges.get(projectId);
      this.pendingChanges.delete(projectId);
      if (changes && changes.size > 0) {
        this.triggerScans(projectId, changes, config);
      }
    }, config.debounce_ms);

    this.debounceTimers.set(projectId, timer);
  }

  /**
   * Trigger scans for one debounced burst of file changes.
   *
   * `changes` is the aggregated set of every file touched during the burst. Each
   * configured scan type becomes ONE queue item whose trigger_metadata lists ALL
   * of those files, so the downstream scan can (later) narrow to the changed set.
   */
  private triggerScans(
    projectId: string,
    changes: Map<string, FileChangeType>,
    config: DbFileWatchConfig
  ): void {
    try {
      const scanTypes = JSON.parse(config.scan_types) as ScanType[];

      const files = Array.from(changes.keys());
      const changeTypes = Array.from(new Set(changes.values()));

      console.log(`Triggering ${scanTypes.length} scans for project ${projectId} due to ${files.length} changed file(s)`);

      // Create queue items for each scan type
      const queueIds: string[] = [];
      for (const scanType of scanTypes) {
        const queueId = generateId('auto');
        queueIds.push(queueId);

        scanQueueRepository.createQueueItem({
          id: queueId,
          project_id: projectId,
          scan_type: scanType,
          trigger_type: 'file_change',
          trigger_metadata: {
            changeTypes,
            files,                 // ALL files touched in the burst, not just the last
            fileCount: files.length,
            timestamp: new Date().toISOString()
          },
          priority: 1 // Auto-triggered scans have default priority
          // auto_merge_enabled is intentionally omitted → defaults to 0. A file
          // watcher must NEVER auto-accept ideas; only an explicit per-run UI
          // toggle may enable auto-merge. Cost control for unchanged contexts is
          // the round-1 content-hash drift gate (the worker runs force=false), NOT
          // auto-merge.
        });

        console.log(`Queued ${scanType} scan (ID: ${queueId}) for project ${projectId}`);
      }

      // Wake the queue worker so these auto-scans run immediately. Without this,
      // file-change scans sit in 'queued' until something else starts the worker
      // (it is only started by a POST /api/scan-queue/worker) or, if already
      // running, until the next adaptive poll (up to 60s). start() is idempotent.
      if (scanTypes.length > 0) {
        scanQueueWorker.start();
        scanQueueWorker.notifyNewItem();
      }

      // Create notification for user, tied to a real queue item. scan_notifications
      // .queue_item_id is a NOT NULL FK to scan_queue(id), so the old literal
      // 'file-watch-trigger' violated the constraint and the insert was silently
      // swallowed — the user never saw the "N scan(s) queued" notification.
      if (queueIds.length > 0) {
        const notificationId = generateNotificationId();
        scanQueueRepository.createNotification({
          id: notificationId,
          queue_item_id: queueIds[0],
          project_id: projectId,
          notification_type: 'scan_started',
          title: 'Auto-scan triggered',
          message: `${files.length} file change(s) detected. ${scanTypes.length} scan(s) queued.`,
          data: {
            changeTypes,
            files,
            scanTypes
          }
        });
      }
    } catch (error) {
      console.error(`Failed to trigger scans for project ${projectId}:`, error);
    }
  }

  /**
   * Reload watcher configuration for a project
   */
  async reloadConfig(projectId: string, projectPath: string): Promise<boolean> {
    await this.stopWatching(projectId);
    return this.startWatching(projectId, projectPath);
  }

  /**
   * Get watcher status for a project
   */
  isWatching(projectId: string): boolean {
    return this.watchers.has(projectId);
  }

  /**
   * Stop all watchers
   */
  async stopAll(): Promise<void> {
    const projectIds = Array.from(this.watchers.keys());
    for (const projectId of projectIds) {
      await this.stopWatching(projectId);
    }
  }
}

// Singleton instance
export const fileWatcherManager = new FileWatcherManager();

// Cleanup on process exit
if (typeof process !== 'undefined') {
  process.on('exit', () => {
    fileWatcherManager.stopAll();
  });

  process.on('SIGINT', async () => {
    await fileWatcherManager.stopAll();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await fileWatcherManager.stopAll();
    process.exit(0);
  });
}
