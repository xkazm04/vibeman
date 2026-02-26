import { NextRequest, NextResponse } from 'next/server';
import { standupDb, implementationLogDb, ideaDb, scanDb, contextDb } from '@/app/db';
import { StandupSourceData, StandupSummaryResponse, StandupBlocker, StandupHighlight, StandupFocusArea } from '@/app/db/models/standup.types';
import { safeParseJsonArray } from '@/app/db/repositories/repository.utils';
import { generateStandupSummary, getPeriodDateRange } from '@/app/features/DailyStandup/lib/standupGenerator';
import { generatePredictiveStandup } from '@/lib/standup/predictiveStandupEngine';
import { logger } from '@/lib/logger';
import { withObservability } from '@/lib/observability/middleware';
import { withRateLimit } from '@/lib/api-helpers/rateLimiter';

/**
 * POST /api/standup/generate
 * Generate a new standup summary for a project and period
 *
 * Body:
 * - projectId: string (required)
 * - periodType: 'daily' | 'weekly' (required)
 * - periodStart: string YYYY-MM-DD (optional, defaults to today/this week)
 * - forceRegenerate: boolean (optional, regenerate even if exists)
 */
async function handlePost(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, periodType, periodStart, forceRegenerate = false } = body;

    if (!projectId || !periodType) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters',
          required: ['projectId', 'periodType'],
        },
        { status: 400 }
      );
    }

    if (periodType !== 'daily' && periodType !== 'weekly') {
      return NextResponse.json(
        {
          success: false,
          error: 'periodType must be "daily" or "weekly"',
        },
        { status: 400 }
      );
    }

    // Get period date range
    const { start, end } = getPeriodDateRange(periodType, periodStart);
    const periodStartStr = start.toISOString().split('T')[0];

    // Check for existing summary
    const existing = standupDb.getSummaryByPeriod(projectId, periodType, periodStartStr);
    if (existing && !forceRegenerate) {
      // Return existing summary
      const summary: StandupSummaryResponse = {
        id: existing.id,
        projectId: existing.project_id,
        periodType: existing.period_type,
        periodStart: existing.period_start,
        periodEnd: existing.period_end,
        title: existing.title,
        summary: existing.summary,
        stats: {
          implementationsCount: existing.implementations_count,
          ideasGenerated: existing.ideas_generated,
          ideasAccepted: existing.ideas_accepted,
          ideasRejected: existing.ideas_rejected,
          ideasImplemented: existing.ideas_implemented,
          scansCount: existing.scans_count,
        },
        blockers: safeParseJsonArray<StandupBlocker>(existing.blockers),
        highlights: safeParseJsonArray<StandupHighlight>(existing.highlights),
        insights: {
          velocityTrend: existing.velocity_trend,
          burnoutRisk: existing.burnout_risk,
          focusAreas: safeParseJsonArray<StandupFocusArea>(existing.focus_areas),
        },
        generatedAt: existing.generated_at,
      };

      // Attach predictive intelligence (always fresh, not cached)
      let predictions = null;
      try { predictions = generatePredictiveStandup(projectId); } catch { /* supplementary */ }

      return NextResponse.json({ success: true, summary, predictions, cached: true });
    }

    // Gather source data
    const startISO = start.toISOString();
    const endISO = end.toISOString();

    // Get implementation logs for the period (SQL-level date filtering)
    const periodLogs = implementationLogDb.getLogsByProjectInRange(projectId, startISO, endISO);

    // Get ideas for the period (SQL-level date filtering)
    const periodIdeas = ideaDb.getIdeasByProjectInRange(projectId, startISO, endISO);

    // Get scans for the period (SQL-level date filtering)
    const periodScans = scanDb.getScansByProjectInRange(projectId, startISO, endISO);

    // Content hash check: if existing summary has identical stats, skip LLM call
    if (existing && forceRegenerate) {
      const ideasAccepted = periodIdeas.filter((i) => i.status === 'accepted').length;
      const ideasRejected = periodIdeas.filter((i) => i.status === 'rejected').length;
      const ideasImplemented = periodIdeas.filter((i) => i.status === 'implemented').length;

      const dataUnchanged =
        existing.implementations_count === periodLogs.length &&
        existing.ideas_generated === periodIdeas.length &&
        existing.ideas_accepted === ideasAccepted &&
        existing.ideas_rejected === ideasRejected &&
        existing.ideas_implemented === ideasImplemented &&
        existing.scans_count === periodScans.length;

      if (dataUnchanged) {
        const summary: StandupSummaryResponse = {
          id: existing.id,
          projectId: existing.project_id,
          periodType: existing.period_type,
          periodStart: existing.period_start,
          periodEnd: existing.period_end,
          title: existing.title,
          summary: existing.summary,
          stats: {
            implementationsCount: existing.implementations_count,
            ideasGenerated: existing.ideas_generated,
            ideasAccepted: existing.ideas_accepted,
            ideasRejected: existing.ideas_rejected,
            ideasImplemented: existing.ideas_implemented,
            scansCount: existing.scans_count,
          },
          blockers: safeParseJsonArray<StandupBlocker>(existing.blockers),
          highlights: safeParseJsonArray<StandupHighlight>(existing.highlights),
          insights: {
            velocityTrend: existing.velocity_trend,
            burnoutRisk: existing.burnout_risk,
            focusAreas: safeParseJsonArray<StandupFocusArea>(existing.focus_areas),
          },
          generatedAt: existing.generated_at,
        };

        let predictions = null;
        try { predictions = generatePredictiveStandup(projectId); } catch { /* supplementary */ }

        return NextResponse.json({ success: true, summary, predictions, cached: true });
      }
    }

    // Get contexts with activity
    const contexts = contextDb.getContextsByProject(projectId);

    const sourceData: StandupSourceData = {
      implementationLogs: periodLogs.map((log) => ({
        id: log.id,
        title: log.title,
        overview: log.overview,
        contextId: log.context_id,
        requirementName: log.requirement_name,
        createdAt: log.created_at,
      })),
      ideas: periodIdeas.map((idea) => ({
        id: idea.id,
        title: idea.title,
        description: idea.description,
        status: idea.status,
        scanType: idea.scan_type,
        category: idea.category,
        effort: idea.effort,
        impact: idea.impact,
        createdAt: idea.created_at,
        implementedAt: idea.implemented_at,
      })),
      scans: periodScans.map((scan) => ({
        id: scan.id,
        scanType: scan.scan_type,
        summary: scan.summary,
        createdAt: scan.created_at,
      })),
      contexts: contexts.map((ctx) => ({
        id: ctx.id,
        name: ctx.name,
        implementedTasks: ctx.implemented_tasks || 0,
      })),
    };

    // Generate the summary
    const result = await generateStandupSummary(projectId, sourceData, periodType, start, end);

    if (!result.success || !result.summary) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to generate standup summary',
        },
        { status: 500 }
      );
    }

    // Save to database (upsert)
    const saved = standupDb.upsertSummary(result.summary);

    // Transform to API response
    const summary: StandupSummaryResponse = {
      id: saved.id,
      projectId: saved.project_id,
      periodType: saved.period_type,
      periodStart: saved.period_start,
      periodEnd: saved.period_end,
      title: saved.title,
      summary: saved.summary,
      stats: {
        implementationsCount: saved.implementations_count,
        ideasGenerated: saved.ideas_generated,
        ideasAccepted: saved.ideas_accepted,
        ideasRejected: saved.ideas_rejected,
        ideasImplemented: saved.ideas_implemented,
        scansCount: saved.scans_count,
      },
      blockers: safeParseJsonArray<StandupBlocker>(saved.blockers),
      highlights: safeParseJsonArray<StandupHighlight>(saved.highlights),
      insights: {
        velocityTrend: saved.velocity_trend,
        burnoutRisk: saved.burnout_risk,
        focusAreas: safeParseJsonArray<StandupFocusArea>(saved.focus_areas),
      },
      generatedAt: saved.generated_at,
    };

    logger.info('Standup summary generated', {
      projectId,
      periodType,
      periodStart: periodStartStr,
      implementations: saved.implementations_count,
      ideas: saved.ideas_generated,
    });

    // Attach predictive intelligence
    let predictions = null;
    try { predictions = generatePredictiveStandup(projectId); } catch { /* supplementary */ }

    return NextResponse.json({ success: true, summary, predictions, cached: false });
  } catch (error) {
    logger.error('Error generating standup summary:', { error });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate standup summary',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export const POST = withObservability(withRateLimit(handlePost, '/api/standup/generate', 'expensive'), '/api/standup/generate');
