import { NextRequest, NextResponse } from 'next/server';
import { personaDb } from '@/app/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Get execution history for persona
    const executions = await personaDb.executions.getByPersonaId(id, limit);

    return NextResponse.json({ executions });
  } catch (error) {
    console.error('Error getting persona executions:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get executions' },
      { status: 500 }
    );
  }
}
