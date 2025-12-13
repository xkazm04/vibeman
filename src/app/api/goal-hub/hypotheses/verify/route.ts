/**
 * Hypothesis Verification API
 * Mark a hypothesis as verified with evidence
 */

import { NextRequest, NextResponse } from 'next/server';
import { goalHubDb } from '@/app/db';
import { logger } from '@/lib/logger';
import { createErrorResponse, notFoundResponse } from '@/lib/api-helpers';
import type { EvidenceType } from '@/app/db/models/goal-hub.types';

/**
 * POST /api/goal-hub/hypotheses/verify
 * Verify a hypothesis with evidence
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { hypothesisId, evidence, evidenceType } = body as {
      hypothesisId: string;
      evidence: string;
      evidenceType: EvidenceType;
    };

    if (!hypothesisId || !evidence || !evidenceType) {
      return createErrorResponse('hypothesisId, evidence, and evidenceType are required', 400);
    }

    const hypothesis = goalHubDb.hypotheses.verify(hypothesisId, evidence, evidenceType);

    if (!hypothesis) {
      return notFoundResponse('Hypothesis');
    }

    // Update goal progress
    goalHubDb.extensions.updateProgress(hypothesis.goalId);

    // Check if all hypotheses are verified
    const counts = goalHubDb.hypotheses.getCounts(hypothesis.goalId);
    const allVerified = counts.total > 0 && counts.verified === counts.total;

    return NextResponse.json({
      hypothesis,
      goalProgress: {
        total: counts.total,
        verified: counts.verified,
        progress: counts.total > 0 ? Math.round((counts.verified / counts.total) * 100) : 0,
        allVerified,
      },
    });
  } catch (error) {
    logger.error('Error in POST /api/goal-hub/hypotheses/verify:', { data: error });
    return createErrorResponse('Internal server error', 500);
  }
}
