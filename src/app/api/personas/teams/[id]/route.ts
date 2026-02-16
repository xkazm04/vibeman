import { NextResponse } from 'next/server';
import { personaDb } from '@/app/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const team = personaDb.teams.getById(id);
    if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

    const members = personaDb.teamMembers.getByTeam(id);
    const connections = personaDb.teamConnections.getByTeam(id);

    return NextResponse.json({ team, members, connections });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    personaDb.teams.update(id, body);
    const updated = personaDb.teams.getById(id);
    return NextResponse.json({ team: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    personaDb.teams.delete(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
