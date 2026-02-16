import { NextResponse } from 'next/server';
import { personaDb } from '@/app/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ personaId: string }> }
) {
  try {
    const { personaId } = await params;
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30', 10);

    const metrics = personaDb.metrics.getLiveMetrics(personaId, days);

    return NextResponse.json({ metrics });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch persona metrics' }, { status: 500 });
  }
}
