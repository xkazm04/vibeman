import { NextRequest, NextResponse } from 'next/server';
import {
  refactoringPatternDb,
  patternVersionDb,
  patternRatingDb,
  marketplaceUserDb,
} from '@/app/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/marketplace/patterns/[id]
 * Get a single pattern with full details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Try to find by ID first, then by slug
    let pattern = refactoringPatternDb.getWithAuthor(id);
    if (!pattern) {
      const bySlug = refactoringPatternDb.getBySlug(id);
      if (bySlug) {
        pattern = refactoringPatternDb.getWithAuthor(bySlug.id);
      }
    }

    if (!pattern) {
      return NextResponse.json(
        { error: 'Pattern not found' },
        { status: 404 }
      );
    }

    // Get versions and ratings
    const versions = patternVersionDb.getForPattern(pattern.id);
    const ratings = patternRatingDb.getForPattern(pattern.id);

    // Check if current user has favorited this pattern
    const user = marketplaceUserDb.getOrCreateLocalUser();
    const { patternFavoriteDb } = await import('@/app/db');
    const isFavorite = patternFavoriteDb.isFavorite(user.id, pattern.id);

    // Get user's rating if any
    const userRating = patternRatingDb.getUserRating(pattern.id, user.id);

    return NextResponse.json({
      pattern,
      versions,
      ratings,
      isFavorite,
      userRating,
    });
  } catch (error) {
    console.error('Error fetching pattern:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pattern' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/marketplace/patterns/[id]
 * Update a pattern
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    const pattern = refactoringPatternDb.getById(id);
    if (!pattern) {
      return NextResponse.json(
        { error: 'Pattern not found' },
        { status: 404 }
      );
    }

    // Check ownership
    const user = marketplaceUserDb.getOrCreateLocalUser();
    if (pattern.author_id !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to edit this pattern' },
        { status: 403 }
      );
    }

    // Update pattern
    const updated = refactoringPatternDb.update(id, body);

    return NextResponse.json({ pattern: updated });
  } catch (error) {
    console.error('Error updating pattern:', error);
    return NextResponse.json(
      { error: 'Failed to update pattern' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/marketplace/patterns/[id]
 * Delete a pattern
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const pattern = refactoringPatternDb.getById(id);
    if (!pattern) {
      return NextResponse.json(
        { error: 'Pattern not found' },
        { status: 404 }
      );
    }

    // Check ownership
    const user = marketplaceUserDb.getOrCreateLocalUser();
    if (pattern.author_id !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to delete this pattern' },
        { status: 403 }
      );
    }

    const deleted = refactoringPatternDb.delete(id);

    return NextResponse.json({ success: deleted });
  } catch (error) {
    console.error('Error deleting pattern:', error);
    return NextResponse.json(
      { error: 'Failed to delete pattern' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/marketplace/patterns/[id]
 * Special actions: publish, download, apply
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const action = body.action;

    const pattern = refactoringPatternDb.getById(id);
    if (!pattern) {
      return NextResponse.json(
        { error: 'Pattern not found' },
        { status: 404 }
      );
    }

    const user = marketplaceUserDb.getOrCreateLocalUser();

    switch (action) {
      case 'publish': {
        if (pattern.author_id !== user.id) {
          return NextResponse.json(
            { error: 'Not authorized to publish this pattern' },
            { status: 403 }
          );
        }
        const published = refactoringPatternDb.publish(id);
        return NextResponse.json({ pattern: published });
      }

      case 'download': {
        refactoringPatternDb.incrementDownloads(id);
        // Update author's total downloads
        const author = marketplaceUserDb.getById(pattern.author_id);
        if (author) {
          marketplaceUserDb.updateStats(author.id, {
            total_downloads: author.total_downloads + 1,
          });
        }
        return NextResponse.json({ success: true });
      }

      case 'apply': {
        const { patternApplicationDb, badgeDb } = await import('@/app/db');

        const application = patternApplicationDb.record({
          pattern_id: id,
          user_id: user.id,
          project_id: body.project_id || 'local',
          files_modified: body.files_modified || 0,
          lines_added: body.lines_added || 0,
          lines_removed: body.lines_removed || 0,
          success: body.success !== false,
          outcome_notes: body.outcome_notes,
        });

        // Check if author earned any badges
        badgeDb.checkAndAwardBadges(pattern.author_id);

        return NextResponse.json({ application });
      }

      case 'new_version': {
        if (pattern.author_id !== user.id) {
          return NextResponse.json(
            { error: 'Not authorized to create version' },
            { status: 403 }
          );
        }

        const version = patternVersionDb.create({
          pattern_id: id,
          version: body.version,
          changelog: body.changelog,
          detection_rules: body.detection_rules || [],
          transformation_rules: body.transformation_rules || [],
        });

        return NextResponse.json({ version });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error performing pattern action:', error);
    return NextResponse.json(
      { error: 'Failed to perform action' },
      { status: 500 }
    );
  }
}
