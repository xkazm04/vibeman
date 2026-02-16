import { NextResponse } from 'next/server';
import { personaDb } from '@/app/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const members = personaDb.teamMembers.getByTeam(id);
    return NextResponse.json({ members });
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
    if (!body.persona_id) {
      return NextResponse.json({ error: 'persona_id is required' }, { status: 400 });
    }
    const memberId = personaDb.teamMembers.add({ team_id: id, ...body });
    return NextResponse.json({ id: memberId }, { status: 201 });
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
    const memberId = searchParams.get('member_id');
    if (!memberId) {
      return NextResponse.json({ error: 'member_id query param required' }, { status: 400 });
    }
    personaDb.teamMembers.remove(memberId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
