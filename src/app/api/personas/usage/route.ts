import { NextRequest, NextResponse } from 'next/server';
import { personaToolUsageRepository } from '@/app/db/repositories/persona.repository';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = searchParams.get('days') ? parseInt(searchParams.get('days')!, 10) : undefined;
    const personaId = searchParams.get('persona_id') || undefined;

    const summary = personaToolUsageRepository.getToolUsageSummary(days, personaId);
    const overTime = personaToolUsageRepository.getUsageOverTime(days || 30, personaId);
    const byPersona = personaToolUsageRepository.getPersonaUsageSummary(days);

    return NextResponse.json({ summary, overTime, byPersona });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch tool usage', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
