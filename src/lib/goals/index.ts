/**
 * Goals Library
 * Exports goal-related utilities and services
 */

export {
  createGoalAnalysisRequirement,
  fireAndForgetGoalAnalysis,
  type GoalAnalysisConfig,
  type GoalAnalysisResult,
} from './goalAnalysis';

export {
  calculateGoalProgress,
  checkGoalCompletion,
  getCompletionSuggestions,
  acceptCandidate,
  rejectCandidate,
  tweakCandidate,
  type CompletionCheckResult,
  type CompletionSuggestion,
  type CandidateAcceptResult,
} from './goalService';

export {
  computeGoalVelocityTrend,
  assessSingleGoalRisk,
  getGoalRisk,
  getAllRisks,
  getAllRisksFromCollected,
  getGoalProgress,
  getProjectVelocity,
  getProjectVelocityFromCollected,
  computeVelocityMetrics,
  finalizeVelocityComparison,
  emptyVelocityComparison,
} from './signalProcessor';
