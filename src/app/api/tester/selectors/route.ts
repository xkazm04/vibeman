import { NextRequest, NextResponse } from 'next/server';
import { testSelectorDb } from '@/app/db';

/**
 * GET /api/tester/selectors - Get all test selectors for a context
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contextId = searchParams.get('contextId');

    if (!contextId) {
      return NextResponse.json(
        { error: 'Context ID is required' },
        { status: 400 }
      );
    }

    const selectors = testSelectorDb.getSelectorsByContext(contextId);

    // Transform to camelCase
    const data = selectors.map(s => ({
      id: s.id,
      contextId: s.context_id,
      dataTestid: s.data_testid,
      title: s.title,
      filepath: s.filepath,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    }));

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Failed to fetch test selectors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch test selectors' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tester/selectors - Create a new test selector
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contextId, dataTestid, title, filepath } = body;

    if (!contextId || !dataTestid || !title || !filepath) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const selector = testSelectorDb.createSelector({
      id: `selector_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      context_id: contextId,
      data_testid: dataTestid,
      title,
      filepath,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: selector.id,
        contextId: selector.context_id,
        dataTestid: selector.data_testid,
        title: selector.title,
        filepath: selector.filepath,
        createdAt: selector.created_at,
        updatedAt: selector.updated_at,
      },
    });
  } catch (error) {
    console.error('Failed to create test selector:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create test selector' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tester/selectors - Delete test selectors for a context
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contextId = searchParams.get('contextId');

    if (!contextId) {
      return NextResponse.json(
        { error: 'Context ID is required' },
        { status: 400 }
      );
    }

    const deletedCount = testSelectorDb.deleteSelectorsByContext(contextId);

    return NextResponse.json({
      success: true,
      message: `Deleted ${deletedCount} test selectors`,
    });
  } catch (error) {
    console.error('Failed to delete test selectors:', error);
    return NextResponse.json(
      { error: 'Failed to delete test selectors' },
      { status: 500 }
    );
  }
}
