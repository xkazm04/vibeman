/**
 * API Route: ROI Simulator - Import from Ideas
 * Imports ideas as refactoring economics items
 */

import { NextRequest, NextResponse } from 'next/server';
import { refactoringEconomicsDb, ideaDb } from '@/app/db';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, ideaIds } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    if (!ideaIds || !Array.isArray(ideaIds) || ideaIds.length === 0) {
      return NextResponse.json(
        { error: 'ideaIds array is required' },
        { status: 400 }
      );
    }

    let imported = 0;

    for (const ideaId of ideaIds) {
      const idea = ideaDb.getIdeaById(ideaId);
      if (!idea) continue;

      // Check if already imported
      const existing = refactoringEconomicsDb.getBySource('idea', ideaId);
      if (existing.length > 0) continue;

      // Map idea category to refactoring category
      const categoryMap: Record<string, string> = {
        refactoring: 'code_quality',
        performance: 'performance',
        security: 'security',
        testing: 'testing',
        documentation: 'documentation',
        architecture: 'architecture',
        cleanup: 'maintainability',
        optimization: 'performance',
        bug_fix: 'code_quality',
        feature: 'code_quality',
      };

      const category = categoryMap[idea.category?.toLowerCase() || ''] || 'code_quality';

      // Map 1-10 effort to hours (roughly)
      const effortToHours: Record<number, number> = {
        1: 2, 2: 4, 3: 8, 4: 16, 5: 24,
        6: 40, 7: 60, 8: 80, 9: 120, 10: 200,
      };

      const estimatedHours = effortToHours[idea.effort || 5] || 24;

      // Map 1-10 impact to velocity improvement
      const impactToVelocity: Record<number, number> = {
        1: 1, 2: 2, 3: 3, 4: 5, 5: 7,
        6: 10, 7: 12, 8: 15, 9: 20, 10: 25,
      };

      const velocityImprovement = impactToVelocity[idea.impact || 5] || 7;

      // Map risk to security metrics
      const riskBefore = idea.risk ? idea.risk * 10 : 50;

      // Create refactoring economics item
      refactoringEconomicsDb.create({
        project_id: projectId,
        source_type: 'idea',
        source_id: ideaId,
        title: idea.title,
        description: idea.description,
        category: category as Parameters<typeof refactoringEconomicsDb.create>[0]['category'],
        estimated_hours: estimatedHours,
        hourly_rate: 100,
        opportunity_cost_factor: 0.5,
        risk_premium: (idea.risk || 5) > 7 ? 0.2 : (idea.risk || 5) > 4 ? 0.1 : 0.05,
        learning_overhead: 0.2,
        testing_overhead: category === 'testing' ? 0.1 : 0.3,
        velocity_improvement: velocityImprovement,
        maintainability_score_before: 50,
        maintainability_score_after: Math.min(100, 50 + (idea.impact || 5) * 3),
        security_risk_before: riskBefore,
        security_risk_after: Math.max(10, riskBefore - 20),
        bug_probability_before: 0.1,
        bug_probability_after: category === 'code_quality' ? 0.03 : 0.07,
        code_complexity_before: 50 + (idea.effort || 5) * 3,
        code_complexity_after: 40,
        status: idea.status === 'implemented' ? 'completed' : 'proposed',
        confidence_level: 70,
        completed_at: idea.implemented_at || null,
      });

      imported++;
    }

    return NextResponse.json({
      success: true,
      imported,
    });
  } catch (error) {
    logger.error('Failed to import ideas:', { data: error });
    return NextResponse.json(
      { error: 'Failed to import ideas', details: String(error) },
      { status: 500 }
    );
  }
}
