import { NextResponse } from 'next/server';
import { personaDb } from '@/app/db';

export async function GET() {
  try {
    const teams = personaDb.teams.getAll();
    // Enrich with member count
    const enriched = teams.map((team: any) => {
      const members = personaDb.teamMembers.getByTeam(team.id);
      return { ...team, member_count: members.length };
    });
    return NextResponse.json({ teams: enriched });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    const team = personaDb.teams.create(body);
    return NextResponse.json({ team }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
