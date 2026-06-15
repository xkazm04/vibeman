/**
 * @route /api/ideas/approve
 * POST - Bulk-resolve flagged ideas (the risk/effort approval gate).
 *
 * Moves a set of held ideas to 'accepted' (ready for an implementation wave) or
 * 'rejected'. Used by a CLI after presenting flagged items to the user.
 *
 * Body: { ideaIds: string[], approved: boolean, feedback?: string }
 */
import { NextRequest, NextResponse } from 'next/server';
import { ideaRepository } from '@/app/db/repositories/idea.repository';
import { withObservability } from '@/lib/observability/middleware';
import { sanitizeString } from '@/lib/validation/sanitizers';
import { analyticsAggregationService } from '@/lib/services/analyticsAggregation';

async function handlePost(request: NextRequest) {
  try {
    const body = await request.json();
    const { ideaIds, approved, feedback } = body as {
      ideaIds?: string[];
      approved?: boolean;
      feedback?: string;
    };

    if (!Array.isArray(ideaIds) || ideaIds.length === 0) {
      return NextResponse.json({ error: 'ideaIds (non-empty array) is required' }, { status: 400 });
    }
    if (typeof approved !== 'boolean') {
      return NextResponse.json({ error: 'approved (boolean) is required' }, { status: 400 });
    }
    if (ideaIds.length > 200) {
      return NextResponse.json({ error: 'Too many ideaIds (max 200)' }, { status: 400 });
    }

    const status = approved ? 'accepted' : 'rejected';
    const cleanFeedback = feedback ? sanitizeString(String(feedback), 2000) : undefined;

    const updatedIds: string[] = [];
    const notFound: string[] = [];
    const projectIds = new Set<string>();

    for (const rawId of ideaIds) {
      const id = String(rawId);
      const updates: Record<string, unknown> = { status };
      if (cleanFeedback) updates.user_feedback = cleanFeedback;
      const updated = ideaRepository.updateIdea(id, updates);
      if (updated) {
        updatedIds.push(id);
        projectIds.add(updated.project_id);
      } else {
        notFound.push(id);
      }
    }

    for (const pid of projectIds) {
      analyticsAggregationService.invalidateCacheForProject(pid);
    }

    return NextResponse.json({
      success: true,
      status,
      updatedCount: updatedIds.length,
      updatedIds,
      notFound,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const POST = withObservability(handlePost, '/api/ideas/approve');
