/**
 * Test Scenario Types
 * Represents AI-generated test scenarios with component analysis
 */

export type TestScenarioStatus = 'pending' | 'generated' | 'ready' | 'running' | 'completed' | 'failed';
export type TestCreatedBy = 'ai' | 'manual';

/**
 * User interaction step in a test flow
 */
export interface UserFlowStep {
  step: number;
  action: string; // e.g., "click", "type", "scroll", "hover"
  selector: string; // data-testid or CSS selector
  value?: string; // For input actions
  description: string;
  expectedOutcome?: string;
}

/**
 * Component in the React tree
 */
export interface ComponentNode {
  name: string;
  filePath: string;
  props?: string[];
  children?: ComponentNode[];
  hasInteractiveElements?: boolean;
  dataTestIds?: string[];
}

/**
 * Database model for test scenarios
 */
export interface DbTestScenario {
  id: string;
  project_id: string;
  context_id: string | null;
  name: string;
  description: string | null;
  user_flows: string; // JSON serialized UserFlowStep[]
  component_tree: string | null; // JSON serialized ComponentNode
  test_skeleton: string | null; // Playwright test code
  data_testids: string | null; // JSON serialized string[]
  status: TestScenarioStatus;
  ai_confidence_score: number | null;
  created_by: TestCreatedBy;
  created_at: string;
  updated_at: string;
}

/**
 * Application model for test scenarios (with parsed JSON)
 */
export interface TestScenario extends Omit<DbTestScenario, 'user_flows' | 'component_tree' | 'data_testids'> {
  user_flows: UserFlowStep[];
  component_tree: ComponentNode | null;
  data_testids: string[];
}

/**
 * Input for creating a new test scenario
 */
export interface CreateTestScenarioInput {
  project_id: string;
  context_id?: string;
  name: string;
  description?: string;
  user_flows: UserFlowStep[];
  component_tree?: ComponentNode;
  data_testids?: string[];
  created_by: TestCreatedBy;
  ai_confidence_score?: number;
}

/**
 * Input for updating a test scenario
 */
export interface UpdateTestScenarioInput {
  name?: string;
  description?: string;
  user_flows?: UserFlowStep[];
  component_tree?: ComponentNode;
  test_skeleton?: string;
  data_testids?: string[];
  status?: TestScenarioStatus;
  ai_confidence_score?: number;
}

/**
 * Test execution status
 */
export type TestExecutionStatus = 'queued' | 'running' | 'passed' | 'failed' | 'skipped';

/**
 * Screenshot metadata
 */
export interface ScreenshotMetadata {
  filePath: string;
  stepName: string;
  timestamp: string;
  viewport?: {
    width: number;
    height: number;
  };
}

/**
 * Database model for test executions
 */
export interface DbTestExecution {
  id: string;
  scenario_id: string;
  project_id: string;
  status: TestExecutionStatus;
  execution_time_ms: number | null;
  error_message: string | null;
  console_output: string | null;
  screenshots: string | null; // JSON serialized ScreenshotMetadata[]
  coverage_data: string | null; // JSON serialized coverage report
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

/**
 * Application model for test executions
 */
export interface TestExecution extends Omit<DbTestExecution, 'screenshots' | 'coverage_data'> {
  screenshots: ScreenshotMetadata[];
  coverage_data: Record<string, unknown> | null;
}

/**
 * Visual diff metadata
 */
export interface DbVisualDiff {
  id: string;
  execution_id: string;
  baseline_screenshot: string;
  current_screenshot: string;
  diff_screenshot: string | null;
  diff_percentage: number | null;
  has_differences: number; // Boolean (0 or 1)
  step_name: string;
  viewport_width: number | null;
  viewport_height: number | null;
  metadata: string | null; // JSON metadata
  reviewed: number; // Boolean (0 or 1)
  approved: number; // Boolean (0 or 1)
  created_at: string;
}

/**
 * Application model for visual diffs
 */
export interface VisualDiff extends Omit<DbVisualDiff, 'has_differences' | 'reviewed' | 'approved' | 'metadata'> {
  has_differences: boolean;
  reviewed: boolean;
  approved: boolean;
  metadata: Record<string, unknown> | null;
}
