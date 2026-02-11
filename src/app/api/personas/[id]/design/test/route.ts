import { NextRequest, NextResponse } from 'next/server';
import { personaDb } from '@/app/db';
import { generateDesignId } from '@/lib/idGenerator';
import { runDesignTest } from '@/lib/personas/designEngine';
import { personaToolDefRepository } from '@/app/db/repositories/persona.repository';
import type { DesignAnalysisResult } from '@/app/features/Personas/lib/designTypes';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { designResult } = body as { designResult: DesignAnalysisResult };

    if (!designResult?.structured_prompt) {
      return NextResponse.json(
        { error: 'designResult with structured_prompt is required' },
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

    // Get tools and credentials
    const allTools = personaToolDefRepository.getAll();
    const credentials = await personaDb.credentials.getAll();
    const credentialMeta = credentials.map(c => ({
      id: c.id,
      name: c.name,
      service_type: c.service_type,
    }));

    const designId = generateDesignId();

    runDesignTest({
      designId,
      designResult,
      persona,
      allTools,
      credentials: credentialMeta,
    });

    return NextResponse.json(
      { designId },
      { status: 202 }
    );
  } catch (error) {
    console.error('Error starting design test:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start design test' },
      { status: 500 }
    );
  }
}
