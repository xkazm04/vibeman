/**
 * API Route: Unified Test Scenarios CRUD
 *
 * This consolidated endpoint handles both AI-generated test scenarios and manual test cases.
 * Steps are embedded as arrays within scenarios.
 *
 * GET /api/test-scenarios - List scenarios (supports projectId, contextId, status, id, type filters)
 * POST /api/test-scenarios - Create scenario (AI or manual)
 * PUT /api/test-scenarios - Update scenario
 * DELETE /api/test-scenarios - Delete scenario
 *
 * Nested routes:
 * - /api/test-scenarios/generate - AI scenario generation
 * - /api/test-scenarios/execute - Playwright test execution
 */

import { NextRequest, NextResponse } from 'next/server';
import { testScenarioDb } from '@/app/db';
import { testCaseScenarioRepository } from '@/app/db/repositories/test-case-scenario.repository';
import { testCaseStepRepository } from '@/app/db/repositories/test-case-step.repository';
import { logger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';
import { withObservability } from '@/lib/observability/middleware';

/**
 * Unified scenario type for API responses
 */
interface UnifiedScenario {
  id: string;
  project_id?: string;
  context_id: string | null;
  name: string;
  description: string | null;
  type: 'ai' | 'manual'; // Discriminator for scenario type
  // AI scenario fields
  user_flows?: Array<{
    step: number;
    action: string;
    selector: string;
    value?: string;
    description: string;
    expectedOutcome?: string;
  }>;
  component_tree?: unknown;
  test_skeleton?: string | null;
  data_testids?: string[];
  status?: string;
  ai_confidence_score?: number | null;
  created_by?: string;
  // Manual scenario fields - steps embedded as array
  steps?: Array<{
    id: string;
    step_order: number;
    step_name: string;
    expected_result: string;
    test_selector_id: string | null;
  }>;
  // Common fields
  created_at: string;
  updated_at: string;
}

/**
 * GET - List scenarios with optional filtering
 *
 * Query params:
 * - projectId: Filter by project
 * - contextId: Filter by context
 * - status: Filter by status (AI scenarios only)
 * - id: Get single scenario by ID
 * - type: Filter by type ('ai' | 'manual' | 'all', default: 'all')
 * - includeSteps: Include embedded steps for manual scenarios (default: true)
 */
async function handleGet(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const contextId = searchParams.get('contextId');
    const status = searchParams.get('status');
    const scenarioId = searchParams.get('id');
    const type = searchParams.get('type') || 'all';
    const includeSteps = searchParams.get('includeSteps') !== 'false';

    // Get single scenario by ID
    if (scenarioId) {
      // Try AI scenario first
      const aiScenario = testScenarioDb.getById(scenarioId);
      if (aiScenario) {
        return NextResponse.json({
          success: true,
          scenario: {
            ...aiScenario,
            type: 'ai',
          } as UnifiedScenario,
        });
      }

      // Try manual scenario
      const manualScenario = testCaseScenarioRepository.getScenarioById(scenarioId);
      if (manualScenario) {
        const steps = includeSteps
          ? testCaseStepRepository.getStepsByScenario(scenarioId)
          : [];
        return NextResponse.json({
          success: true,
          scenario: {
            ...manualScenario,
            type: 'manual',
            steps,
          } as UnifiedScenario,
        });
      }

      return NextResponse.json(
        { success: false, error: 'Scenario not found' },
        { status: 404 }
      );
    }

    // Context-based query
    if (contextId) {
      const scenarios: UnifiedScenario[] = [];

      // Get AI scenarios for context
      if (type === 'all' || type === 'ai') {
        const aiScenarios = testScenarioDb.getAllByContext(contextId);
        scenarios.push(...aiScenarios.map(s => ({ ...s, type: 'ai' as const })));
      }

      // Get manual scenarios for context
      if (type === 'all' || type === 'manual') {
        const manualScenarios = testCaseScenarioRepository.getScenariosByContext(contextId);
        for (const scenario of manualScenarios) {
          const steps = includeSteps
            ? testCaseStepRepository.getStepsByScenario(scenario.id)
            : [];
          scenarios.push({
            ...scenario,
            type: 'manual',
            steps,
          });
        }
      }

      return NextResponse.json({
        success: true,
        scenarios,
        count: scenarios.length,
      });
    }

    // Project-based query (requires projectId)
    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'projectId or contextId is required' },
        { status: 400 }
      );
    }

    const scenarios: UnifiedScenario[] = [];

    // Get AI scenarios for project
    if (type === 'all' || type === 'ai') {
      let aiScenarios;
      if (status) {
        aiScenarios = testScenarioDb.getByStatus(projectId, status);
      } else {
        aiScenarios = testScenarioDb.getAllByProject(projectId);
      }
      scenarios.push(...aiScenarios.map(s => ({ ...s, type: 'ai' as const })));
    }

    // Note: Manual scenarios don't have a project_id directly,
    // they're associated via context_id which links to project
    // This maintains the original data model while unifying the API

    return NextResponse.json({
      success: true,
      scenarios,
      count: scenarios.length,
    });
  } catch (error) {
    logger.error('Error fetching test scenarios:', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch test scenarios' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create new scenario (AI or manual)
 *
 * Body params:
 * - type: 'ai' | 'manual' (required)
 *
 * For AI scenarios:
 * - project_id, context_id, name, description, user_flows, created_by
 *
 * For manual scenarios:
 * - context_id, name, description, steps (optional array)
 */
async function handlePost(request: NextRequest) {
  try {
    const body = await request.json();
    const { type = 'ai' } = body;

    if (type === 'manual') {
      // Create manual test case scenario
      const { context_id, name, description, steps } = body;

      if (!context_id || !name) {
        return NextResponse.json(
          { success: false, error: 'context_id and name are required for manual scenarios' },
          { status: 400 }
        );
      }

      const scenarioId = uuidv4();
      const scenario = testCaseScenarioRepository.createScenario({
        id: scenarioId,
        context_id,
        name,
        description: description || null,
      });

      // Create steps if provided
      const createdSteps = [];
      if (steps && Array.isArray(steps)) {
        for (let i = 0; i < steps.length; i++) {
          const step = steps[i];
          const createdStep = testCaseStepRepository.createStep({
            id: uuidv4(),
            scenario_id: scenarioId,
            step_order: step.step_order ?? i + 1,
            step_name: step.step_name,
            expected_result: step.expected_result,
            test_selector_id: step.test_selector_id || null,
          });
          createdSteps.push(createdStep);
        }
      }

      return NextResponse.json({
        success: true,
        scenario: {
          ...scenario,
          type: 'manual',
          steps: createdSteps,
        } as UnifiedScenario,
      });
    } else {
      // Create AI test scenario (existing logic)
      const { project_id, context_id, name, description, user_flows, created_by } = body;

      if (!project_id || !name || !user_flows) {
        return NextResponse.json(
          { success: false, error: 'project_id, name, and user_flows are required for AI scenarios' },
          { status: 400 }
        );
      }

      const scenario = testScenarioDb.create({
        project_id,
        context_id,
        name,
        description,
        user_flows,
        created_by: created_by || 'ai',
      });

      return NextResponse.json({
        success: true,
        scenario: {
          ...scenario,
          type: 'ai',
        } as UnifiedScenario,
      });
    }
  } catch (error) {
    logger.error('Error creating test scenario:', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to create test scenario' },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update scenario
 *
 * Body params:
 * - id: Scenario ID (required)
 * - type: 'ai' | 'manual' (optional, auto-detected if not provided)
 * - ...updates: Fields to update
 *
 * For manual scenarios, steps can be updated:
 * - steps: Array of step objects (replaces all steps)
 * - addSteps: Array of steps to add
 * - removeStepIds: Array of step IDs to remove
 */
async function handlePut(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, type, steps, addSteps, removeStepIds, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 }
      );
    }

    // Try to detect scenario type if not provided
    let scenarioType = type;
    if (!scenarioType) {
      const aiScenario = testScenarioDb.getById(id);
      if (aiScenario) {
        scenarioType = 'ai';
      } else {
        const manualScenario = testCaseScenarioRepository.getScenarioById(id);
        if (manualScenario) {
          scenarioType = 'manual';
        }
      }
    }

    if (!scenarioType) {
      return NextResponse.json(
        { success: false, error: 'Scenario not found' },
        { status: 404 }
      );
    }

    if (scenarioType === 'manual') {
      // Update manual scenario
      const updated = testCaseScenarioRepository.updateScenario(id, {
        name: updates.name,
        description: updates.description,
      });

      if (!updated) {
        return NextResponse.json(
          { success: false, error: 'Scenario not found' },
          { status: 404 }
        );
      }

      // Handle step operations
      if (removeStepIds && Array.isArray(removeStepIds)) {
        for (const stepId of removeStepIds) {
          testCaseStepRepository.deleteStep(stepId);
        }
      }

      if (addSteps && Array.isArray(addSteps)) {
        for (const step of addSteps) {
          testCaseStepRepository.createStep({
            id: uuidv4(),
            scenario_id: id,
            step_order: step.step_order ?? testCaseStepRepository.getNextStepOrder(id),
            step_name: step.step_name,
            expected_result: step.expected_result,
            test_selector_id: step.test_selector_id || null,
          });
        }
      }

      if (steps && Array.isArray(steps)) {
        // Replace all steps
        testCaseStepRepository.deleteStepsByScenario(id);
        for (let i = 0; i < steps.length; i++) {
          const step = steps[i];
          testCaseStepRepository.createStep({
            id: step.id || uuidv4(),
            scenario_id: id,
            step_order: step.step_order ?? i + 1,
            step_name: step.step_name,
            expected_result: step.expected_result,
            test_selector_id: step.test_selector_id || null,
          });
        }
      }

      // Fetch updated scenario with steps
      const finalScenario = testCaseScenarioRepository.getScenarioById(id);
      const finalSteps = testCaseStepRepository.getStepsByScenario(id);

      return NextResponse.json({
        success: true,
        scenario: {
          ...finalScenario,
          type: 'manual',
          steps: finalSteps,
        } as UnifiedScenario,
      });
    } else {
      // Update AI scenario
      const updated = testScenarioDb.update(id, updates);
      if (!updated) {
        return NextResponse.json(
          { success: false, error: 'Scenario not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        scenario: {
          ...updated,
          type: 'ai',
        } as UnifiedScenario,
      });
    }
  } catch (error) {
    logger.error('Error updating test scenario:', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to update test scenario' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete scenario
 *
 * Query params:
 * - id: Scenario ID (required)
 * - type: 'ai' | 'manual' (optional, auto-detected if not provided)
 */
async function handleDelete(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    let type = searchParams.get('type');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 }
      );
    }

    // Try to detect scenario type if not provided
    if (!type) {
      const aiScenario = testScenarioDb.getById(id);
      if (aiScenario) {
        type = 'ai';
      } else {
        const manualScenario = testCaseScenarioRepository.getScenarioById(id);
        if (manualScenario) {
          type = 'manual';
        }
      }
    }

    if (!type) {
      return NextResponse.json(
        { success: false, error: 'Scenario not found' },
        { status: 404 }
      );
    }

    let deleted = false;
    if (type === 'manual') {
      // Steps are cascade deleted via foreign key or we delete them explicitly
      testCaseStepRepository.deleteStepsByScenario(id);
      deleted = testCaseScenarioRepository.deleteScenario(id);
    } else {
      deleted = testScenarioDb.delete(id);
    }

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Scenario not found or already deleted' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting test scenario:', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to delete test scenario' },
      { status: 500 }
    );
  }
}

// Export with observability tracking
export const GET = withObservability(handleGet, '/api/test-scenarios');
export const POST = withObservability(handlePost, '/api/test-scenarios');
export const PUT = withObservability(handlePut, '/api/test-scenarios');
export const DELETE = withObservability(handleDelete, '/api/test-scenarios');
