/**
 * File Watcher System
 * Monitors file changes and auto-enqueues scans based on configuration
 */

import chokidar, { FSWatcher } from 'chokidar';
import { scanQueueDb } from '@/app/db';
import { DbFileWatchConfig } from '@/app/db/models/types';
import { ScanType } from '@/app/features/Ideas/lib/scanTypes';

interface WatcherInstance {
  watcher: FSWatcher;
  config: DbFileWatchConfig;
}

class FileWatcherManager {
  private watchers: Map<string, WatcherInstance> = new Map();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Start watching a project based on its file watch config
   */
  startWatching(projectId: string, projectPath: string): boolean {
    try {
      // Get file watch config from database
      const config = scanQueueDb.getFileWatchConfig(projectId);

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
        `${projectPath}/${pattern}`
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

      // Clear any pending debounce timer
      const timer = this.debounceTimers.get(projectId);
      if (timer) {
        clearTimeout(timer);
        this.debounceTimers.delete(projectId);
      }

      console.log(`File watcher stopped for project ${projectId}`);
    }
  }

  /**
   * Handle file change event with debouncing
   */
  private handleFileChange(
    projectId: string,
    changeType: 'add' | 'change' | 'delete',
    filePath: string,
    config: DbFileWatchConfig
  ): void {
    console.log(`File ${changeType}: ${filePath} in project ${projectId}`);

    // Clear existing debounce timer
    const existingTimer = this.debounceTimers.get(projectId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new debounce timer
    const timer = setTimeout(() => {
      this.triggerScans(projectId, changeType, filePath, config);
      this.debounceTimers.delete(projectId);
    }, config.debounce_ms);

    this.debounceTimers.set(projectId, timer);
  }

  /**
   * Trigger scans based on file watch config
   */
  private triggerScans(
    projectId: string,
    changeType: string,
    filePath: string,
    config: DbFileWatchConfig
  ): void {
    try {
      const scanTypes = JSON.parse(config.scan_types) as ScanType[];

      console.log(`Triggering ${scanTypes.length} scans for project ${projectId} due to file ${changeType}`);

      // Create queue items for each scan type
      for (const scanType of scanTypes) {
        const queueId = `auto-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        scanQueueDb.createQueueItem({
          id: queueId,
          project_id: projectId,
          scan_type: scanType,
          trigger_type: 'file_change',
          trigger_metadata: {
            changeType,
            files: [filePath],
            timestamp: new Date().toISOString()
          },
          priority: 1 // Auto-triggered scans have default priority
        });

        console.log(`Queued ${scanType} scan (ID: ${queueId}) for project ${projectId}`);
      }

      // Create notification for user
      const notificationId = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      scanQueueDb.createNotification({
        id: notificationId,
        queue_item_id: 'file-watch-trigger', // Generic ID for file watch notifications
        project_id: projectId,
        notification_type: 'scan_started',
        title: 'Auto-scan triggered',
        message: `File changes detected. ${scanTypes.length} scan(s) queued.`,
        data: {
          changeType,
          filePath,
          scanTypes
        }
      });
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
