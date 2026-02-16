import { NextResponse } from 'next/server';
import { personaDb } from '@/app/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const connections = personaDb.teamConnections.getByTeam(id);
    return NextResponse.json({ connections });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    if (!body.source_member_id || !body.target_member_id) {
      return NextResponse.json({ error: 'source_member_id and target_member_id required' }, { status: 400 });
    }
    const connId = personaDb.teamConnections.create({ team_id: id, ...body });
    return NextResponse.json({ id: connId }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connection_id');
    if (!connectionId) {
      return NextResponse.json({ error: 'connection_id query param required' }, { status: 400 });
    }
    personaDb.teamConnections.remove(connectionId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
