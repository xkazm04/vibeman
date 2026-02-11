import { NextRequest, NextResponse } from 'next/server';
import { personaDb } from '@/app/db';

export async function GET(request: NextRequest) {
  try {
    // List all tool definitions
    const tools = personaDb.toolDefs.getAll();

    return NextResponse.json({ tools });
  } catch (error) {
    console.error('Error getting tools:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get tools' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      category,
      description,
      script_path,
      input_schema,
      output_schema,
      requires_credential_type,
    } = body;

    // Validate required fields
    if (!name || !category || !description || !script_path) {
      return NextResponse.json(
        { error: 'Missing required fields: name, category, description, script_path' },
        { status: 400 }
      );
    }

    // Create custom tool definition
    const tool = personaDb.toolDefs.create({
      name,
      category,
      description,
      script_path,
      input_schema: input_schema || null,
      output_schema: output_schema || null,
      requires_credential_type: requires_credential_type || null,
    });

    return NextResponse.json({ tool }, { status: 201 });
  } catch (error) {
    console.error('Error creating tool:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create tool' },
      { status: 500 }
    );
  }
}
