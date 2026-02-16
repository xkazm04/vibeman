import { NextRequest, NextResponse } from 'next/server';
import { personaDb } from '@/app/db';

export async function GET() {
  try {
    const groups = personaDb.groups.getAll();
    return NextResponse.json({ groups });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    const group = personaDb.groups.create(body);
    return NextResponse.json({ group }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }
    const { id, ...updates } = body;
    const group = personaDb.groups.update(id, updates);
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }
    return NextResponse.json({ group });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }
    personaDb.groups.delete(body.id);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
