/**
 * Progress Module
 *
 * Provides a unified interface for progress tracking across async operations.
 * See types.ts for the design philosophy and usage patterns.
 */

export {
  // Types
  type ProgressSnapshot,
  type ProgressCallback,
  type ProgressEmitter,
  type ProgressEmitterConfig,
  // Factory
  createProgressEmitter,
  // Utilities
  normalizeProgress,
  progressLinesToPercent,
  isProgressEmitter,
} from './types';
