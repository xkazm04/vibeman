import { NextRequest, NextResponse } from 'next/server';
import { analyzeProject, scanProjectFiles } from '@/app/features/RefactorWizard/lib/refactorAnalyzer';
import { generateWizardPlan } from '@/app/features/RefactorWizard/lib/wizardOptimizer';
import { createErrorResponse } from '@/lib/api-helpers';
import type { ProjectType } from '@/lib/scan';

export async function POST(request: NextRequest) {
  try {
    const {
      projectId,
      projectPath,
      projectType,
      useAI = true,
      provider = 'gemini',
      model,
      selectedGroups
    } = await request.json();

    if (!projectPath) {
      return createErrorResponse('Project path is required', 400);
    }

    // First, scan files for wizard plan generation (using strategy pattern)
    const files = await scanProjectFiles(projectPath, projectType as ProjectType);

    // Generate AI-powered wizard plan
    let wizardPlan = null;
    if (useAI && files.length > 0) {
      const planResult = await generateWizardPlan(files, provider, model);
      if (planResult.success && planResult.plan) {
        wizardPlan = planResult.plan;
      }
    }

    // Run full analysis with optional group filtering and project type
    const result = await analyzeProject(projectPath, useAI, provider, model, selectedGroups, projectType as ProjectType);

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
