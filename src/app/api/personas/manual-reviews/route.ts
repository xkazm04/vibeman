import { NextRequest, NextResponse } from 'next/server';
import { personaDb } from '@/app/db';
import type { ManualReviewStatus } from '@/app/db/models/persona.types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const status = searchParams.get('status') as ManualReviewStatus | null;

    const reviews = personaDb.manualReviews.getGlobalWithPersonaInfo(
      limit,
      offset,
      status || undefined
    );
    const total = reviews.length;
    const pendingCount = personaDb.manualReviews.getPendingCount();

    return NextResponse.json({ reviews, total, pendingCount });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch manual reviews', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { execution_id, persona_id, title, description, severity, context_data, suggested_actions } = body;

    if (!execution_id || !persona_id || !title) {
      return NextResponse.json(
        { error: 'execution_id, persona_id, and title are required' },
        { status: 400 }
      );
    }

    const review = personaDb.manualReviews.create({
      execution_id,
      persona_id,
      title,
      description: description || undefined,
      severity: severity || undefined,
      context_data: context_data || undefined,
      suggested_actions: suggested_actions || undefined,
    });

    return NextResponse.json({ review }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create manual review', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
