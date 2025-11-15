import { NextRequest, NextResponse } from 'next/server';
import { testExecutionDb, testScenarioDb } from '@/app/db';
import type { TestResultSummary } from '@/stores/testResultStore';

/**
 * GET /api/test-results
 * Fetch test execution results for a project, organized by scan type
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'projectId is required' },
        { status: 400 }
      );
    }

    // Get all test scenarios for the project
    const scenarios = testScenarioDb.getAllByProject(projectId);

    // Get recent executions for the project
    const executions = testExecutionDb.getRecentByProject(projectId, 100);

    // Group executions by scenario and scan type
    const results: Record<string, TestResultSummary> = {};

    // Map scan types (you can expand this based on your needs)
    const scanTypeMap: Record<string, string> = {
      build: 'build',
      context: 'contexts',
      contexts: 'contexts',
      photo: 'photo',
      structure: 'structure',
      vision: 'vision',
    };

    // Initialize all scan types with zero counts
    Object.keys(scanTypeMap).forEach((scanType) => {
      if (!results[scanType]) {
        results[scanType] = {
          scanType,
          totalTests: 0,
          passedTests: 0,
          failedTests: 0,
          runningTests: 0,
          lastRunAt: null,
          executions: [],
          screenshots: [],
        };
      }
    });

    // Process each execution
    for (const execution of executions) {
      // Find the scenario for this execution
      const scenario = scenarios.find((s) => s.id === execution.scenario_id);

      if (!scenario) continue;

      // Determine scan type from scenario name or context
      // You can customize this logic based on your naming conventions
      let scanType = 'build'; // default

      const scenarioNameLower = scenario.name.toLowerCase();
      if (scenarioNameLower.includes('context')) {
        scanType = 'contexts';
      } else if (scenarioNameLower.includes('photo') || scenarioNameLower.includes('screenshot')) {
        scanType = 'photo';
      } else if (scenarioNameLower.includes('structure') || scenarioNameLower.includes('component')) {
        scanType = 'structure';
      } else if (scenarioNameLower.includes('vision') || scenarioNameLower.includes('ui')) {
        scanType = 'vision';
      } else if (scenarioNameLower.includes('build') || scenarioNameLower.includes('compile')) {
        scanType = 'build';
      }

      // Initialize scan type if not exists
      if (!results[scanType]) {
        results[scanType] = {
          scanType,
          totalTests: 0,
          passedTests: 0,
          failedTests: 0,
          runningTests: 0,
          lastRunAt: null,
          executions: [],
          screenshots: [],
        };
      }

      const summary = results[scanType];

      // Update counts
      summary.totalTests++;

      switch (execution.status) {
        case 'passed':
          summary.passedTests++;
          break;
        case 'failed':
          summary.failedTests++;
          break;
        case 'running':
        case 'queued':
          summary.runningTests++;
          break;
      }

      // Update last run time
      if (execution.completed_at) {
        const completedAt = new Date(execution.completed_at).getTime();
        const currentLastRun = summary.lastRunAt
          ? new Date(summary.lastRunAt).getTime()
          : 0;

        if (completedAt > currentLastRun) {
          summary.lastRunAt = execution.completed_at;
        }
      }

      // Add execution to the list
      summary.executions.push(execution);

      // Collect screenshots
      if (execution.screenshots && execution.screenshots.length > 0) {
        execution.screenshots.forEach((screenshot) => {
          if (screenshot.filePath && !summary.screenshots.includes(screenshot.filePath)) {
            summary.screenshots.push(screenshot.filePath);
          }
        });
      }
    }

    // Sort executions by created_at (most recent first)
    Object.values(results).forEach((summary) => {
      summary.executions.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });

    return NextResponse.json({
      success: true,
      results,
      totalScenarios: scenarios.length,
      totalExecutions: executions.length,
    });
  } catch (error) {
    console.error('[API] /api/test-results error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch test results',
      },
      { status: 500 }
    );
  }
}
