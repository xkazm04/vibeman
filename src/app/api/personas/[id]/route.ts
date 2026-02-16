import { NextRequest, NextResponse } from 'next/server';
import { personaDb } from '@/app/db';

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

    const persona = personaDb.personas.getById(personaId);
    if (!persona) {
      return NextResponse.json(
        { error: 'Persona not found' },
        { status: 404 }
      );
    }

    const tools = personaDb.tools.getToolDefsForPersona(personaId);
    const triggers = personaDb.triggers.getByPersonaId(personaId);
    const subscriptions = personaDb.eventSubscriptions.getByPersonaId(personaId);

    return NextResponse.json({
      persona,
      tools,
      triggers,
      subscriptions,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch persona', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(
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
    const {
      name,
      description,
      system_prompt,
      structured_prompt,
      icon,
      color,
      enabled,
      max_concurrent,
      timeout_ms,
      last_design_result,
      model_profile,
      max_budget_usd,
      max_turns,
      design_context,
    } = body;

    // Validate fields if provided
    if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
      return NextResponse.json(
        { error: 'Name must be a non-empty string' },
        { status: 400 }
      );
    }

    if (system_prompt !== undefined && (typeof system_prompt !== 'string' || !system_prompt.trim())) {
      return NextResponse.json(
        { error: 'System prompt must be a non-empty string' },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description;
    if (system_prompt !== undefined) updates.system_prompt = system_prompt.trim();
    if (icon !== undefined) updates.icon = icon;
    if (color !== undefined) updates.color = color;
    if (enabled !== undefined) updates.enabled = enabled;
    if (max_concurrent !== undefined) updates.max_concurrent = max_concurrent;
    if (timeout_ms !== undefined) updates.timeout_ms = timeout_ms;
    if (structured_prompt !== undefined) updates.structured_prompt = typeof structured_prompt === 'object' ? JSON.stringify(structured_prompt) : structured_prompt;
    if (last_design_result !== undefined) updates.last_design_result = last_design_result;
    if (model_profile !== undefined) updates.model_profile = typeof model_profile === 'object' ? JSON.stringify(model_profile) : model_profile;
    if (max_budget_usd !== undefined) updates.max_budget_usd = max_budget_usd;
    if (max_turns !== undefined) updates.max_turns = max_turns;
    if (design_context !== undefined) updates.design_context = typeof design_context === 'object' ? JSON.stringify(design_context) : design_context;

    const persona = personaDb.personas.update(personaId, updates);
    if (!persona) {
      return NextResponse.json(
        { error: 'Persona not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ persona });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update persona', details: error instanceof Error ? error.message : 'Unknown error' },
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

    personaDb.personas.delete(personaId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete persona', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
