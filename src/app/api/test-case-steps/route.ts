import { NextRequest, NextResponse } from 'next/server';
import { testCaseStepRepository } from '@/app/db/repositories/test-case-step.repository';

/**
 * GET /api/test-case-steps?scenarioId=xxx
 * Get all test case steps for a scenario
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scenarioId = searchParams.get('scenarioId');

    if (!scenarioId) {
      return NextResponse.json(
        { success: false, error: 'scenarioId is required' },
        { status: 400 }
      );
    }

    const steps = testCaseStepRepository.getStepsByScenario(scenarioId);

    return NextResponse.json({
      success: true,
      steps,
    });
  } catch (error) {
    console.error('[API] Error fetching test case steps:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch test case steps' },
      { status: 500 }
    );
  }
}
