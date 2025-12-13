/**
 * API Route: Generate Test Scenarios
 * POST /api/test-scenarios/generate
 * Generates AI-powered test scenarios from component analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import { testScenarioDb, contextDb } from '@/app/db';
import {
  buildComponentTree,
  generateTestScenarios
} from '@/app/features/TestScenarioGenerator/lib/scenarioAnalyzer';
import {
  generatePlaywrightTest
} from '@/app/features/TestScenarioGenerator/lib/playwrightGenerator';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, contextId, filePaths, baseUrl } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    if (!filePaths || !Array.isArray(filePaths) || filePaths.length === 0) {
      return NextResponse.json(
        { error: 'filePaths array is required' },
        { status: 400 }
      );
    }

    // Get context description if contextId provided
    let contextDescription: string | undefined;
    if (contextId) {
      const context = contextDb.getContextById(contextId);
      contextDescription = context?.description || undefined;
    }

    // Build component tree
    logger.info('Building component tree...');
    const componentTree = await buildComponentTree(filePaths);

    if (componentTree.length === 0) {
      return NextResponse.json(
        { error: 'Failed to analyze components' },
        { status: 500 }
      );
    }

    // Generate test scenarios using AI
    logger.info('Generating test scenarios...');
    const scenarios = await generateTestScenarios(componentTree, contextDescription);

    // Store scenarios in database
    const createdScenarios = [];
    for (const scenario of scenarios) {
      const testScenario = testScenarioDb.create({
        project_id: projectId,
        context_id: contextId,
        name: scenario.name,
        description: scenario.description,
        user_flows: scenario.userFlows,
        component_tree: componentTree.length > 0 ? componentTree[0] : undefined,
        data_testids: scenario.dataTestIds,
        created_by: 'ai',
        ai_confidence_score: scenario.confidenceScore
      });

      // Generate Playwright test skeleton
      const testCode = generatePlaywrightTest(
        scenario.name,
        scenario.description,
        scenario.userFlows,
        baseUrl || 'http://localhost:3000'
      );

      // Update with generated test code
      const updated = testScenarioDb.update(testScenario.id, {
        test_skeleton: testCode,
        status: 'generated'
      });

      createdScenarios.push(updated);
    }

    return NextResponse.json({
      success: true,
      scenarios: createdScenarios,
      count: createdScenarios.length
    });
  } catch (error) {
    logger.error('Error generating test scenarios:', { error });
    return NextResponse.json(
      {
        error: 'Failed to generate test scenarios',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
