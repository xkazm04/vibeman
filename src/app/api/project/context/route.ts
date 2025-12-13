import { NextRequest, NextResponse } from 'next/server';
import { loadProjectContext } from '@/app/features/RefactorWizard/lib/contextLoader';
import { logger } from '@/lib/logger';

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

    logger.info('[API /project/context] Loading context for:', { projectPath });

    const context = await loadProjectContext(projectPath);

    logger.info('[API /project/context] Context loaded successfully');
    logger.info('[API /project/context] Project type:', { data: context.projectType });
    logger.info('[API /project/context] Tech stack:', { data: context.techStack });

    return NextResponse.json({
      success: true,
      context
    });
  } catch (error) {
    logger.error('[API /project/context] Error:', { error });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load project context'
      },
      { status: 500 }
    );
  }
}
