import { NextRequest, NextResponse } from 'next/server';
import { ideaDb } from '@/app/db';
import { type ScanType } from '@/app/features/Ideas/lib/scanTypes';
import { SCAN_TYPES } from '@/app/features/Ideas/sub_IdeasSetup/lib/ScanTypeConfig';

/**
 * GET /api/ideas/stats
 * Get idea statistics grouped by scan type
 * Query params:
 * - projectId: Filter by project
 * - contextId: Filter by context
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const contextId = searchParams.get('contextId');

    // Get ideas based on filters
    let ideas = ideaDb.getAllIdeas();

    if (projectId) {
      ideas = ideas.filter(idea => idea.project_id === projectId);
    }

    if (contextId) {
      ideas = ideas.filter(idea => idea.context_id === contextId);
    }

    // Get all scan types from configuration
    const scanTypes: ScanType[] = SCAN_TYPES.map(t => t.value);

    // Calculate stats per scan type
    const scanTypeStats = scanTypes.map(scanType => {
      const scanIdeas = ideas.filter(idea => idea.scan_type === scanType);

      const pending = scanIdeas.filter(i => i.status === 'pending').length;
      const accepted = scanIdeas.filter(i => i.status === 'accepted').length;
      const rejected = scanIdeas.filter(i => i.status === 'rejected').length;
      const implemented = scanIdeas.filter(i => i.status === 'implemented').length;
      const total = scanIdeas.length;

      const acceptanceRatio = total > 0
        ? Math.round(((accepted + implemented) / total) * 100)
        : 0;

      return {
        scanType,
        pending,
        accepted,
        rejected,
        implemented,
        total,
        acceptanceRatio
      };
    });

    // Calculate overall stats
    const allPending = ideas.filter(i => i.status === 'pending').length;
    const allAccepted = ideas.filter(i => i.status === 'accepted').length;
    const allRejected = ideas.filter(i => i.status === 'rejected').length;
    const allImplemented = ideas.filter(i => i.status === 'implemented').length;
    const allTotal = ideas.length;
    const allAcceptanceRatio = allTotal > 0
      ? Math.round(((allAccepted + allImplemented) / allTotal) * 100)
      : 0;

    const overall = {
      pending: allPending,
      accepted: allAccepted,
      rejected: allRejected,
      implemented: allImplemented,
      total: allTotal,
      acceptanceRatio: allAcceptanceRatio
    };

    // Group by project (for filter dropdown)
    const projectMap = new Map<string, number>();
    ideas.forEach(idea => {
      const count = projectMap.get(idea.project_id) || 0;
      projectMap.set(idea.project_id, count + 1);
    });

    const projects = Array.from(projectMap.entries()).map(([projectId, totalIdeas]) => ({
      projectId,
      name: projectId, // Will be resolved on client side
      totalIdeas
    }));

    // Group by context (for filter dropdown)
    const contextMap = new Map<string, number>();
    ideas.forEach(idea => {
      if (idea.context_id) {
        const count = contextMap.get(idea.context_id) || 0;
        contextMap.set(idea.context_id, count + 1);
      }
    });

    const contexts = Array.from(contextMap.entries()).map(([contextId, totalIdeas]) => ({
      contextId,
      name: contextId, // Will be resolved on client side
      totalIdeas
    }));

    return NextResponse.json({
      scanTypes: scanTypeStats,
      overall,
      projects,
      contexts
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
