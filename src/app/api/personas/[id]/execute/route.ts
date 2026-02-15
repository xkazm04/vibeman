import { NextRequest, NextResponse } from 'next/server';
import { personaDb } from '@/app/db';
import { personaExecutionQueue } from '@/lib/personas/executionQueue';
import { checkRateLimit } from '@/lib/api-helpers/rateLimiter';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimited = checkRateLimit(request, '/api/personas/[id]/execute', 'expensive');
  if (rateLimited) return rateLimited;

  try {
    const { id } = await params;
    const body = await request.json();
    const { inputData } = body;

    // Get persona
    const persona = await personaDb.personas.getById(id);
    if (!persona) {
      return NextResponse.json(
        { error: 'Persona not found' },
        { status: 404 }
      );
    }

    // Get tools for persona — explicit assignments first, auto-resolve from credentials as fallback
    let tools = personaDb.tools.getToolDefsForPersona(id);
    if (tools.length === 0) {
      // No explicit assignments: include all tools that have matching credentials stored
      tools = personaDb.tools.getToolsWithAvailableCredentials();
    }

    // Get last completed execution for temporal context
    const recentExecs = personaDb.executions.getByPersonaId(id, 1);
    const lastExecution = recentExecs.length > 0 && recentExecs[0].status === 'completed'
      ? { completed_at: recentExecs[0].completed_at!, duration_ms: recentExecs[0].duration_ms, status: recentExecs[0].status }
      : null;

    // Create execution record
    const execution = await personaDb.executions.create(
      id,
      undefined,
      inputData
    );

    // Enqueue for background execution (don't await)
    personaExecutionQueue.enqueue(execution.id, persona, tools, inputData, lastExecution, null);

    // Return immediately with execution record
    return NextResponse.json(
      { execution },
      { status: 202 }
    );
  } catch (error) {
    console.error('Error executing persona:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to execute persona' },
      { status: 500 }
    );
  }
}
