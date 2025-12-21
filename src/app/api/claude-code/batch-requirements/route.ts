import { NextRequest, NextResponse } from 'next/server';
import { listRequirements } from '@/app/Claude/sub_ClaudeCodeManager/folderManager';

/**
 * POST /api/claude-code/batch-requirements
 * Get requirements for multiple projects in a single request
 *
 * Request body: { projectPaths: Array<{ id: string; path: string }> }
 * Response: { requirements: Record<projectId, string[]> }
 *
 * This eliminates N+1 queries when loading TaskRunner with many projects
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectPaths } = body;

    if (!projectPaths || !Array.isArray(projectPaths)) {
      return NextResponse.json(
        { error: 'projectPaths array is required in request body' },
        { status: 400 }
      );
    }

    // Limit to prevent abuse
    if (projectPaths.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 projects allowed per request' },
        { status: 400 }
      );
    }

    // Fetch requirements for all projects in parallel
    const results = await Promise.all(
      projectPaths.map(async ({ id, path }: { id: string; path: string }) => {
        try {
          const result = listRequirements(path);
          return {
            id,
            requirements: result.success ? result.requirements || [] : [],
          };
        } catch {
          return { id, requirements: [] };
        }
      })
    );

    // Convert to map format
    const requirements: Record<string, string[]> = {};
    for (const { id, requirements: reqs } of results) {
      requirements[id] = reqs;
    }

    return NextResponse.json({ requirements });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch requirements' },
      { status: 500 }
    );
  }
}
