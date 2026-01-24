import { NextRequest, NextResponse } from 'next/server';
import { analyzeProject, scanProjectFiles } from '@/app/features/RefactorWizard/lib/refactorAnalyzer';
import { generateWizardPlan } from '@/app/features/RefactorWizard/lib/wizardOptimizer';
import { createErrorResponse } from '@/lib/api-helpers';
import type { ProjectType } from '@/lib/scan';
import { logger } from '@/lib/logger';
import { withObservability } from '@/lib/observability/middleware';

async function handlePost(request: NextRequest) {
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

    // NEW: Generate packages automatically if enabled
    let packages = [];
    let context = null;
    let dependencyGraph = null;

    if (useAI && result.opportunities.length > 0) {
      try {
        logger.info('[API /analyze] Generating packages...');

        const packageResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/refactor/generate-packages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            opportunities: result.opportunities,
            projectPath,
            userPreferences: {
              provider,
              model,
            },
          }),
        });

        if (packageResponse.ok) {
          const packageData = await packageResponse.json();
          packages = packageData.packages || [];
          context = packageData.context || null;
          dependencyGraph = packageData.dependencyGraph || null;
          logger.info('[API /analyze] Generated', { arg0: packages.length, arg1: 'packages' });
        }
      } catch (error) {
        logger.error('[API /analyze] Failed to generate packages:', { error });
        // Continue without packages (non-fatal)
      }
    }

    return NextResponse.json({
      opportunities: result.opportunities,
      summary: result.summary,
      wizardPlan,
      packages, // NEW
      context, // NEW
      dependencyGraph, // NEW
    });
  } catch (error) {
    return createErrorResponse(
      error instanceof Error ? error.message : 'Analysis failed',
      500
    );
  }
}

// Export with observability tracking
export const POST = withObservability(handlePost, '/api/refactor/analyze');
