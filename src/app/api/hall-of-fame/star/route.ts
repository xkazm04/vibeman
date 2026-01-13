import { NextResponse } from 'next/server';
import { hallOfFameDb } from '@/app/db';

/**
 * GET /api/hall-of-fame/star
 * Returns all starred component IDs
 */
export async function GET() {
  try {
    const starredIds = hallOfFameDb.getStarredComponentIds();
    return NextResponse.json({ starredIds });
  } catch (error) {
    console.error('Error fetching starred components:', error);
    return NextResponse.json(
      { error: 'Failed to fetch starred components' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/hall-of-fame/star
 * Toggle star status for a component
 * Body: { componentId: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { componentId } = body;

    if (!componentId || typeof componentId !== 'string') {
      return NextResponse.json(
        { error: 'componentId is required and must be a string' },
        { status: 400 }
      );
    }

    const result = hallOfFameDb.toggle(componentId);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error toggling star status:', error);
    return NextResponse.json(
      { error: 'Failed to toggle star status' },
      { status: 500 }
    );
  }
}
