import { NextRequest, NextResponse } from 'next/server';
import { personaDb } from '@/app/db';
import { generateDesignId } from '@/lib/idGenerator';
import { runDesignAnalysis } from '@/lib/personas/designEngine';
import { personaToolDefRepository } from '@/app/db/repositories/persona.repository';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { instruction } = body;

    if (!instruction || typeof instruction !== 'string' || !instruction.trim()) {
      return NextResponse.json(
        { error: 'instruction is required' },
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

    // Get all available tool definitions
    const allTools = personaToolDefRepository.getAll();

    // Get currently assigned tools
    const currentTools = await personaDb.tools.getToolDefsForPersona(id);

    // Determine mode: create if no prompt, edit if has prompt
    const hasPrompt = !!(persona.structured_prompt || persona.system_prompt);
    const mode = hasPrompt ? 'edit' : 'create';

    // Generate design ID and start analysis
    const designId = generateDesignId();

    // Start analysis non-blocking
    runDesignAnalysis({
      designId,
      instruction: instruction.trim(),
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
    console.error('Error starting design analysis:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start design analysis' },
      { status: 500 }
    );
  }
}
