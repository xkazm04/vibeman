import { NextRequest, NextResponse } from 'next/server';
import { personaDb } from '@/app/db';
import { runDesignRefinement } from '@/lib/personas/designEngine';
import { personaToolDefRepository } from '@/app/db/repositories/persona.repository';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; designId: string }> }
) {
  try {
    const { id, designId } = await params;
    const body = await request.json();
    const { followUpMessage } = body;

    if (!followUpMessage || typeof followUpMessage !== 'string' || !followUpMessage.trim()) {
      return NextResponse.json(
        { error: 'followUpMessage is required' },
        { status: 400 }
      );
    }

    // Get persona
    const persona = await personaDb.personas.getById(id);
    if (!persona) {
      return NextResponse.json(
        { error: 'Persona not found' },
        { status: 404 }
      );
    }

    // Get tools
    const allTools = personaToolDefRepository.getAll();
    const currentTools = await personaDb.tools.getToolDefsForPersona(id);

    const hasPrompt = !!(persona.structured_prompt || persona.system_prompt);
    const mode = hasPrompt ? 'edit' : 'create';

    // Start refinement non-blocking (reuses same designId and SSE stream)
    runDesignRefinement({
      designId,
      followUpMessage: followUpMessage.trim(),
      persona,
      allTools,
      currentTools,
      mode,
    });

    return NextResponse.json(
      { designId },
      { status: 202 }
    );
  } catch (error) {
    console.error('Error starting design refinement:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start design refinement' },
      { status: 500 }
    );
  }
}
