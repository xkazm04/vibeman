import { NextRequest, NextResponse } from 'next/server';
import { ideaDb } from '@/app/db';

/**
 * GET /api/ideas/tinder
 * Fetch ideas in batches for Tinder-style evaluation
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const offset = parseInt(searchParams.get('offset') || '0');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status') || 'pending';

    // Get all ideas
    let allIdeas = projectId && projectId !== 'all'
      ? ideaDb.getIdeasByProject(projectId)
      : ideaDb.getAllIdeas();

    // Filter by status
    const filteredIdeas = allIdeas.filter(idea => idea.status === status);

    // Sort by created_at (newest first)
    const sortedIdeas = filteredIdeas.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Paginate
    const paginatedIdeas = sortedIdeas.slice(offset, offset + limit);
    const hasMore = offset + limit < sortedIdeas.length;

    return NextResponse.json({
      ideas: paginatedIdeas,
      hasMore,
      total: sortedIdeas.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch ideas' },
      { status: 500 }
    );
  }
}
