import { NextRequest, NextResponse } from 'next/server';
import { testCaseScenarioRepository } from '@/app/db/repositories/test-case-scenario.repository';

/**
 * GET /api/test-case-scenarios?contextId=xxx
 * Get all test case scenarios for a context
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contextId = searchParams.get('contextId');

    if (!contextId) {
      return NextResponse.json(
        { success: false, error: 'contextId is required' },
        { status: 400 }
      );
    }

    const scenarios = testCaseScenarioRepository.getScenariosByContext(contextId);

    return NextResponse.json({
      success: true,
      scenarios,
    });
  } catch (error) {
    console.error('[API] Error fetching test case scenarios:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch test case scenarios' },
      { status: 500 }
    );
  }
}
