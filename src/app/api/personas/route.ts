import { NextRequest, NextResponse } from 'next/server';
import { personaDb } from '@/app/db';

export async function GET() {
  try {
    const personas = personaDb.personas.getAll();
    return NextResponse.json({ personas });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch personas', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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
      timeout_ms
    } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'Name is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    if (!system_prompt || typeof system_prompt !== 'string' || !system_prompt.trim()) {
      return NextResponse.json(
        { error: 'System prompt is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    const persona = personaDb.personas.create({
      name: name.trim(),
      description: description || null,
      system_prompt: system_prompt.trim(),
      structured_prompt: structured_prompt
        ? (typeof structured_prompt === 'object' ? JSON.stringify(structured_prompt) : structured_prompt)
        : undefined,
      icon: icon || null,
      color: color || null,
      enabled: enabled !== undefined ? enabled : true,
      max_concurrent: max_concurrent || null,
      timeout_ms: timeout_ms || null
    });

    return NextResponse.json({ persona }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create persona', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
