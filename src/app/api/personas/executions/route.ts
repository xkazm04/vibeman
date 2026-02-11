import { NextRequest, NextResponse } from 'next/server';
import { personaDb } from '@/app/db';
import type { PersonaExecutionStatus } from '@/app/db/models/persona.types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const status = searchParams.get('status') as PersonaExecutionStatus | null;

    const executions = personaDb.executions.getGlobalPaginated(
      limit,
      offset,
      status || undefined
    );
    const total = personaDb.executions.getGlobalCount(status || undefined);

    return NextResponse.json({ executions, total });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch executions', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
