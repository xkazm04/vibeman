import { NextRequest, NextResponse } from 'next/server';
import {
  securityIntelligenceDb,
  securityAlertDb,
} from '@/app/db';
import { logger } from '@/lib/logger';

/**
 * GET /api/security-intelligence
 * Get the security intelligence dashboard summary
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');
    const includeAlerts = searchParams.get('includeAlerts') === 'true';

    // Single project intelligence
    if (projectId) {
      const intelligence = securityIntelligenceDb.getByProjectId(projectId);

      if (!intelligence) {
        return NextResponse.json(
          { error: 'Security intelligence not found for this project' },
          { status: 404 }
        );
      }

      const result: Record<string, unknown> = { intelligence };

      if (includeAlerts) {
        result.alerts = securityAlertDb.getUnacknowledged(projectId);
      }

      return NextResponse.json(result);
    }

    // Cross-project dashboard summary
    const summary = securityIntelligenceDb.getDashboardSummary();

    const result: Record<string, unknown> = { summary };

    if (includeAlerts) {
      result.pendingAlerts = securityAlertDb.getUnacknowledged();
    }

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Error fetching security intelligence:', { error });
    return NextResponse.json(
      { error: 'Failed to fetch security intelligence' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/security-intelligence
 * Create or update security intelligence for a project
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId,
      projectName,
      projectPath,
      totalVulnerabilities,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      patchHealthScore,
      ciStatus,
      ciLastRun,
      riskScore,
      riskTrend,
      lastScanAt,
      patchesPending,
      patchesApplied,
      staleBranchesCount,
      communityScore,
      lastCommunityUpdate,
    } = body;

    if (!projectId || !projectName || !projectPath) {
      return NextResponse.json(
        { error: 'projectId, projectName, and projectPath are required' },
        { status: 400 }
      );
    }

    const id = `si_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const intelligence = securityIntelligenceDb.upsert({
      id,
      projectId,
      projectName,
      projectPath,
      totalVulnerabilities: totalVulnerabilities || 0,
      criticalCount: criticalCount || 0,
      highCount: highCount || 0,
      mediumCount: mediumCount || 0,
      lowCount: lowCount || 0,
      patchHealthScore: patchHealthScore ?? 100,
      ciStatus: ciStatus || 'unknown',
      ciLastRun: ciLastRun ? new Date(ciLastRun) : null,
      riskScore: riskScore || 0,
      riskTrend: riskTrend || 'stable',
      lastScanAt: lastScanAt ? new Date(lastScanAt) : null,
      patchesPending: patchesPending || 0,
      patchesApplied: patchesApplied || 0,
      staleBranchesCount: staleBranchesCount || 0,
      communityScore: communityScore ?? null,
      lastCommunityUpdate: lastCommunityUpdate ? new Date(lastCommunityUpdate) : null,
    });

    return NextResponse.json({ intelligence });
  } catch (error) {
    logger.error('Error creating security intelligence:', { error });
    return NextResponse.json(
      { error: 'Failed to create security intelligence' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/security-intelligence
 * Delete security intelligence for a project
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    securityIntelligenceDb.delete(projectId);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting security intelligence:', { error });
    return NextResponse.json(
      { error: 'Failed to delete security intelligence' },
      { status: 500 }
    );
  }
}
