/**
 * Debt Prediction Stats API
 * GET: Fetch comprehensive statistics for debt prediction system
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  debtPredictionDb,
  debtPatternDb,
  opportunityCardDb,
  preventionActionDb,
  complexityHistoryDb,
} from '@/app/db';

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

    // Get prediction counts by status
    const statusCounts = debtPredictionDb.getCountByStatus(projectId);

    // Get active predictions summary
    const activePredictions = debtPredictionDb.getActiveByProject(projectId);
    const urgentPredictions = debtPredictionDb.getUrgent(projectId, 70);
    const acceleratingPredictions = debtPredictionDb.getAccelerating(projectId);

    // Get patterns with high occurrence
    const highOccurrencePatterns = debtPatternDb.getHighOccurrence(projectId, 5);
    const allPatterns = debtPatternDb.getByProject(projectId);

    // Get opportunity cards stats
    const cardStats = opportunityCardDb.getFeedbackStats(projectId);
    const activeCards = opportunityCardDb.getActiveByProject(projectId);

    // Get prevention action stats
    const successRate = preventionActionDb.getSuccessRate(projectId);
    const totalDebtPrevented = preventionActionDb.getTotalDebtPrevented(projectId);
    const recentActions = preventionActionDb.getByProject(projectId, 10);

    // Calculate trend summary
    const trendSummary = {
      filesIncreasing: 0,
      filesStable: 0,
      filesDecreasing: 0,
    };

    // Get unique file paths from active predictions
    const uniqueFiles = new Set(activePredictions.map(p => p.file_path));
    uniqueFiles.forEach(filePath => {
      const trend = complexityHistoryDb.getTrend(projectId, filePath, 30);
      if (trend.trend === 'increasing') trendSummary.filesIncreasing++;
      else if (trend.trend === 'decreasing') trendSummary.filesDecreasing++;
      else trendSummary.filesStable++;
    });

    // Calculate health score (0-100)
    const healthScore = calculateHealthScore({
      activePredictions: activePredictions.length,
      urgentCount: urgentPredictions.length,
      acceleratingCount: acceleratingPredictions.length,
      successRate,
      totalDebtPrevented,
      cardHelpfulRate: cardStats.helpful / (cardStats.helpful + cardStats.notHelpful + 1),
    });

    return NextResponse.json({
      healthScore,
      predictions: {
        total: Object.values(statusCounts).reduce((a, b) => a + b, 0),
        active: statusCounts['active'] || 0,
        addressed: statusCounts['addressed'] || 0,
        dismissed: statusCounts['dismissed'] || 0,
        escalated: statusCounts['escalated'] || 0,
        urgent: urgentPredictions.length,
        accelerating: acceleratingPredictions.length,
        byType: {
          emerging: activePredictions.filter(p => p.prediction_type === 'emerging').length,
          accelerating: activePredictions.filter(p => p.prediction_type === 'accelerating').length,
          imminent: activePredictions.filter(p => p.prediction_type === 'imminent').length,
          exists: activePredictions.filter(p => p.prediction_type === 'exists').length,
        },
      },
      patterns: {
        total: allPatterns.length,
        predefined: allPatterns.filter(p => p.source === 'predefined').length,
        learned: allPatterns.filter(p => p.source === 'learned').length,
        highOccurrence: highOccurrencePatterns.length,
        topPatterns: highOccurrencePatterns.slice(0, 5).map(p => ({
          name: p.name,
          category: p.category,
          occurrenceCount: p.occurrence_count,
          severity: p.severity,
        })),
      },
      opportunityCards: {
        active: activeCards.length,
        feedback: cardStats,
        helpfulRate: cardStats.helpful / (cardStats.helpful + cardStats.notHelpful + 1) * 100,
      },
      prevention: {
        successRate,
        totalDebtPrevented,
        recentActionsCount: recentActions.length,
        averageTimeSpent: recentActions.length > 0
          ? recentActions.reduce((sum, a) => sum + (a.time_spent_minutes || 0), 0) / recentActions.length
          : 0,
      },
      trends: trendSummary,
    });
  } catch (error) {
    console.error('[DebtPrediction Stats API] GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}

function calculateHealthScore(metrics: {
  activePredictions: number;
  urgentCount: number;
  acceleratingCount: number;
  successRate: number;
  totalDebtPrevented: number;
  cardHelpfulRate: number;
}): number {
  let score = 100;

  // Deduct for active issues
  score -= Math.min(30, metrics.activePredictions * 2);

  // Deduct more for urgent issues
  score -= Math.min(25, metrics.urgentCount * 5);

  // Deduct for accelerating debt
  score -= Math.min(20, metrics.acceleratingCount * 4);

  // Add back for success rate
  score += (metrics.successRate / 100) * 15;

  // Add back for helpful cards
  score += metrics.cardHelpfulRate * 10;

  return Math.max(0, Math.min(100, Math.round(score)));
}
