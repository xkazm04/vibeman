/**
 * Health Dashboard API
 * GET - Get comprehensive health dashboard data for a project
 * POST - Execute quick fix actions
 */

import { NextRequest, NextResponse } from 'next/server';
import { projectHealthDb, ideaDb, goalDb, contextDb, scanDb } from '@/app/db';
import { logger } from '@/lib/logger';
import {
  calculateSetupDimensions,
  generateActionItems,
  generateAchievements,
  calculateSetupCompletion,
  type HealthDashboardData,
  type ActionItem,
  type SetupDimension,
} from '@/lib/health/healthCalculator';
import {
  executeQuickFix,
  type QuickFixId,
  type QuickFixResult,
} from '@/lib/health/quickFixExecutor';
import type { CategoryScores } from '@/app/db/models/project-health.types';

/**
 * GET /api/health/dashboard
 * Get health dashboard data including dimensions, actions, and achievements
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    // Get latest health score
    const health = projectHealthDb.getLatestHealth(projectId);

    // Get project data for dimension calculation
    const contexts = contextDb.getContextsByProject(projectId);
    const goals = goalDb.getGoalsByProject(projectId);
    const ideas = ideaDb.getIdeasByProject(projectId);

    // Get scan count (DbScan doesn't have status, so we count total scans as indicator)
    let scansCompleted = 0;
    try {
      const scans = scanDb.getScansByProject(projectId);
      // Count total scans as a proxy for scan activity
      scansCompleted = scans.length;
    } catch {
      // Scan table might not exist
      scansCompleted = 0;
    }

    // Check if blueprint has been run (has contexts)
    const hasBlueprint = contexts.length > 0;

    // Check API keys (we'll assume they're configured if health exists)
    const hasApiKeys = !!process.env.OPENAI_API_KEY ||
      !!process.env.ANTHROPIC_API_KEY ||
      !!process.env.GEMINI_API_KEY;

    // Calculate setup dimensions
    const dimensions = calculateSetupDimensions(
      hasBlueprint,
      contexts.length,
      goals.length,
      ideas.length,
      scansCompleted,
      hasApiKeys
    );

    // Get category scores from health record or use defaults
    let categoryScores: CategoryScores;
    if (health?.category_scores) {
      categoryScores = JSON.parse(health.category_scores);
    } else {
      categoryScores = {
        idea_backlog: { score: 50, weight: 0.15, trend: 0 },
        tech_debt: { score: 70, weight: 0.25, trend: 0 },
        security: { score: 80, weight: 0.20, trend: 0 },
        test_coverage: { score: 60, weight: 0.15, trend: 0 },
        goal_completion: { score: 50, weight: 0.15, trend: 0 },
        code_quality: { score: 70, weight: 0.10, trend: 0 },
      };
    }

    // Generate action items
    const actionItems = generateActionItems(categoryScores, dimensions);

    // Calculate completed actions (for now, we'll track based on health score improvements)
    const completedActions = 0; // TODO: Track in database

    // Calculate streak days (simplified - would need activity tracking)
    const streakDays = health ? 1 : 0; // TODO: Implement proper streak tracking

    // Generate achievements
    const overallScore = health?.overall_score ?? calculateSetupCompletion(dimensions);
    const achievements = generateAchievements(
      overallScore,
      dimensions,
      completedActions,
      streakDays
    );

    // Build dashboard data
    const dashboardData: HealthDashboardData = {
      overallScore,
      status: health?.status ?? 'fair',
      dimensions,
      actionItems,
      achievements,
      completedActionsCount: completedActions,
      totalActionsCount: actionItems.length,
      streakDays,
      lastActivityDate: health?.created_at ?? null,
    };

    return NextResponse.json({
      success: true,
      data: dashboardData,
      categoryScores,
      setupCompletion: calculateSetupCompletion(dimensions),
    });
  } catch (error) {
    logger.error('Failed to get health dashboard:', { data: error });
    return NextResponse.json(
      { error: 'Failed to get health dashboard', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/health/dashboard
 * Execute a quick fix action
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, quickFixId, options } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    if (!quickFixId) {
      return NextResponse.json(
        { error: 'quickFixId is required' },
        { status: 400 }
      );
    }

    // Execute the quick fix
    const result: QuickFixResult = await executeQuickFix(
      quickFixId as QuickFixId,
      projectId,
      options
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        result,
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error, message: result.message },
        { status: 400 }
      );
    }
  } catch (error) {
    logger.error('Failed to execute quick fix:', { data: error });
    return NextResponse.json(
      { error: 'Failed to execute quick fix', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/health/dashboard
 * Update action item status
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, actionId, status } = body;

    if (!projectId || !actionId) {
      return NextResponse.json(
        { error: 'projectId and actionId are required' },
        { status: 400 }
      );
    }

    // For now, we just acknowledge the update
    // TODO: Persist action statuses in database

    return NextResponse.json({
      success: true,
      actionId,
      status,
      message: 'Action status updated',
    });
  } catch (error) {
    logger.error('Failed to update action status:', { data: error });
    return NextResponse.json(
      { error: 'Failed to update action status', details: String(error) },
      { status: 500 }
    );
  }
}
