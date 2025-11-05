import { NextRequest, NextResponse } from 'next/server';
import { ideaDb } from '@/app/db';

/**
 * GET /api/ideas/by-requirement?requirementId=<requirement-name>
 * Get an idea by its requirement_id
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requirementId = searchParams.get('requirementId');

    if (!requirementId) {
      return NextResponse.json(
        { error: 'requirementId query parameter is required' },
        { status: 400 }
      );
    }

    const idea = ideaDb.getIdeaByRequirementId(requirementId);

    if (!idea) {
      return NextResponse.json(
        { error: 'Idea not found for this requirement' },
        { status: 404 }
      );
    }

    return NextResponse.json({ idea });
  } catch (error) {
    console.error('Error fetching idea by requirement:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch idea' },
      { status: 500 }
    );
  }
}
