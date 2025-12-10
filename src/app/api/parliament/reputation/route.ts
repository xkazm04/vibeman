import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { reputationDb } from '@/app/features/Parliament/lib/reputationRepository';
import type { ScanType } from '@/app/features/Ideas/lib/scanTypes';
import { SCAN_TYPE_CONFIGS } from '@/app/features/Ideas/lib/scanTypes';

/**
 * GET /api/parliament/reputation
 * Get agent reputation data
 *
 * Query params:
 * - projectId: string (required)
 * - agentType: string (optional - get specific agent)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const agentType = searchParams.get('agentType');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    // Get specific agent reputation
    if (agentType) {
      const reputation = reputationDb.getAgentReputation(
        agentType as ScanType,
        projectId
      );

      if (!reputation) {
        return NextResponse.json(
          { error: 'No reputation data for this agent' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        reputation: {
          ...reputation,
          trend: calculateTrend(reputation),
          recentValidations: 0, // Would need history tracking
          recentRejections: 0,
        },
      });
    }

    // Get all agent reputations for project
    const reputations = reputationDb.getProjectReputations(projectId);

    // Also include agents with no reputation data yet (with defaults)
    const allAgentTypes = SCAN_TYPE_CONFIGS.map(c => c.value);
    const existingAgentTypes = new Set(reputations.map(r => r.agentType));

    const allReputations = [
      ...reputations.map(r => ({
        ...r,
        trend: calculateTrend(r) as 'up' | 'down' | 'stable',
        recentValidations: 0,
        recentRejections: 0,
      })),
      ...allAgentTypes
        .filter(t => !existingAgentTypes.has(t))
        .map(agentType => ({
          agentType,
          projectId,
          totalCritiques: 0,
          validatedCritiques: 0,
          rejectedCritiques: 0,
          accuracyRate: 0.5,
          reputationScore: 50,
          lastUpdated: new Date().toISOString(),
          trend: 'stable' as const,
          recentValidations: 0,
          recentRejections: 0,
        })),
    ];

    // Sort by reputation score
    allReputations.sort((a, b) => b.reputationScore - a.reputationScore);

    return NextResponse.json({ reputations: allReputations });
  } catch (error) {
    console.error('Get reputation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/parliament/reputation
 * Update agent reputation (validate/reject critique)
 *
 * Body:
 * - action: 'validate_critique' | 'update_reputation'
 * - projectId: string
 * - agentType: string
 * - validated: boolean (for validate_critique)
 * - debateSessionId: string (optional - for validate_critique)
 * - critiqueId: string (optional - for validate_critique)
 * - feedback: string (optional)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      action,
      projectId,
      agentType,
      validated,
      debateSessionId,
      critiqueId,
      feedback,
    } = body;

    if (!projectId || !agentType) {
      return NextResponse.json(
        { error: 'projectId and agentType are required' },
        { status: 400 }
      );
    }

    if (action === 'validate_critique') {
      if (validated === undefined) {
        return NextResponse.json(
          { error: 'validated field is required for validate_critique' },
          { status: 400 }
        );
      }

      // If we have a specific critique, validate it
      if (debateSessionId && critiqueId) {
        reputationDb.validateCritique({
          id: uuidv4(),
          debateSessionId,
          critiqueId,
          agentType: agentType as ScanType,
          validated,
          feedback,
          validatedAt: new Date().toISOString(),
        });
      } else {
        // Just update reputation directly
        reputationDb.updateReputationFromValidation(
          agentType as ScanType,
          projectId,
          validated
        );
      }

      const updatedReputation = reputationDb.getAgentReputation(
        agentType as ScanType,
        projectId
      );

      return NextResponse.json({
        success: true,
        reputation: updatedReputation,
      });
    }

    if (action === 'update_reputation') {
      // Direct reputation update (admin/manual override)
      const { reputationScore, accuracyRate } = body;

      const currentReputation = reputationDb.getAgentReputation(
        agentType as ScanType,
        projectId
      ) || {
        agentType: agentType as ScanType,
        projectId,
        totalCritiques: 0,
        validatedCritiques: 0,
        rejectedCritiques: 0,
        accuracyRate: 0.5,
        reputationScore: 50,
        lastUpdated: new Date().toISOString(),
      };

      const updatedReputation = reputationDb.upsertAgentReputation({
        ...currentReputation,
        reputationScore: reputationScore ?? currentReputation.reputationScore,
        accuracyRate: accuracyRate ?? currentReputation.accuracyRate,
      });

      return NextResponse.json({
        success: true,
        reputation: updatedReputation,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Update reputation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Calculate trend based on recent history
 */
function calculateTrend(reputation: {
  accuracyRate: number;
  totalCritiques: number;
}): 'up' | 'down' | 'stable' {
  // Simplified: based on accuracy rate
  if (reputation.totalCritiques < 3) return 'stable';
  if (reputation.accuracyRate >= 0.7) return 'up';
  if (reputation.accuracyRate < 0.4) return 'down';
  return 'stable';
}
