/**
 * API Route: Idea Dependencies
 *
 * GET    /api/ideas/dependencies?ideaId=...       - Get all dependencies for an idea
 * GET    /api/ideas/dependencies?ideaId=...&discover=true - Discover related ideas
 * GET    /api/ideas/dependencies?ideaIds=...,...   - Get dependency counts for batch display
 * POST   /api/ideas/dependencies                  - Create a dependency
 * DELETE /api/ideas/dependencies?id=...            - Delete a dependency
 */

import { NextRequest, NextResponse } from 'next/server';
import { ideaDependencyRepository } from '@/app/db/repositories/idea-dependency.repository';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ideaId = searchParams.get('ideaId');
    const ideaIds = searchParams.get('ideaIds');
    const discover = searchParams.get('discover');

    if (ideaIds) {
      // Batch mode: get dependency counts for multiple ideas
      const ids = ideaIds.split(',').filter(Boolean);
      const counts = ideaDependencyRepository.getDependencyCounts(ids);
      return NextResponse.json({ success: true, counts });
    }

    if (!ideaId) {
      return NextResponse.json(
        { success: false, error: 'ideaId is required' },
        { status: 400 },
      );
    }

    if (discover === 'true') {
      // Auto-discover related ideas based on context/category overlap
      const related = ideaDependencyRepository.discoverRelated(ideaId);
      return NextResponse.json({ success: true, related });
    }

    // Get all dependencies for an idea
    const dependencies = ideaDependencyRepository.getAllForIdea(ideaId);
    const prerequisites = ideaDependencyRepository.getPrerequisites(ideaId);
    const unlocks = ideaDependencyRepository.getUnlockedByAccepting(ideaId);

    return NextResponse.json({
      success: true,
      dependencies,
      prerequisites,
      unlocks,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get dependencies';
    logger.error('[IdeaDependencies] GET error:', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourceId, targetId, relationshipType } = body;

    if (!sourceId || !targetId || !relationshipType) {
      return NextResponse.json(
        { success: false, error: 'sourceId, targetId, and relationshipType are required' },
        { status: 400 },
      );
    }

    if (!['blocks', 'enables', 'conflicts_with'].includes(relationshipType)) {
      return NextResponse.json(
        { success: false, error: 'relationshipType must be blocks, enables, or conflicts_with' },
        { status: 400 },
      );
    }

    if (sourceId === targetId) {
      return NextResponse.json(
        { success: false, error: 'Cannot create dependency to self' },
        { status: 400 },
      );
    }

    const dependency = ideaDependencyRepository.create(sourceId, targetId, relationshipType);
    return NextResponse.json({ success: true, data: dependency });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create dependency';
    logger.error('[IdeaDependencies] POST error:', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 },
      );
    }

    const deleted = ideaDependencyRepository.delete(id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Dependency not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, message: 'Dependency deleted' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete dependency';
    logger.error('[IdeaDependencies] DELETE error:', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
