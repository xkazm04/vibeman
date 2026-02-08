/**
 * Test Design Scan Component
 * Analyzes a context and generates/updates test scenarios and steps for comprehensive test coverage
 *
 * Migrated from:
 * src/app/features/Onboarding/blueprint/lib/context-scans/blueprintTestDesign.ts
 *
 * Execution flow:
 * 1. Fetch context details and existing test scenarios (pre-scan)
 * 2. Show decision with test coverage info
 * 3. If accepted, build prompt and execute pipeline with polling
 * 4. Create success event
 */

import { BaseScan } from '../base/BaseScan';
import {
  ScanConfig,
  ScanResult,
  DecisionData,
} from '../base/types';
import { ValidationResult } from '../../../types';
import { PipelineExecutor } from '../../../pipeline/PipelineExecutor';
import {
  buildTestDesignPrompt,
  TestScenario,
  TestStep,
} from '../../../prompts/templates/testDesignPrompt';

/**
 * Test design scan configuration
 */
export interface TestDesignScanConfig extends ScanConfig {
  contextId: string;
  contextName?: string;
}

/**
 * Context details from API
 */
interface ContextDetails {
  id: string;
  name: string;
  description: string;
  file_paths: string | string[];
  target: string | null;
  target_fulfillment: string | null;
  updated_at: string;
}

/**
 * Test design scan result data
 */
export interface TestDesignScanData {
  contextId: string;
  contextName: string;
  scenarioCount: number;
  stepCount: number;
  updatedAt: string;
  requirementPath?: string;
  taskId?: string;
}

/**
 * Test Design Scan Component
 * Creates or updates test scenarios and steps for a context
 */
export class TestDesignScan extends BaseScan<TestDesignScanConfig, TestDesignScanData> {
  readonly id = 'scan.test-design';
  readonly name = 'Test Design Scan';
  readonly description = 'Analyze context and generate/update test scenarios and steps for comprehensive test coverage';
  readonly executionMode = 'polling' as const;
  readonly category = 'context' as const;
  readonly requiresContext = true;

  // Metadata
  readonly icon = 'TestTube';
  readonly color = '#22c55e';  // Green
  readonly tags = ['context', 'testing', 'automation', 'quality'];
  readonly supportedProjectTypes = ['*'];

  private pipeline = new PipelineExecutor();
  private contextDetails: ContextDetails | null = null;
  private filePaths: string[] = [];
  private scenariosWithSteps: TestScenario[] = [];

  /**
   * Execute the test design scan (pre-scan phase)
   */
  async execute(): Promise<ScanResult<TestDesignScanData>> {
    // Validate configuration
    const validation = this.validateConfig();
    if (!validation.valid) {
      return this.errorResult(validation.errors?.join(', ') || 'Invalid configuration');
    }

    this.reportProgress(10, 'Fetching context details...');
    this.log('info', `Starting test design scan for context: ${this.config.contextId}`);

    // Fetch context details
    const contextResult = await this.fetchContextDetails();
    if (!contextResult.success) {
      return this.errorResult(contextResult.error || 'Failed to fetch context details');
    }

    this.contextDetails = contextResult.data!;
    this.reportProgress(30, 'Context details loaded');

    // Parse file paths
    this.filePaths = typeof this.contextDetails.file_paths === 'string'
      ? JSON.parse(this.contextDetails.file_paths)
      : this.contextDetails.file_paths || [];

    // Fetch existing test scenarios
    this.reportProgress(40, 'Fetching existing test scenarios...');
    const scenariosResult = await this.fetchTestScenarios();
    if (!scenariosResult.success) {
      this.log('warn', 'Could not fetch test scenarios, proceeding with empty list');
      this.scenariosWithSteps = [];
    } else {
      this.reportProgress(50, 'Fetching test steps...');
      // Fetch steps for each scenario
      const scenarios = scenariosResult.data || [];
      this.scenariosWithSteps = await this.fetchAllSteps(scenarios);
    }

    this.reportProgress(70, 'Pre-scan complete');

    // Calculate total step count
    const totalSteps = this.scenariosWithSteps.reduce(
      (sum, scenario) => sum + (scenario.steps?.length || 0),
      0
    );

    return this.successResult({
      contextId: this.contextDetails.id,
      contextName: this.contextDetails.name,
      scenarioCount: this.scenariosWithSteps.length,
      stepCount: totalSteps,
      updatedAt: this.contextDetails.updated_at,
    });
  }

  /**
   * Execute the test design after user confirmation
   */
  async executeTestDesign(): Promise<ScanResult<TestDesignScanData>> {
    if (!this.contextDetails) {
      return this.errorResult('Context details not available. Run execute() first.');
    }

    this.reportProgress(55, 'Building test design prompt...');

    // Build the prompt
    const promptContent = buildTestDesignPrompt({
      contextId: this.contextDetails.id,
      contextName: this.contextDetails.name,
      contextDescription: this.contextDetails.description || 'No description provided',
      filePaths: this.filePaths,
      target: this.contextDetails.target,
      targetFulfillment: this.contextDetails.target_fulfillment,
      projectPath: this.config.projectPath,
      existingScenarios: this.scenariosWithSteps,
    });

    this.reportProgress(60, 'Executing test design pipeline...');

    // Execute pipeline with polling
    const requirementName = `test-design-${this.sanitizeName(this.contextDetails.name)}`;

    const pipelineResult = await this.pipeline.execute({
      projectPath: this.config.projectPath,
      projectId: this.config.projectId,
      requirementName,
      requirementContent: promptContent,
      executionMode: 'polling',
      onProgress: (progress, message) => {
        // Map pipeline progress (0-100) to our range (60-95)
        const mappedProgress = 60 + (progress * 0.35);
        this.reportProgress(mappedProgress, message);
      },
    });

    if (!pipelineResult.success) {
      this.log('error', `Test design failed: ${pipelineResult.error}`);
      return this.errorResult(pipelineResult.error || 'Pipeline execution failed');
    }

    // Create success event
    await this.createTestDesignEvent(pipelineResult.taskId || '');

    this.reportProgress(100, 'Test design complete');
    this.log('info', 'Test design scan completed successfully');

    return this.successResult({
      contextId: this.contextDetails.id,
      contextName: this.contextDetails.name,
      scenarioCount: this.scenariosWithSteps.length,
      stepCount: this.scenariosWithSteps.reduce((sum, s) => sum + s.steps.length, 0),
      updatedAt: this.contextDetails.updated_at,
      requirementPath: pipelineResult.requirementPath,
      taskId: pipelineResult.taskId,
    });
  }

  /**
   * Fetch context details from API
   */
  private async fetchContextDetails(): Promise<{
    success: boolean;
    data?: ContextDetails;
    error?: string;
  }> {
    const url = `/api/contexts/detail?contextId=${this.config.contextId}&projectId=${this.config.projectId}`;
    const result = await this.fetchJson<{ success: boolean; data: ContextDetails; error?: string }>(url);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    if (!result.data?.success) {
      return { success: false, error: result.data?.error || 'Failed to fetch context' };
    }

    return { success: true, data: result.data.data };
  }

  /**
   * Fetch test scenarios for the context (using unified test-scenarios API)
   */
  private async fetchTestScenarios(): Promise<{
    success: boolean;
    data?: Array<{ id: string; name: string; description: string | null; steps?: TestStep[] }>;
    error?: string;
  }> {
    // Use unified test-scenarios endpoint with type=manual filter
    const url = `/api/test-scenarios?contextId=${this.config.contextId}&type=manual`;
    const result = await this.fetchJson<{
      success: boolean;
      scenarios: Array<{ id: string; name: string; description: string | null; steps?: TestStep[] }>;
      error?: string;
    }>(url);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    if (!result.data?.success) {
      return { success: false, error: result.data?.error || 'Failed to fetch scenarios' };
    }

    return { success: true, data: result.data.scenarios || [] };
  }

  /**
   * Fetch test steps for a scenario (using unified test-scenarios API)
   * Steps are now embedded in scenario response
   */
  private async fetchTestSteps(scenarioId: string): Promise<TestStep[]> {
    // Use unified test-scenarios endpoint to get scenario with embedded steps
    const url = `/api/test-scenarios?id=${scenarioId}`;
    const result = await this.fetchJson<{
      success: boolean;
      scenario: { steps?: TestStep[] };
      error?: string;
    }>(url);

    if (!result.success || !result.data?.success) {
      return [];
    }

    // Steps are now embedded in the scenario response
    return (result.data.scenario?.steps || []).map((step) => ({
      id: step.id,
      step_order: step.step_order,
      step_name: step.step_name,
      expected_result: step.expected_result,
      test_selector_id: step.test_selector_id,
    }));
  }

  /**
   * Fetch steps for all scenarios
   */
  private async fetchAllSteps(
    scenarios: Array<{ id: string; name: string; description: string | null }>
  ): Promise<TestScenario[]> {
    const results = await Promise.all(
      scenarios.map(async (scenario) => {
        const steps = await this.fetchTestSteps(scenario.id);
        return {
          id: scenario.id,
          name: scenario.name,
          description: scenario.description,
          steps,
        };
      })
    );

    return results;
  }

  /**
   * Create success event
   */
  private async createTestDesignEvent(taskId: string): Promise<void> {
    try {
      await this.postJson('/api/blueprint/events', {
        project_id: this.config.projectId,
        title: 'Test Design Scan Completed',
        description: `Successfully designed test scenarios for context "${this.contextDetails?.name}"`,
        type: 'success',
        agent: 'blueprint',
        context_id: this.config.contextId,
        message: `Task ID: ${taskId}`,
      });
    } catch (error) {
      this.log('warn', 'Failed to create test design event');
    }
  }

  /**
   * Sanitize name for use in filenames
   */
  private sanitizeName(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .substring(0, 50);
  }

  /**
   * Build decision data for UI
   */
  buildDecision(result: ScanResult<TestDesignScanData>): DecisionData<TestDesignScanData> | null {
    if (!result.success) {
      return {
        type: 'test-design-scan-error',
        title: 'Test Design Scan Failed',
        description: `An error occurred while analyzing the context:\n\n${result.error || 'Unknown error'}`,
        severity: 'error',
        contextId: this.config.contextId,
        onAccept: async () => {},
        onReject: async () => {},
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

    const coverageDescription = scenarioCount === 0
      ? `**No test scenarios exist** for this context. Claude Code will analyze the context and create comprehensive test coverage for the top 3 user-facing activities.\n\n`
      : scenarioCount < 3
        ? `This context has **${scenarioCount} test scenario(s)**. Claude Code will review existing tests and create additional scenarios if needed to ensure comprehensive coverage.\n\n`
        : `This context has **${scenarioCount} test scenarios**. Claude Code will review and update test coverage to ensure all critical flows are tested.\n\n`;

    const description = `**Context**: ${contextName}
**Last Updated**: ${lastUpdated}

**Test Coverage**:
- **Scenarios**: ${scenarioCount}
- **Steps**: ${stepCount}

${coverageDescription}**What Claude Code will do**:
- Analyze all files in the context
- Identify top 3 user-facing test priorities
- Create/update test scenarios and steps
- Add testId selectors where needed
- Ensure Playwright-compatible test structure
- No documentation files will be generated

Click **Accept** to start the test design process using Claude Code.`;

    return {
      type: 'test-design-pre-scan',
      title: 'Design Test Coverage?',
      description,
      count: scenarioCount,
      severity,
      projectId: this.config.projectId,
      projectPath: this.config.projectPath,
      contextId,
      data: result.data,
      onAccept: async () => {
        // Execute the test design
        const designResult = await this.executeTestDesign();
        if (!designResult.success) {
          throw new Error(designResult.error || 'Test design failed');
        }
      },
      onReject: async () => {
        this.log('info', 'User declined test design');
      },
    };
  }

  /**
   * Validate configuration
   */
  validateConfig(): ValidationResult {
    const errors: string[] = [];

    if (!this.config.projectId) {
      errors.push('projectId is required');
    }

    if (!this.config.projectPath) {
      errors.push('projectPath is required');
    }

    if (!this.config.contextId) {
      errors.push('contextId is required for test design scan');
    }

    return errors.length > 0 ? { valid: false, errors } : { valid: true };
  }

  /**
   * Cancel the scan
   */
  cancel(): void {
    super.cancel();
    this.pipeline.cancel();
  }
}
