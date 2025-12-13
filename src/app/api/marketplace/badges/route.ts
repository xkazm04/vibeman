import { NextRequest, NextResponse } from 'next/server';
import {
  badgeDb,
  marketplaceUserDb,
} from '@/app/db';
import { logger } from '@/lib/logger';

/**
 * GET /api/marketplace/badges
 * Get all badges or user's badges
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const allBadges = searchParams.get('all') === 'true';

    if (allBadges) {
      const badges = badgeDb.getAll();
      return NextResponse.json({ badges });
    }

    // Get current user's badges
    const user = userId
      ? marketplaceUserDb.getById(userId)
      : marketplaceUserDb.getOrCreateLocalUser();

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userBadges = badgeDb.getUserBadges(user.id);
    const allAvailableBadges = badgeDb.getAll();

    return NextResponse.json({
      earned: userBadges,
      available: allAvailableBadges,
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        reputation_score: user.reputation_score,
      },
    });
  } catch (error) {
    logger.error('Error fetching badges:', { error });
    return NextResponse.json(
      { error: 'Failed to fetch badges' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/marketplace/badges
 * Check and award eligible badges
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const userId = body.userId;
    const user = userId
      ? marketplaceUserDb.getById(userId)
      : marketplaceUserDb.getOrCreateLocalUser();

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check and award badges
    const awarded = badgeDb.checkAndAwardBadges(user.id);

    // Get updated user info
    const updatedUser = marketplaceUserDb.getById(user.id);

    return NextResponse.json({
      awarded,
      user: updatedUser,
    });
  } catch (error) {
    logger.error('Error checking badges:', { error });
    return NextResponse.json(
      { error: 'Failed to check badges' },
      { status: 500 }
    );
  }
}
