import { NextResponse } from 'next/server';
import { personaDb } from '@/app/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30', 10);
    const personaId = searchParams.get('persona_id') || undefined;

    const summary = personaDb.metrics.getSummary(days);
    const timeSeries = personaDb.metrics.getLiveMetrics(personaId, days);

    return NextResponse.json({
      summary,
      timeSeries,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch observability data' }, { status: 500 });
  }
}
