import { NextRequest, NextResponse } from 'next/server';
import {
  patternCollectionDb,
  marketplaceUserDb,
} from '@/app/db';
import { logger } from '@/lib/logger';

/**
 * GET /api/marketplace/collections
 * Get user's collections
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const collectionId = searchParams.get('id');

    const user = marketplaceUserDb.getOrCreateLocalUser();

    if (collectionId) {
      // Get patterns in a specific collection
      const patterns = patternCollectionDb.getPatterns(collectionId);
      return NextResponse.json({ patterns });
    }

    // Get all user's collections
    const collections = patternCollectionDb.getUserCollections(user.id);
    return NextResponse.json({ collections });
  } catch (error) {
    logger.error('Error fetching collections:', { error });
    return NextResponse.json(
      { error: 'Failed to fetch collections' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/marketplace/collections
 * Create a collection or add pattern to collection
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const user = marketplaceUserDb.getOrCreateLocalUser();

    if (body.action === 'add_pattern') {
      // Add pattern to existing collection
      if (!body.collection_id || !body.pattern_id) {
        return NextResponse.json(
          { error: 'collection_id and pattern_id are required' },
          { status: 400 }
        );
      }

      const added = patternCollectionDb.addPattern(body.collection_id, body.pattern_id);
      if (!added) {
        return NextResponse.json(
          { error: 'Pattern already in collection' },
          { status: 409 }
        );
      }

      return NextResponse.json({ collectionPattern: added }, { status: 201 });
    }

    // Create new collection
    if (!body.name) {
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 }
      );
    }

    const collection = patternCollectionDb.create({
      user_id: user.id,
      name: body.name,
      description: body.description,
      is_public: body.is_public || false,
    });

    return NextResponse.json({ collection }, { status: 201 });
  } catch (error) {
    logger.error('Error creating collection:', { error });
    return NextResponse.json(
      { error: 'Failed to create collection' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/marketplace/collections
 * Delete a collection or remove pattern from collection
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const collectionId = searchParams.get('collectionId');
    const patternId = searchParams.get('patternId');

    if (!collectionId) {
      return NextResponse.json(
        { error: 'collectionId is required' },
        { status: 400 }
      );
    }

    if (patternId) {
      // Remove pattern from collection
      const removed = patternCollectionDb.removePattern(collectionId, patternId);
      return NextResponse.json({ success: removed });
    }

    // Delete entire collection
    const deleted = patternCollectionDb.delete(collectionId);
    return NextResponse.json({ success: deleted });
  } catch (error) {
    logger.error('Error deleting collection:', { error });
    return NextResponse.json(
      { error: 'Failed to delete collection' },
      { status: 500 }
    );
  }
}
