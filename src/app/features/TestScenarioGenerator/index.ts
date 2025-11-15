/**
 * Test Scenario Generator - Main Export
 * AI-driven test scenario generation and execution
 */

// Component analysis and scenario generation
export {
  analyzeComponentFile,
  buildComponentTree,
  generateTestScenarios,
  suggestMissingTestIds,
  extractExistingTestIds
} from './lib/scenarioAnalyzer';

// Playwright test code generation
export {
  generatePlaywrightTest,
  generateVisualRegressionTest,
  generatePlaywrightConfig,
  generateVisualDiffUtility,
  generateTestScripts
} from './lib/playwrightGenerator';

// Re-export types from database
export type {
  TestScenario,
  TestExecution,
  VisualDiff,
  UserFlowStep,
  ComponentNode,
  TestScenarioStatus,
  TestExecutionStatus
} from '@/app/db';
