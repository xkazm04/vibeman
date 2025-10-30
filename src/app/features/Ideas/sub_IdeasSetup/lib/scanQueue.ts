/**
 * Queue management logic for scan operations
 */

import { ScanType, QueueItem, ContextQueueItem } from '../../lib/scanTypes';
import { Context } from '@/lib/queries/contextQueries';

/**
 * Initialize scan queue with selected scan types
 */
export function initializeScanQueue(selectedScanTypes: ScanType[]): QueueItem[] {
  return selectedScanTypes.map(scanType => ({
    scanType,
    status: 'pending',
    ideaCount: 0
  }));
}

/**
 * Initialize context queue for batch scanning
 * Creates a cartesian product of contexts × scan types
 */
export function initializeContextQueue(contexts: Context[], selectedScanTypes: ScanType[]): ContextQueueItem[] {
  const allContexts = [
    {
      contextId: null,
      contextName: 'Full Project'
    },
    ...contexts.map(context => ({
      contextId: context.id,
      contextName: context.name
    }))
  ];

  // Create cartesian product: each context × each scan type
  const queue: ContextQueueItem[] = [];

  for (const context of allContexts) {
    for (const scanType of selectedScanTypes) {
      queue.push({
        contextId: context.contextId,
        contextName: context.contextName,
        scanType,
        status: 'pending',
        ideaCount: 0
      });
    }
  }

  return queue;
}

/**
 * Find the next pending item in a queue
 */
export function findNextPending<T extends { status: string }>(queue: T[]): number {
  return queue.findIndex(item => item.status === 'pending');
}

/**
 * Check if any item is currently running
 */
export function hasRunningItem<T extends { status: string }>(queue: T[]): boolean {
  return queue.some(item => item.status === 'running');
}

/**
 * Check if queue is complete (no pending or running items)
 */
export function isQueueComplete<T extends { status: string }>(queue: T[]): boolean {
  const pendingIndex = findNextPending(queue);
  const hasRunning = hasRunningItem(queue);
  return pendingIndex === -1 && !hasRunning;
}

/**
 * Calculate queue completion statistics
 */
export function calculateQueueStats<T extends { status: string }>(queue: T[]) {
  return {
    successCount: queue.filter(item => item.status === 'completed').length,
    failedCount: queue.filter(item => item.status === 'failed').length,
    total: queue.length
  };
}

/**
 * Update queue item status
 */
export function updateQueueItem<T>(queue: T[], index: number, updates: Partial<T>): T[] {
  const updatedQueue = [...queue];
  updatedQueue[index] = { ...updatedQueue[index], ...updates };
  return updatedQueue;
}
