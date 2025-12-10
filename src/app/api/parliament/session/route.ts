import { NextRequest, NextResponse } from 'next/server';
import { debateSessionDb } from '@/app/features/Parliament/lib/reputationRepository';

/**
 * GET /api/parliament/session
 * Get debate session(s)
 *
 * Query params:
 * - projectId: string (required)
 * - sessionId: string (optional - get specific session)
 * - ideaId: string (optional - get session for specific idea)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const sessionId = searchParams.get('sessionId');
    const ideaId = searchParams.get('ideaId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    // Get specific session
    if (sessionId) {
      const session = debateSessionDb.getSession(sessionId);
      if (!session) {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        session: {
          id: session.id,
          projectId: session.project_id,
          ideaIds: JSON.parse(session.idea_ids),
          status: session.status,
          selectedIdeaId: session.selected_idea_id,
          consensusLevel: session.consensus_level,
          totalTokensUsed: session.total_tokens_used,
          debateSummary: session.debate_summary,
          tradeOffs: session.trade_offs ? JSON.parse(session.trade_offs) : [],
          rounds: [], // Full rounds not stored in DB
          votes: [], // Full votes not stored in DB
          startedAt: session.started_at,
          completedAt: session.completed_at,
        },
      });
    }

    // Get sessions for project
    const sessions = debateSessionDb.getProjectSessions(projectId);

    // Filter by ideaId if specified
    let filteredSessions = sessions;
    if (ideaId) {
      filteredSessions = sessions.filter(s => {
        const ideaIds = JSON.parse(s.idea_ids);
        return ideaIds.includes(ideaId);
      });
    }

    // If looking for a specific idea and found one, return the most recent
    if (ideaId && filteredSessions.length > 0) {
      const mostRecent = filteredSessions[0];
      return NextResponse.json({
        session: {
          id: mostRecent.id,
          projectId: mostRecent.project_id,
          ideaIds: JSON.parse(mostRecent.idea_ids),
          status: mostRecent.status,
          selectedIdeaId: mostRecent.selected_idea_id,
          consensusLevel: mostRecent.consensus_level,
          totalTokensUsed: mostRecent.total_tokens_used,
          debateSummary: mostRecent.debate_summary,
          tradeOffs: mostRecent.trade_offs ? JSON.parse(mostRecent.trade_offs) : [],
          rounds: [],
          votes: [],
          startedAt: mostRecent.started_at,
          completedAt: mostRecent.completed_at,
        },
      });
    }

    // If looking for specific idea but none found
    if (ideaId) {
      return NextResponse.json(
        { error: 'No session found for this idea' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      sessions: filteredSessions.map(s => ({
        id: s.id,
        projectId: s.project_id,
        ideaIds: JSON.parse(s.idea_ids),
        status: s.status,
        selectedIdeaId: s.selected_idea_id,
        consensusLevel: s.consensus_level,
        totalTokensUsed: s.total_tokens_used,
        startedAt: s.started_at,
        completedAt: s.completed_at,
      })),
    });
  } catch (error) {
    console.error('Get session error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/parliament/session
 * Delete a debate session
 *
 * Query params:
 * - sessionId: string (required)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    const success = debateSessionDb.deleteSession(sessionId);

    if (!success) {
      return NextResponse.json(
        { error: 'Session not found or already deleted' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete session error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
