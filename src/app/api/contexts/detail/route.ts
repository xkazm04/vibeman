import { NextRequest, NextResponse } from 'next/server';
import { contextQueries } from '../../../../lib/queries/contextQueries';
import { withObservability } from '@/lib/observability/middleware';

// GET /api/contexts/detail - Get detailed information about a specific context
async function handleGet(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contextId = searchParams.get('contextId');
    const name = searchParams.get('name');
    const projectId = searchParams.get('projectId');

    // Validate input parameters
    if (!contextId && (!name || !projectId)) {
      return NextResponse.json(
        { error: 'Either contextId or (name + projectId) is required' },
        { status: 400 }
      );
    }

    // Find context by ID or name - direct DB lookup (O(1) instead of loading all contexts)
    const context = contextId
      ? await findContextById(contextId)
      : await findContextByName(name!, projectId!);

    if (!context) {
      return NextResponse.json(
        { error: 'Context not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: context
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch context detail' },
      { status: 500 }
    );
  }
}

/**
 * Find context by ID - direct O(1) primary key lookup
 */
async function findContextById(contextId: string): Promise<any | null> {
  return await contextQueries.getContextById(contextId);
}

/**
 * Find context by name and projectId - direct indexed query
 */
async function findContextByName(name: string, projectId: string): Promise<any | null> {
  return await contextQueries.getContextByName(name, projectId);
}

export const GET = withObservability(handleGet, '/api/contexts/detail');
