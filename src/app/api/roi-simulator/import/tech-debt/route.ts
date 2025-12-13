/**
 * API Route: ROI Simulator - Import from Tech Debt
 * Imports tech debt items as refactoring economics items
 */

import { NextRequest, NextResponse } from 'next/server';
import { refactoringEconomicsDb, techDebtDb } from '@/app/db';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, techDebtIds } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    if (!techDebtIds || !Array.isArray(techDebtIds) || techDebtIds.length === 0) {
      return NextResponse.json(
        { error: 'techDebtIds array is required' },
        { status: 400 }
      );
    }

    let imported = 0;

    for (const techDebtId of techDebtIds) {
      const techDebt = techDebtDb.getTechDebtById(techDebtId);
      if (!techDebt) continue;

      // Check if already imported
      const existing = refactoringEconomicsDb.getBySource('tech_debt', techDebtId);
      if (existing.length > 0) continue;

      // Map tech debt category to refactoring category
      const categoryMap: Record<string, string> = {
        code_quality: 'code_quality',
        security: 'security',
        performance: 'performance',
        architecture: 'architecture',
        testing: 'testing',
        documentation: 'documentation',
        dependency: 'dependency',
      };

      const category = categoryMap[techDebt.category] || 'code_quality';

      // Map severity to risk levels
      const severityRiskMap: Record<string, number> = {
        critical: 85,
        high: 70,
        medium: 50,
        low: 30,
      };

      const securityRiskBefore = severityRiskMap[techDebt.severity] || 50;

      // Create refactoring economics item
      refactoringEconomicsDb.create({
        project_id: projectId,
        source_type: 'tech_debt',
        source_id: techDebtId,
        title: techDebt.title,
        description: techDebt.description,
        category: category as Parameters<typeof refactoringEconomicsDb.create>[0]['category'],
        estimated_hours: techDebt.estimated_effort_hours || 8,
        hourly_rate: 100,
        opportunity_cost_factor: 0.5,
        risk_premium: techDebt.severity === 'critical' ? 0.3 : techDebt.severity === 'high' ? 0.2 : 0.1,
        learning_overhead: 0.2,
        testing_overhead: 0.3,
        velocity_improvement: techDebt.severity === 'critical' ? 15 : techDebt.severity === 'high' ? 10 : 5,
        maintainability_score_before: 100 - (techDebt.risk_score || 50),
        maintainability_score_after: Math.min(100, 100 - (techDebt.risk_score || 50) + 20),
        security_risk_before: securityRiskBefore,
        security_risk_after: Math.max(10, securityRiskBefore - 30),
        bug_probability_before: techDebt.severity === 'critical' ? 0.3 : techDebt.severity === 'high' ? 0.2 : 0.1,
        bug_probability_after: 0.05,
        code_complexity_before: techDebt.risk_score || 50,
        code_complexity_after: Math.max(20, (techDebt.risk_score || 50) - 20),
        status: 'proposed',
        confidence_level: 60,
        completed_at: null,
      });

      imported++;
    }

    return NextResponse.json({
      success: true,
      imported,
    });
  } catch (error) {
    logger.error('Failed to import tech debt:', { data: error });
    return NextResponse.json(
      { error: 'Failed to import tech debt', details: String(error) },
      { status: 500 }
    );
  }
}
