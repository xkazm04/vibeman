import { NextRequest, NextResponse } from 'next/server';
import { loadProjectContext } from '@/app/features/RefactorWizard/lib/contextLoader';

/**
 * GET /api/project/context?projectPath=...
 * Load project context from CLAUDE.md, README, package.json
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectPath = searchParams.get('projectPath');

    if (!projectPath) {
      return NextResponse.json(
        { success: false, error: 'projectPath query parameter is required' },
        { status: 400 }
      );
    }

    console.log('[API /project/context] Loading context for:', projectPath);

    const context = await loadProjectContext(projectPath);

    console.log('[API /project/context] Context loaded successfully');
    console.log('[API /project/context] Project type:', context.projectType);
    console.log('[API /project/context] Tech stack:', context.techStack);

    return NextResponse.json({
      success: true,
      context
    });
  } catch (error) {
    console.error('[API /project/context] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load project context'
      },
      { status: 500 }
    );
  }
}
