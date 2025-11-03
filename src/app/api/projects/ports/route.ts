import { NextResponse } from 'next/server';
import { projectDb } from '@/lib/project_database';

// GET /api/projects/ports - Get all used ports
export async function GET() {
  try {
    const usedPorts = projectDb.getUsedPorts();
    return NextResponse.json({ usedPorts });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get used ports' },
      { status: 500 }
    );
  }
}