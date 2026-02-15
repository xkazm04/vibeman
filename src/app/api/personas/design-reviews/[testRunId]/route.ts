import { NextRequest, NextResponse } from 'next/server';
import { personaDb } from '@/app/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ testRunId: string }> }
) {
  try {
    const { testRunId } = await params;
    const reviews = personaDb.designReviews.getByTestRunId(testRunId);
    return NextResponse.json({ reviews, testRunId });
  } catch (error) {
    console.error('Error fetching design review run:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch design review run' },
      { status: 500 }
    );
  }
}
