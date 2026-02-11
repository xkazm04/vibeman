import { NextRequest, NextResponse } from 'next/server';
import { personaDb } from '@/app/db';
import type { UpdateManualReviewInput } from '@/app/db/models/persona.types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const review = personaDb.manualReviews.getById(id);

    if (!review) {
      return NextResponse.json(
        { error: 'Manual review not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ review });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch manual review', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, reviewer_notes } = body;

    const existing = personaDb.manualReviews.getById(id);
    if (!existing) {
      return NextResponse.json(
        { error: 'Manual review not found' },
        { status: 404 }
      );
    }

    const updates: UpdateManualReviewInput = {};
    if (status !== undefined) updates.status = status;
    if (reviewer_notes !== undefined) updates.reviewer_notes = reviewer_notes;

    // Auto-set resolved_at on terminal statuses
    if (status && ['approved', 'rejected'].includes(status)) {
      updates.resolved_at = new Date().toISOString();
    }

    const review = personaDb.manualReviews.update(id, updates);

    return NextResponse.json({ review });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update manual review', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = personaDb.manualReviews.getById(id);

    if (!existing) {
      return NextResponse.json(
        { error: 'Manual review not found' },
        { status: 404 }
      );
    }

    personaDb.manualReviews.delete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete manual review', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
