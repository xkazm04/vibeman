/**
 * Standup Automation Module
 * LLM-powered goal automation system
 */

// Types
export * from './types';

// Core engine
export {
  runProjectCycle,
  runAllProjectsCycle,
  initializeEngine,
  startAutomation,
  stopAutomation,
  runAutomationNow,
  getAutomationStatus,
  getAutomationConfig,
  updateAutomationConfig,
  getAutomationHistory,
  type ModesOverride,
} from './automationEngine';

// Individual components (for advanced usage)
export {
  evaluateGoal,
  evaluateProjectGoals,
  gatherGoalContext,
  shouldAutoApply,
  applyStatusChange,
} from './goalEvaluator';

export {
  generateGoals,
  gatherGenerationContext,
  candidateToGoal,
  createApprovedGoals,
} from './goalGenerator';

export {
  createTask,
  createCandidatesReviewTask,
  createTasksBatch,
} from './taskCreator';

export {
  registerCycleRunner,
  getSchedulerState,
  getConfig,
  updateConfig,
  recordTokenUsage,
  addCycleResult,
  getHistory,
  start,
  stop,
  runNow,
  reset,
} from './automationScheduler';
