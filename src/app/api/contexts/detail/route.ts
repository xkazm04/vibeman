import { NextRequest, NextResponse } from 'next/server';
import { contextQueries } from '../../../../lib/queries/contextQueries';

// GET /api/contexts/detail - Get detailed information about a specific context
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contextId = searchParams.get('contextId');
    const name = searchParams.get('name');
    const projectId = searchParams.get('projectId');

    // Must provide either contextId or (name + projectId)
    if (!contextId && (!name || !projectId)) {
      return NextResponse.json(
        { error: 'Either contextId or (name + projectId) is required' },
        { status: 400 }
      );
    }

    let context;

    if (contextId) {
      // Get by ID - need to search across all contexts
      // First try to extract projectId from contextId if it follows pattern "projectId-contextName"
      const possibleProjectId = contextId.split('-')[0];
      const contexts = await contextQueries.getContextsByProject(possibleProjectId || projectId || '');
      context = contexts.find(c => c.id === contextId);
      
      // If not found and we have projectId, try that
      if (!context && projectId) {
        const projectContexts = await contextQueries.getContextsByProject(projectId);
        context = projectContexts.find(c => c.id === contextId);
      }
    } else {
      // Get by name and projectId
      const contexts = await contextQueries.getContextsByProject(projectId!);
      context = contexts.find(c => c.name.toLowerCase() === name!.toLowerCase());
    }

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
    console.error('Failed to fetch context detail:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch context detail' },
      { status: 500 }
    );
  }
}
