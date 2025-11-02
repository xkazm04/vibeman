import { NextRequest, NextResponse } from 'next/server';
import { contextDb } from '@/app/db';

/**
 * PATCH /api/contexts/preview - Update context preview image and test scenario
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { contextId, preview, testScenario } = body;

    if (!contextId) {
      return NextResponse.json(
        { error: 'Context ID is required' },
        { status: 400 }
      );
    }

    // preview can be null to remove the preview, or a string path
    if (preview !== null && preview !== undefined && typeof preview !== 'string') {
      return NextResponse.json(
        { error: 'Preview must be a string path or null' },
        { status: 400 }
      );
    }

    // testScenario can be null to remove it, or a string
    if (testScenario !== null && testScenario !== undefined && typeof testScenario !== 'string') {
      return NextResponse.json(
        { error: 'Test scenario must be a string or null' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (preview !== undefined) {
      updateData.preview = preview || null;
    }
    if (testScenario !== undefined) {
      updateData.test_scenario = testScenario || null;
    }

    const updatedContext = contextDb.updateContext(contextId, updateData);

    if (!updatedContext) {
      return NextResponse.json(
        { error: 'Context not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedContext,
    });
  } catch (error) {
    console.error('Failed to update context preview:', error);
    return NextResponse.json(
      {
        error: 'Failed to update context preview',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
