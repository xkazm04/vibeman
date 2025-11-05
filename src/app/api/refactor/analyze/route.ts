import { NextRequest, NextResponse } from 'next/server';
import { analyzeProject, scanProjectFiles } from '@/app/features/RefactorWizard/lib/refactorAnalyzer';
import { generateWizardPlan } from '@/app/features/RefactorWizard/lib/wizardOptimizer';
import { createErrorResponse } from '@/lib/api-helpers';

export async function POST(request: NextRequest) {
  try {
    const { projectId, projectPath, useAI = true, provider = 'gemini', model } = await request.json();

    if (!projectPath) {
      return createErrorResponse('Project path is required', 400);
    }

    // First, scan files for wizard plan generation
    const files = await scanProjectFiles(projectPath);

    // Generate AI-powered wizard plan
    let wizardPlan = null;
    if (useAI && files.length > 0) {
      const planResult = await generateWizardPlan(files, provider, model);
      if (planResult.success && planResult.plan) {
        wizardPlan = planResult.plan;
      }
    }

    // Run full analysis
    const result = await analyzeProject(projectPath, useAI, provider, model);

    return NextResponse.json({
      opportunities: result.opportunities,
      summary: result.summary,
      wizardPlan,
    });
  } catch (error) {
    return createErrorResponse(
      error instanceof Error ? error.message : 'Analysis failed',
      500
    );
  }
}
