import { NextRequest, NextResponse } from 'next/server';
import { personaDb } from '@/app/db';
import { generateDesignId } from '@/lib/idGenerator';
import { runDesignAnalysis } from '@/lib/personas/designEngine';
import { getReferencePatternsSection, getLearnedPatternsSection } from '@/lib/personas/patternMatcher';
import { personaToolDefRepository } from '@/app/db/repositories/persona.repository';
import { checkRateLimit } from '@/lib/api-helpers/rateLimiter';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimited = checkRateLimit(request, '/api/personas/[id]/design', 'expensive');
  if (rateLimited) return rateLimited;

  try {
    const { id } = await params;
    const body = await request.json();
    const { instruction, designContext } = body;

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

    // Build read-only reference sections from QA-validated designs
    const referenceSection = getReferencePatternsSection(instruction.trim()) ?? undefined;
    const learnedPatternsSection = getLearnedPatternsSection() ?? undefined;

    // Parse design context if provided (files + references for richer design)
    let parsedDesignContext: { files: Array<{ name: string; content: string; type: string }>; references: string[] } | undefined;
    if (designContext && typeof designContext === 'object') {
      parsedDesignContext = {
        files: Array.isArray(designContext.files) ? designContext.files : [],
        references: Array.isArray(designContext.references) ? designContext.references : [],
      };
    }

    // Start analysis non-blocking
    runDesignAnalysis({
      designId,
      instruction: instruction.trim(),
      persona,
      allTools,
      currentTools,
      mode,
      referenceSection,
      learnedPatternsSection,
      designContext: parsedDesignContext,
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
