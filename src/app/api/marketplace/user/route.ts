import { NextRequest, NextResponse } from 'next/server';
import {
  marketplaceUserDb,
  refactoringPatternDb,
  badgeDb,
} from '@/app/db';
import { logger } from '@/lib/logger';

/**
 * GET /api/marketplace/user
 * Get current user profile or specific user by ID
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('id');
    const username = searchParams.get('username');
    const topContributors = searchParams.get('topContributors');

    // Get top contributors
    if (topContributors) {
      const limit = parseInt(topContributors, 10) || 10;
      const contributors = marketplaceUserDb.getTopContributors(limit);
      return NextResponse.json({ contributors });
    }

    // Get specific user
    let user = null;
    if (userId) {
      user = marketplaceUserDb.getById(userId);
    } else if (username) {
      user = marketplaceUserDb.getByUsername(username);
    } else {
      // Get or create local user
      user = marketplaceUserDb.getOrCreateLocalUser();
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get user's patterns
    const patterns = refactoringPatternDb.getByAuthor(user.id);

    // Get user's badges
    const badges = badgeDb.getUserBadges(user.id);

    return NextResponse.json({
      user,
      patterns,
      badges,
      stats: {
        totalPatterns: user.total_patterns,
        totalDownloads: user.total_downloads,
        totalLikes: user.total_likes,
        reputationScore: user.reputation_score,
      },
    });
  } catch (error) {
    logger.error('Error fetching user:', { error });
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/marketplace/user
 * Update current user profile
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    const user = marketplaceUserDb.getOrCreateLocalUser();

    const updated = marketplaceUserDb.update(user.id, {
      display_name: body.display_name,
      email: body.email,
      avatar_url: body.avatar_url,
      bio: body.bio,
    });

    return NextResponse.json({ user: updated });
  } catch (error) {
    logger.error('Error updating user:', { error });
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/marketplace/user
 * Create a new user (for future multi-user support)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.username || !body.display_name) {
      return NextResponse.json(
        { error: 'username and display_name are required' },
        { status: 400 }
      );
    }

    // Check if username already exists
    const existing = marketplaceUserDb.getByUsername(body.username);
    if (existing) {
      return NextResponse.json(
        { error: 'Username already taken' },
        { status: 409 }
      );
    }

    const user = marketplaceUserDb.create({
      username: body.username,
      display_name: body.display_name,
      email: body.email,
      avatar_url: body.avatar_url,
      bio: body.bio,
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    logger.error('Error creating user:', { error });
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
