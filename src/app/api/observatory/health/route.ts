/**
 * Observatory Health API
 * Returns project health summary
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
    const summary = observatoryDb.getProjectHealthSummary(projectId);

    return NextResponse.json(summary);
  } catch (error) {
    console.error('[Observatory Health] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get health summary' },
      { status: 500 }
    );
  }
}
