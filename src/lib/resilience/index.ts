/**
 * Resilience Module
 *
 * Provides composable resilience strategies with layered fallbacks for
 * robust remote operation handling in agentic systems.
 *
 * ## The Observer-Sentinel Pattern
 *
 * In agentic systems, any communication channel can fail. The Observer-Sentinel
 * pattern addresses this by implementing multi-modal completion detection:
 *
 * 1. **SSE Streaming (Primary)**: Real-time updates via Server-Sent Events
 * 2. **Polling Fallback**: HTTP polling when streaming disconnects
 * 3. **File State (Sentinel)**: File system as durable event log
 *
 * Each layer compensates for the previous layer's failure, creating a
 * defensive architecture where completion is reliably detected.
 *
 * ## Usage Example
 *
 * ```typescript
 * import {
 *   createResilienceStrategy,
 *   createSSELayer,
 *   createPollingLayer,
 *   createFileStateLayer,
 * } from '@/lib/resilience';
 *
 * // Create strategy with three detection layers
 * const strategy = createResilienceStrategy('task-completion', 'Task Completion Detection', {
 *   timeout: 60000,
 *   onLayerSwitch: (from, to, reason) => {
 *     console.log(`Switching from ${from} to ${to}: ${reason}`);
 *   },
 * });
 *
 * // Layer 1: SSE streaming (primary)
 * strategy.addLayer(createSSELayer('sse', {
 *   url: `/api/tasks/${taskId}/stream`,
 *   completionEvent: 'result',
 * }));
 *
 * // Layer 2: Polling fallback
 * strategy.addLayer(createPollingLayer('polling', {
 *   url: `/api/tasks/${taskId}/status`,
 *   interval: 10000,
 *   isComplete: (data) => data.status === 'completed' || data.status === 'failed',
 * }));
 *
 * // Layer 3: File state sentinel
 * strategy.addLayer(createFileStateLayer('file-state', {
 *   checkFn: () => checkRequirementExists(projectPath, requirementName),
 *   absenceMeansComplete: true, // File deleted = task completed
 * }));
 *
 * // Execute the strategy
 * const result = await strategy.execute();
 *
 * if (result.success) {
 *   console.log(`Detected by ${result.successLayer}`);
 * } else {
 *   console.log(`Failed: ${Object.values(result.layerErrors).join(', ')}`);
 * }
 *
 * // Cleanup when done
 * strategy.cleanup();
 * ```
 *
 * ## Key Insights
 *
 * - **File state as sentinel**: Using file system state (e.g., requirement file
 *   deletion) as a completion signal is elegant because it's durable - survives
 *   page refreshes and process restarts.
 *
 * - **Graceful degradation**: Each layer is independent. If SSE fails, polling
 *   takes over. If polling fails, file state provides a last-resort check.
 *
 * - **Multi-modal detection**: Don't rely on a single communication channel.
 *   Network issues, server restarts, and client refreshes can all interrupt
 *   streaming connections.
 */

// Types
export type {
  DetectionLayer,
  DetectionResult,
  ResilienceConfig,
  ResilienceResult,
  ResilienceStrategy,
  TaskCompletionState,
  LayerType,
  SSELayerOptions,
  PollingLayerOptions,
  FileStateLayerOptions,
} from './types';

// Strategy creation
export {
  createResilienceStrategy,
  createSSELayer,
  createPollingLayer,
  createFileStateLayer,
  createCustomLayer,
} from './ResilienceStrategy';
