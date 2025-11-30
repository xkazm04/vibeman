import { NextRequest, NextResponse } from 'next/server';
import {
  patternRatingDb,
  marketplaceUserDb,
  badgeDb,
} from '@/app/db';

/**
 * GET /api/marketplace/ratings
 * Get ratings for a pattern
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const patternId = searchParams.get('patternId');

    if (!patternId) {
      return NextResponse.json(
        { error: 'patternId is required' },
        { status: 400 }
      );
    }

    const ratings = patternRatingDb.getForPattern(patternId);

    return NextResponse.json({ ratings });
  } catch (error) {
    console.error('Error fetching ratings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ratings' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/marketplace/ratings
 * Create or update a rating
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.pattern_id) {
      return NextResponse.json(
        { error: 'pattern_id is required' },
        { status: 400 }
      );
    }

    if (!body.rating || body.rating < 1 || body.rating > 5) {
      return NextResponse.json(
        { error: 'rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    const user = marketplaceUserDb.getOrCreateLocalUser();

    const rating = patternRatingDb.upsert({
      pattern_id: body.pattern_id,
      user_id: user.id,
      rating: body.rating,
      review: body.review,
    });

    // Update user's likes count (for the pattern author)
    const { refactoringPatternDb } = await import('@/app/db');
    const pattern = refactoringPatternDb.getById(body.pattern_id);
    if (pattern) {
      const author = marketplaceUserDb.getById(pattern.author_id);
      if (author) {
        // Count total ratings across all author's patterns
        const allPatterns = refactoringPatternDb.getByAuthor(author.id);
        const totalLikes = allPatterns.reduce((sum, p) => sum + p.rating_count, 0);
        marketplaceUserDb.updateStats(author.id, { total_likes: totalLikes });

        // Check for badges
        badgeDb.checkAndAwardBadges(pattern.author_id);
      }
    }

    return NextResponse.json({ rating }, { status: 201 });
  } catch (error) {
    console.error('Error creating rating:', error);
    return NextResponse.json(
      { error: 'Failed to create rating' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/marketplace/ratings
 * Mark a review as helpful
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.rating_id) {
      return NextResponse.json(
        { error: 'rating_id is required' },
        { status: 400 }
      );
    }

    if (body.action === 'helpful') {
      patternRatingDb.markHelpful(body.rating_id);

      // Check if reviewer earned helpful badge
      const rating = patternRatingDb.getById(body.rating_id);
      if (rating) {
        badgeDb.checkAndAwardBadges(rating.user_id);
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'Unknown action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error updating rating:', error);
    return NextResponse.json(
      { error: 'Failed to update rating' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/marketplace/ratings
 * Delete a rating
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const ratingId = searchParams.get('id');

    if (!ratingId) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    const rating = patternRatingDb.getById(ratingId);
    if (!rating) {
      return NextResponse.json(
        { error: 'Rating not found' },
        { status: 404 }
      );
    }

    // Check ownership
    const user = marketplaceUserDb.getOrCreateLocalUser();
    if (rating.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to delete this rating' },
        { status: 403 }
      );
    }

    const deleted = patternRatingDb.delete(ratingId);

    return NextResponse.json({ success: deleted });
  } catch (error) {
    console.error('Error deleting rating:', error);
    return NextResponse.json(
      { error: 'Failed to delete rating' },
      { status: 500 }
    );
  }
}
