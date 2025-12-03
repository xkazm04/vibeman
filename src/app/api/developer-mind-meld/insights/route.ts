/**
 * Developer Mind-Meld Insights API
 * Manage learning insights
 */

import { NextRequest, NextResponse } from 'next/server';
import { developerProfileDb, learningInsightDb } from '@/app/db';

/**
 * GET /api/developer-mind-meld/insights
 * Get all active insights for a project
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const type = searchParams.get('type');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    const profile = developerProfileDb.getByProject(projectId);
    if (!profile) {
      return NextResponse.json({
        success: true,
        insights: [],
      });
    }

    let insights;
    if (type) {
      insights = learningInsightDb.getByType(
        profile.id,
        type as Parameters<typeof learningInsightDb.getByType>[1]
      );
    } else {
      insights = learningInsightDb.getActiveByProfile(profile.id);
    }

    return NextResponse.json({
      success: true,
      insights,
    });
  } catch (error) {
    console.error('Error fetching insights:', error);
    return NextResponse.json(
      { error: 'Failed to fetch insights' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/developer-mind-meld/insights
 * Update insight status (acknowledge, dismiss, apply)
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { insightId, action } = body;

    if (!insightId || !action) {
      return NextResponse.json(
        { error: 'insightId and action are required' },
        { status: 400 }
      );
    }

    let updatedInsight;
    switch (action) {
      case 'acknowledge':
        updatedInsight = learningInsightDb.acknowledge(insightId);
        break;
      case 'dismiss':
        updatedInsight = learningInsightDb.dismiss(insightId);
        break;
      case 'apply':
        updatedInsight = learningInsightDb.updateStatus(insightId, 'applied');
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: acknowledge, dismiss, or apply' },
          { status: 400 }
        );
    }

    if (!updatedInsight) {
      return NextResponse.json(
        { error: 'Insight not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      insight: updatedInsight,
    });
  } catch (error) {
    console.error('Error updating insight:', error);
    return NextResponse.json(
      { error: 'Failed to update insight' },
      { status: 500 }
    );
  }
}
