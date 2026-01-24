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

    // Find context by ID or name
    const context = contextId
      ? await findContextById(contextId, projectId)
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
 * Find context by ID, with fallback to projectId if provided
 */
async function findContextById(contextId: string, projectId: string | null): Promise<any | null> {
  // First try to extract projectId from contextId if it follows pattern "projectId-contextName"
  const possibleProjectId = contextId.split('-')[0];
  let contexts = await contextQueries.getContextsByProject(possibleProjectId || projectId || '');
  let context = contexts.find(c => c.id === contextId);

  // If not found and we have projectId, try that
  if (!context && projectId) {
    const projectContexts = await contextQueries.getContextsByProject(projectId);
    context = projectContexts.find(c => c.id === contextId);
  }

  return context || null;
}

/**
 * Find context by name and projectId
 */
async function findContextByName(name: string, projectId: string): Promise<any | null> {
  const contexts = await contextQueries.getContextsByProject(projectId);
  return contexts.find(c => c.name.toLowerCase() === name.toLowerCase()) || null;
}

export const GET = withObservability(handleGet, '/api/contexts/detail');
