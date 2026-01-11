import { NextRequest, NextResponse } from 'next/server';
import { requirementExists } from '@/app/Claude/lib/claudeCodeManager';

/**
 * POST /api/claude-code/requirement/exists
 * Check if a requirement file exists in the .claude/commands directory
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectPath, requirementName } = body;

    if (!projectPath || !requirementName) {
      return NextResponse.json(
        { error: 'projectPath and requirementName are required' },
        { status: 400 }
      );
    }

    const exists = requirementExists(projectPath, requirementName);

    return NextResponse.json({
      exists,
      projectPath,
      requirementName,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to check requirement existence',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
