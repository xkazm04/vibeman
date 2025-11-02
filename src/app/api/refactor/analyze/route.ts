import { NextRequest, NextResponse } from 'next/server';
import { analyzeProject } from '@/app/features/RefactorWizard/lib/refactorAnalyzer';

export async function POST(request: NextRequest) {
  try {
    const { projectId, projectPath } = await request.json();

    if (!projectPath) {
      return NextResponse.json(
        { error: 'Project path is required' },
        { status: 400 }
      );
    }

    // Run analysis
    const result = await analyzeProject(projectPath, true);

    return NextResponse.json({
      opportunities: result.opportunities,
      summary: result.summary,
    });
  } catch (error) {
    console.error('Refactor analysis error:', error);
    return NextResponse.json(
      {
        error: 'Analysis failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
