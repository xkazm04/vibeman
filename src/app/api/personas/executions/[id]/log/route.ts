import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import { personaExecutionRepository } from '@/app/db/repositories/persona.repository';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const execution = personaExecutionRepository.getById(id);
    if (!execution) {
      return NextResponse.json({ error: 'Execution not found' }, { status: 404 });
    }

    if (!execution.log_file_path || !fs.existsSync(execution.log_file_path)) {
      return NextResponse.json({ error: 'Log file not found' }, { status: 404 });
    }

    const content = fs.readFileSync(execution.log_file_path, 'utf-8');
    return new NextResponse(content, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to read log file', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
