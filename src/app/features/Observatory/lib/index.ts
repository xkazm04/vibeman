/**
 * Observatory Library Index
 * Exports all core functionality for the Code Health Observatory
 */

// Observation Service
export {
  onObservationTrigger,
  emitObservationTrigger,
  startAnalysisSnapshot,
  completeAnalysisSnapshot,
  failAnalysisSnapshot,
  triggerFileChangeObservation,
  triggerPostExecutionObservation,
  triggerScheduledObservation,
  triggerManualObservation,
  scheduleObservation,
  stopAllSchedules,
  getProjectHealthSummary,
  getLearningProgress,
  calculateHealthDelta,
  recordHealthMetric,
  type ObservationTrigger,
  type AnalysisConfig,
  type AnalysisResult,
} from './ObservationService';

// Signal Providers
export * from './signals';

// Prediction Engine
export {
  generatePredictions,
  storePredictions,
  type Prediction,
  type PredictionResult,
  type PredictionConfig,
} from './PredictionEngine';

// Action Engine
export {
  generateAutoFixes,
  approveAutoFix,
  rejectAutoFix,
  getPendingAutoFixes,
  getApprovedAutoFixes,
  markAutoFixExecuting,
  completeAutoFix,
  expireOldAutoFixes,
  type ActionTemplate,
} from './ActionEngine';

// Execution Pipeline
export {
  executeAutoFix,
  completeExecution,
  getExecutionHistory,
  getExecutionSuccessRate,
  type ExecutionContext,
  type ExecutionState,
} from './ExecutionPipeline';

// Learning System
export {
  recordPredictionOutcome,
  learnFromExecutions,
  suspendPattern,
  deprecatePattern,
  getLearningProgress as getLearningStats,
  cleanupPatterns,
  recordUserFeedback,
  recordAutoFixOverride,
  type LearningConfig,
} from './LearningSystem';

// Claude Code Integration
export {
  startExecutionTracking,
  completeExecutionTracking,
  getActiveExecutions,
  isExecutionTracked,
  createObservatoryHooks,
  type TrackedExecution,
} from './ClaudeCodeIntegration';
