import { NextResponse } from 'next/server';
import { healingIssueRepository } from '@/app/db/repositories/healingIssueRepository';
import { runHealingAnalysis } from '@/lib/personas/healingEngine';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get('status') || undefined;
    const issues = healingIssueRepository.getAll(status);
    return NextResponse.json({ issues });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const personaId = body.persona_id || undefined;
    const issues = await runHealingAnalysis({ personaId });
    return NextResponse.json({ issues, count: issues.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
