/**
 * Task Cleanup Service
 * Handles automatic cleanup of expired task data with configurable TTL
 */

import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('TaskCleanupService');

export interface TaskCleanupConfig {
  /** TTL for completed tasks in milliseconds (default: 24 hours) */
  completedTaskTtl: number;
  /** TTL for failed tasks in milliseconds (default: 7 days) */
  failedTaskTtl: number;
  /** TTL for session data in milliseconds (default: 24 hours) */
  sessionDataTtl: number;
  /** How often to run cleanup in milliseconds (default: 1 hour) */
  cleanupInterval: number;
  /** Whether to enable automatic cleanup */
  autoCleanup: boolean;
}

export interface CleanupStats {
  tasksRemoved: number;
  sessionsRemoved: number;
  cacheEntriesRemoved: number;
  lastCleanup: Date | null;
  nextCleanup: Date | null;
}

export interface TaskData {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
  data?: unknown;
}

const DEFAULT_CLEANUP_CONFIG: TaskCleanupConfig = {
  completedTaskTtl: 24 * 60 * 60 * 1000,     // 24 hours
  failedTaskTtl: 7 * 24 * 60 * 60 * 1000,    // 7 days
  sessionDataTtl: 24 * 60 * 60 * 1000,       // 24 hours
  cleanupInterval: 60 * 60 * 1000,           // 1 hour
  autoCleanup: true,
};

export class TaskCleanupService {
  private config: TaskCleanupConfig;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private taskStore: Map<string, TaskData>;
  private stats: CleanupStats;

  constructor(config: Partial<TaskCleanupConfig> = {}) {
    this.config = { ...DEFAULT_CLEANUP_CONFIG, ...config };
    this.taskStore = new Map();
    this.stats = {
      tasksRemoved: 0,
      sessionsRemoved: 0,
      cacheEntriesRemoved: 0,
      lastCleanup: null,
      nextCleanup: null,
    };
  }

  /**
   * Start automatic cleanup service
   */
  start(): void {
    if (this.cleanupTimer) {
      logger.warn('Cleanup service already running');
      return;
    }

    if (!this.config.autoCleanup) {
      logger.info('Auto cleanup disabled');
      return;
    }

    this.cleanupTimer = setInterval(() => {
      this.runCleanup();
    }, this.config.cleanupInterval);

    this.stats.nextCleanup = new Date(Date.now() + this.config.cleanupInterval);
    logger.info('Task cleanup service started', {
      interval: this.config.cleanupInterval,
      nextCleanup: this.stats.nextCleanup,
    });
  }

  /**
   * Stop automatic cleanup service
   */
  stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
      this.stats.nextCleanup = null;
      logger.info('Task cleanup service stopped');
    }
  }

  /**
   * Run cleanup manually
   */
  runCleanup(): CleanupStats {
    const startTime = Date.now();
    let tasksRemoved = 0;

    const now = Date.now();

    for (const [id, task] of this.taskStore.entries()) {
      const age = now - task.updatedAt.getTime();
      let shouldRemove = false;

      switch (task.status) {
        case 'completed':
          shouldRemove = age > this.config.completedTaskTtl;
          break;
        case 'failed':
          shouldRemove = age > this.config.failedTaskTtl;
          break;
        case 'pending':
        case 'running':
          // Don't remove active tasks automatically
          break;
      }

      if (shouldRemove) {
        this.taskStore.delete(id);
        tasksRemoved++;
      }
    }

    this.stats.tasksRemoved += tasksRemoved;
    this.stats.lastCleanup = new Date();
    this.stats.nextCleanup = this.cleanupTimer
      ? new Date(Date.now() + this.config.cleanupInterval)
      : null;

    const duration = Date.now() - startTime;
    logger.info('Cleanup completed', {
      tasksRemoved,
      duration,
      remainingTasks: this.taskStore.size,
    });

    return { ...this.stats };
  }

  /**
   * Register a task for tracking
   */
  registerTask(id: string, status: TaskData['status'], data?: unknown): void {
    this.taskStore.set(id, {
      id,
      status,
      createdAt: new Date(),
      updatedAt: new Date(),
      data,
    });
  }

  /**
   * Update task status
   */
  updateTaskStatus(id: string, status: TaskData['status']): void {
    const task = this.taskStore.get(id);
    if (task) {
      task.status = status;
      task.updatedAt = new Date();
    }
  }

  /**
   * Get task by ID
   */
  getTask(id: string): TaskData | undefined {
    return this.taskStore.get(id);
  }

  /**
   * Remove a task immediately
   */
  removeTask(id: string): boolean {
    return this.taskStore.delete(id);
  }

  /**
   * Get all tasks with optional status filter
   */
  getTasks(status?: TaskData['status']): TaskData[] {
    const tasks = Array.from(this.taskStore.values());
    if (status) {
      return tasks.filter((t) => t.status === status);
    }
    return tasks;
  }

  /**
   * Get expired tasks without removing them
   */
  getExpiredTasks(): TaskData[] {
    const now = Date.now();
    const expired: TaskData[] = [];

    for (const task of this.taskStore.values()) {
      const age = now - task.updatedAt.getTime();
      let isExpired = false;

      switch (task.status) {
        case 'completed':
          isExpired = age > this.config.completedTaskTtl;
          break;
        case 'failed':
          isExpired = age > this.config.failedTaskTtl;
          break;
      }

      if (isExpired) {
        expired.push(task);
      }
    }

    return expired;
  }

  /**
   * Get cleanup statistics
   */
  getStats(): CleanupStats {
    return { ...this.stats };
  }

  /**
   * Get service configuration
   */
  getConfig(): TaskCleanupConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<TaskCleanupConfig>): void {
    const wasRunning = !!this.cleanupTimer;

    if (wasRunning) {
      this.stop();
    }

    this.config = { ...this.config, ...config };

    if (wasRunning && this.config.autoCleanup) {
      this.start();
    }
  }

  /**
   * Get count of active tasks
   */
  getActiveTaskCount(): number {
    let count = 0;
    for (const task of this.taskStore.values()) {
      if (task.status === 'pending' || task.status === 'running') {
        count++;
      }
    }
    return count;
  }

  /**
   * Clear all tasks (useful for testing)
   */
  clear(): void {
    this.taskStore.clear();
    this.stats = {
      tasksRemoved: 0,
      sessionsRemoved: 0,
      cacheEntriesRemoved: 0,
      lastCleanup: null,
      nextCleanup: this.cleanupTimer
        ? new Date(Date.now() + this.config.cleanupInterval)
        : null,
    };
  }
}

// Singleton instance
let globalCleanupService: TaskCleanupService | null = null;

/**
 * Get the global task cleanup service instance
 */
export function getTaskCleanupService(): TaskCleanupService {
  if (!globalCleanupService) {
    globalCleanupService = new TaskCleanupService();
  }
  return globalCleanupService;
}

/**
 * Reset the global cleanup service (useful for testing)
 */
export function resetTaskCleanupService(): void {
  if (globalCleanupService) {
    globalCleanupService.stop();
    globalCleanupService.clear();
  }
  globalCleanupService = null;
}
