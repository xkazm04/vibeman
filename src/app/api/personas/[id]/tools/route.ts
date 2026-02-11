import { NextRequest, NextResponse } from 'next/server';
import { personaDb } from '@/app/db';
import { personaToolDefRepository } from '@/app/db/repositories/persona.repository';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const personaId = id;

    if (!personaId || typeof personaId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid persona ID' },
        { status: 400 }
      );
    }

    const tools = personaDb.tools.getToolDefsForPersona(personaId);
    return NextResponse.json({ tools });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch persona tools', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const personaId = id;

    if (!personaId || typeof personaId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid persona ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { toolId, toolConfig } = body;

    // Validate required fields
    if (!toolId || typeof toolId !== 'string') {
      return NextResponse.json(
        { error: 'Tool ID is required and must be a string' },
        { status: 400 }
      );
    }

    // Resolve toolId: could be an actual ID (ptooldef_xxx) or a tool name (gmail_read)
    let resolvedToolId = toolId;
    let toolDef = personaToolDefRepository.getById(toolId);
    if (!toolDef) {
      // Try resolving by name (Design tab sends tool names, not IDs)
      toolDef = personaToolDefRepository.getByName(toolId);
      if (toolDef) {
        resolvedToolId = toolDef.id;
      } else {
        return NextResponse.json(
          { error: `Tool definition not found: ${toolId}` },
          { status: 404 }
        );
      }
    }

    const assignment = personaDb.tools.assign(personaId, resolvedToolId, toolConfig || null);
    return NextResponse.json({ assignment }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to assign tool to persona', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const personaId = id;

    if (!personaId || typeof personaId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid persona ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { toolId } = body;

    // Validate required fields
    if (!toolId || typeof toolId !== 'string') {
      return NextResponse.json(
        { error: 'Tool ID is required and must be a string' },
        { status: 400 }
      );
    }

    personaDb.tools.remove(personaId, toolId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to remove tool from persona', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
