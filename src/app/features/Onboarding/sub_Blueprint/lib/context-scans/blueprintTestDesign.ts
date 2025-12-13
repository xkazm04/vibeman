/**
 * Blueprint Test Design Scan
 * Analyzes a context and generates/updates test scenarios and steps for comprehensive test coverage
 */

import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { useBlueprintStore } from '../../store/blueprintStore';
import { executePipeline } from '../pipeline';
import { testDesignPrompt } from './prompts/testDesign';

export interface ScanResult {
  success: boolean;
  error?: string;
  data?: {
    contextId: string;
    contextName: string;
    scenarioCount: number;
    stepCount: number;
    updatedAt: string;
    requirementPath?: string;
    taskId?: string;
  };
}

export interface DecisionData {
  type: string;
  title: string;
  description: string;
  count?: number;
  severity?: 'info' | 'warning' | 'error';
  projectId?: string;
  projectPath?: string;
  contextId?: string;
  data?: any;
  onAccept: () => Promise<void>;
  onReject: () => Promise<void>;
}

/**
 * Fetch context details from database
 */
async function fetchContextDetails(contextId: string, projectId: string) {
  const response = await fetch(`/api/contexts/detail?contextId=${contextId}&projectId=${projectId}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch context details: ${response.statusText}`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch context details');
  }

  return result.data;
}

/**
 * Fetch test scenarios for a context (using unified test-scenarios API)
 * Returns manual test scenarios with embedded steps
 */
async function fetchTestScenarios(contextId: string) {
  // Use unified test-scenarios endpoint with type=manual filter
  const response = await fetch(`/api/test-scenarios?contextId=${contextId}&type=manual`);

  if (!response.ok) {
    throw new Error(`Failed to fetch test scenarios: ${response.statusText}`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch test scenarios');
  }

  return result.scenarios || [];
}

/**
 * Fetch test steps for a scenario (using unified test-scenarios API)
 * Steps are now embedded in scenario response
 */
async function fetchTestSteps(scenarioId: string) {
  // Use unified test-scenarios endpoint to get scenario with embedded steps
  const response = await fetch(`/api/test-scenarios?id=${scenarioId}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch test steps: ${response.statusText}`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch test steps');
  }

  // Steps are now embedded in the scenario response
  return result.scenario?.steps || [];
}

/**
 * Execute test design scan - Pre-scan phase
 * Fetches context data and existing test scenarios, shows decision panel
 */
export async function executeTestDesignScan(contextId: string): Promise<ScanResult> {
  const { activeProject } = useActiveProjectStore.getState();

  if (!activeProject) {
    return {
      success: false,
      error: 'No active project selected',
    };
  }

  if (!contextId) {
    return {
      success: false,
      error: 'No context ID provided',
    };
  }

  try {
    // Update progress
    useBlueprintStore.getState().updateScanProgress(10);

    // Fetch context details
    const context = await fetchContextDetails(contextId, activeProject.id);

    useBlueprintStore.getState().updateScanProgress(30);

    if (!context) {
      return {
        success: false,
        error: 'Context not found',
      };
    }

    // Fetch existing test scenarios
    const scenarios = await fetchTestScenarios(contextId);

    useBlueprintStore.getState().updateScanProgress(50);

    // Fetch steps for each scenario
    const scenariosWithSteps = await Promise.all(
      scenarios.map(async (scenario: any) => {
        const steps = await fetchTestSteps(scenario.id);
        return {
          ...scenario,
          steps,
        };
      })
    );

    useBlueprintStore.getState().updateScanProgress(70);

    // Calculate total step count
    const totalSteps = scenariosWithSteps.reduce(
      (sum: number, scenario: any) => sum + (scenario.steps?.length || 0),
      0
    );

    useBlueprintStore.getState().updateScanProgress(100);

    // Return context and test info for pre-scan decision
    return {
      success: true,
      data: {
        contextId: context.id,
        contextName: context.name,
        scenarioCount: scenariosWithSteps.length,
        stepCount: totalSteps,
        updatedAt: context.updated_at,
      },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to fetch context/test details';
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Execute test design process using Claude Code pipeline
 */
async function executeTestDesign(
  contextId: string,
  context: any,
  scenarios: any[],
  projectId: string,
  projectPath: string
): Promise<{ requirementPath: string; taskId: string }> {
  // Parse file paths
  const filePaths = typeof context.file_paths === 'string'
    ? JSON.parse(context.file_paths)
    : context.file_paths;

  // Build test design prompt
  const promptContent = testDesignPrompt({
    contextId,
    contextName: context.name,
    contextDescription: context.description || '',
    filePaths,
    target: context.target || null,
    targetFulfillment: context.target_fulfillment || null,
    projectPath,
    existingScenarios: scenarios,
  });

  // Execute pipeline with progress tracking
  const result = await executePipeline({
    projectPath,
    projectId,
    requirementName: `test-design-${context.name.toLowerCase().replace(/\s+/g, '-')}`,
    requirementContent: promptContent,
    onProgress: (progress, message) => {
      useBlueprintStore.getState().updateScanProgress(progress);
      console.log(`[Test Design Scan] ${progress}%: ${message}`);
    },
  });

  if (!result.success) {
    throw new Error(result.error || 'Pipeline execution failed');
  }

  return {
    requirementPath: result.requirementPath || '',
    taskId: result.taskId || '',
  };
}

/**
 * Create event for successful test design
 */
async function createTestDesignEvent(
  projectId: string,
  contextId: string,
  contextName: string,
  taskId: string
): Promise<void> {
  await fetch('/api/blueprint/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      project_id: projectId,
      title: 'Test Design Scan Completed',
      description: `Successfully designed test scenarios for context "${contextName}"`,
      type: 'success',
      agent: 'blueprint',
      context_id: contextId,
      message: `Task ID: ${taskId}`,
    }),
  });
}

/**
 * Build pre-scan decision data
 * Shows context info and test scenario count, asks user to confirm test design
 */
export function buildDecisionData(result: ScanResult): DecisionData | null {
  const { activeProject } = useActiveProjectStore.getState();

  if (!activeProject) {
    return null;
  }

  // Handle error cases
  if (!result.success) {
    return {
      type: 'test-design-scan-error',
      title: 'Test Design Scan Failed',
      description: `An error occurred while analyzing the context:\n\n${result.error || 'Unknown error'}\n\nPlease check the console for more details.`,
      severity: 'error',
      projectId: activeProject.id,
      projectPath: activeProject.path,
      data: { error: result.error },
      onAccept: async () => {
        // Error acknowledged
      },
      onReject: async () => {
        // Error dismissed
      },
    };
  }

  if (!result.data) {
    return null;
  }

  const { contextId, contextName, scenarioCount, stepCount, updatedAt } = result.data;

  // Format date
  const lastUpdated = new Date(updatedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  // Determine severity based on test coverage
  const severity: 'info' | 'warning' | 'error' =
    scenarioCount === 0 ? 'warning' :
    scenarioCount < 3 ? 'info' :
    'info';

  const description = `📦 **Context**: ${contextName}
📅 **Last Updated**: ${lastUpdated}

📊 **Test Coverage**:
- **Scenarios**: ${scenarioCount}
- **Steps**: ${stepCount}

${scenarioCount === 0
  ? `⚠️ **No test scenarios exist** for this context. Claude Code will analyze the context and create comprehensive test coverage for the top 3 user-facing activities.\n\n`
  : scenarioCount < 3
    ? `ℹ️ This context has **${scenarioCount} test scenario(s)**. Claude Code will review existing tests and create additional scenarios if needed to ensure comprehensive coverage.\n\n`
    : `✅ This context has **${scenarioCount} test scenarios**. Claude Code will review and update test coverage to ensure all critical flows are tested.\n\n`
}**What Claude Code will do**:
✅ Analyze all files in the context
✅ Identify top 3 user-facing test priorities
✅ Create/update test scenarios and steps
✅ Add testId selectors where needed
✅ Ensure Playwright-compatible test structure
❌ No documentation files will be generated

Click **Accept** to start the test design process using Claude Code.`;

  return {
    type: 'test-design-pre-scan',
    title: 'Design Test Coverage?',
    description,
    count: scenarioCount,
    severity,
    projectId: activeProject.id,
    projectPath: activeProject.path,
    contextId,
    data: result.data,

    // Accept: Execute test design via Claude Code pipeline
    onAccept: async () => {
      try {
        // Fetch full context details again for test design
        const context = await fetchContextDetails(contextId, activeProject.id);

        // Fetch existing scenarios with steps
        const scenarios = await fetchTestScenarios(contextId);
        const scenariosWithSteps = await Promise.all(
          scenarios.map(async (scenario: any) => {
            const steps = await fetchTestSteps(scenario.id);
            return {
              id: scenario.id,
              name: scenario.name,
              description: scenario.description,
              steps: steps.map((step: any) => ({
                id: step.id,
                step_order: step.step_order,
                step_name: step.step_name,
                expected_result: step.expected_result,
                test_selector_id: step.test_selector_id,
              })),
            };
          })
        );

        // Execute test design pipeline
        const { requirementPath, taskId } = await executeTestDesign(
          contextId,
          context,
          scenariosWithSteps,
          activeProject.id,
          activeProject.path
        );

        // Create success event
        await createTestDesignEvent(activeProject.id, contextId, contextName, taskId);

        console.log('[Test Design Scan] Test design completed successfully', {
          requirementPath,
          taskId,
        });
      } catch (error) {
        console.error('[Test Design Scan] Test design failed:', error);
        throw error;
      }
    },

    // Reject: Close decision panel (default behavior)
    onReject: async () => {
      console.log('[Test Design Scan] User declined test design');
    },
  };
}
