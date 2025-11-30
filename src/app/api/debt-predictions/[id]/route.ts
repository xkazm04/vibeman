/**
 * Individual Debt Prediction API
 * GET: Fetch single prediction
 * PATCH: Update prediction status
 * DELETE: Delete prediction
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  debtPredictionDb,
  preventionActionDb,
  opportunityCardDb,
} from '@/app/db';

// ============================================================================
// GET: Fetch single prediction
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const prediction = debtPredictionDb.getById(id);

    if (!prediction) {
      return NextResponse.json(
        { error: 'Prediction not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ prediction });
  } catch (error) {
    console.error('[DebtPrediction API] GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch prediction' },
      { status: 500 }
    );
  }
}

// ============================================================================
// PATCH: Update prediction status
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, reason, files_modified, lines_changed, time_spent } = body;

    const prediction = debtPredictionDb.getById(id);
    if (!prediction) {
      return NextResponse.json(
        { error: 'Prediction not found' },
        { status: 404 }
      );
    }

    let updated;

    switch (action) {
      case 'dismiss':
        updated = debtPredictionDb.dismiss(id, reason || 'User dismissed');
        // Record the action
        preventionActionDb.create({
          project_id: prediction.project_id,
          prediction_id: id,
          opportunity_card_id: null,
          action_type: 'dismiss',
          action_description: reason || 'User dismissed the prediction',
          files_modified: 0,
          lines_changed: 0,
          time_spent_minutes: null,
          success: 1,
          prevented_debt_score: null,
          user_satisfaction: null,
        });
        break;

      case 'address':
        updated = debtPredictionDb.markAddressed(id);
        // Record the action
        preventionActionDb.create({
          project_id: prediction.project_id,
          prediction_id: id,
          opportunity_card_id: null,
          action_type: 'micro-refactor',
          action_description: 'User addressed the issue',
          files_modified: files_modified || 1,
          lines_changed: lines_changed || 0,
          time_spent_minutes: time_spent || null,
          success: 1,
          prevented_debt_score: prediction.urgency_score * 0.5,
          user_satisfaction: null,
        });
        break;

      case 'escalate':
        updated = debtPredictionDb.escalate(id);
        // Record the action
        preventionActionDb.create({
          project_id: prediction.project_id,
          prediction_id: id,
          opportunity_card_id: null,
          action_type: 'escalate',
          action_description: 'User escalated for full refactoring',
          files_modified: 0,
          lines_changed: 0,
          time_spent_minutes: null,
          success: 1,
          prevented_debt_score: null,
          user_satisfaction: null,
        });
        break;

      case 'defer':
        updated = debtPredictionDb.update(id, {
          status: 'active',
          dismissed_reason: `Deferred: ${reason || 'User deferred action'}`,
        });
        preventionActionDb.create({
          project_id: prediction.project_id,
          prediction_id: id,
          opportunity_card_id: null,
          action_type: 'defer',
          action_description: reason || 'User deferred action',
          files_modified: 0,
          lines_changed: 0,
          time_spent_minutes: null,
          success: 1,
          prevented_debt_score: null,
          user_satisfaction: null,
        });
        break;

      default:
        // Generic update
        updated = debtPredictionDb.update(id, body);
    }

    return NextResponse.json({ prediction: updated });
  } catch (error) {
    console.error('[DebtPrediction API] PATCH error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update prediction' },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE: Delete prediction
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = debtPredictionDb.delete(id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Prediction not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DebtPrediction API] DELETE error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete prediction' },
      { status: 500 }
    );
  }
}
