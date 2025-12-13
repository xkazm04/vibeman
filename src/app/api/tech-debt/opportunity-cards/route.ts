/**
 * Opportunity Cards API (Consolidated)
 * GET: Fetch active opportunity cards
 * POST: Record interaction with a card
 *
 * This is part of the unified tech-debt API structure
 */

import { NextRequest, NextResponse } from 'next/server';
import { opportunityCardDb, preventionActionDb } from '@/app/db';
import { logger } from '@/lib/logger';

// ============================================================================
// GET: Fetch opportunity cards
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    let cards;

    if (type) {
      cards = opportunityCardDb.getByType(
        projectId,
        type as 'prevention' | 'quick-win' | 'warning' | 'suggestion'
      );
    } else {
      cards = opportunityCardDb.getTopPriority(projectId, limit);
    }

    // Get feedback stats
    const stats = opportunityCardDb.getFeedbackStats(projectId);

    return NextResponse.json({
      cards,
      stats,
      total: cards.length,
    });
  } catch (error) {
    logger.error('[TechDebt OpportunityCards API] GET error:', { data: error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch cards' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST: Record card interaction
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cardId, action, feedback, filesModified, linesChanged, timeSpent } = body;

    if (!cardId || !action) {
      return NextResponse.json(
        { error: 'cardId and action are required' },
        { status: 400 }
      );
    }

    const card = opportunityCardDb.getById(cardId);
    if (!card) {
      return NextResponse.json(
        { error: 'Card not found' },
        { status: 404 }
      );
    }

    switch (action) {
      case 'shown':
        opportunityCardDb.recordShown(cardId);
        break;

      case 'clicked':
        opportunityCardDb.recordClicked(cardId);
        break;

      case 'acted':
        opportunityCardDb.recordActedUpon(cardId, feedback || 'helpful');
        // Record the prevention action
        preventionActionDb.create({
          project_id: card.project_id,
          prediction_id: card.prediction_id,
          opportunity_card_id: cardId,
          action_type: 'micro-refactor',
          action_description: `Applied action from card: ${card.title}`,
          files_modified: filesModified || 1,
          lines_changed: linesChanged || 0,
          time_spent_minutes: timeSpent || card.estimated_time_minutes,
          success: 1,
          prevented_debt_score: card.priority * 10,
          user_satisfaction: feedback === 'helpful' ? 5 : feedback === 'not-helpful' ? 2 : null,
        });
        break;

      case 'dismiss':
        opportunityCardDb.dismiss(cardId);
        break;

      case 'feedback':
        if (feedback) {
          opportunityCardDb.recordActedUpon(cardId, feedback);
        }
        break;

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    const updated = opportunityCardDb.getById(cardId);
    return NextResponse.json({ card: updated });
  } catch (error) {
    logger.error('[TechDebt OpportunityCards API] POST error:', { data: error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to record interaction' },
      { status: 500 }
    );
  }
}
