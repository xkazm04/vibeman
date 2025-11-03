import { NextRequest, NextResponse } from 'next/server';
import { analyzeProject } from '@/app/features/RefactorWizard/lib/refactorAnalyzer';
import { createErrorResponse } from '@/lib/api-helpers';

export async function POST(request: NextRequest) {
  try {
    const { projectId, projectPath } = await request.json();

    if (!projectPath) {
      return createErrorResponse('Project path is required', 400);
    }

    // Run analysis
    const result = await analyzeProject(projectPath, true);

    return NextResponse.json({
      opportunities: result.opportunities,
      summary: result.summary,
    });
  } catch (error) {
    return createErrorResponse(
      error instanceof Error ? error.message : 'Analysis failed',
      500
    );
  }
}
