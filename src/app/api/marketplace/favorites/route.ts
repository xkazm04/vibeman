import { NextRequest, NextResponse } from 'next/server';
import {
  patternFavoriteDb,
  marketplaceUserDb,
} from '@/app/db';

/**
 * GET /api/marketplace/favorites
 * Get user's favorite patterns
 */
export async function GET(request: NextRequest) {
  try {
    const user = marketplaceUserDb.getOrCreateLocalUser();
    const favorites = patternFavoriteDb.getUserFavorites(user.id);

    return NextResponse.json({ favorites });
  } catch (error) {
    console.error('Error fetching favorites:', error);
    return NextResponse.json(
      { error: 'Failed to fetch favorites' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/marketplace/favorites
 * Add pattern to favorites
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

    const user = marketplaceUserDb.getOrCreateLocalUser();
    const favorite = patternFavoriteDb.add(user.id, body.pattern_id);

    if (!favorite) {
      return NextResponse.json(
        { error: 'Pattern already in favorites' },
        { status: 409 }
      );
    }

    return NextResponse.json({ favorite }, { status: 201 });
  } catch (error) {
    console.error('Error adding favorite:', error);
    return NextResponse.json(
      { error: 'Failed to add favorite' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/marketplace/favorites
 * Remove pattern from favorites
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const patternId = searchParams.get('patternId');

    if (!patternId) {
      return NextResponse.json(
        { error: 'patternId is required' },
        { status: 400 }
      );
    }

    const user = marketplaceUserDb.getOrCreateLocalUser();
    const removed = patternFavoriteDb.remove(user.id, patternId);

    return NextResponse.json({ success: removed });
  } catch (error) {
    console.error('Error removing favorite:', error);
    return NextResponse.json(
      { error: 'Failed to remove favorite' },
      { status: 500 }
    );
  }
}
