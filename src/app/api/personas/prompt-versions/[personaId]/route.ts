import { NextResponse } from 'next/server';
import { personaDb } from '@/app/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ personaId: string }> }
) {
  try {
    const { personaId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const versions = personaDb.promptVersions.getVersions(personaId, limit);

    return NextResponse.json({ versions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch prompt versions' }, { status: 500 });
  }
}
