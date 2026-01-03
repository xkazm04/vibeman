/**
 * Observatory Learning API
 * Returns learning progress
 */

import { NextRequest, NextResponse } from 'next/server';
import { observatoryDb } from '@/app/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  try {
    const progress = observatoryDb.getLearningProgress(projectId);

    return NextResponse.json(progress);
  } catch (error) {
    console.error('[Observatory Learning] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get learning progress' },
      { status: 500 }
    );
  }
}
