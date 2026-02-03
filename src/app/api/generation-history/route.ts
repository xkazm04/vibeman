/**
 * Generation History API
 * GET: List all generation history entries
 * POST: Create a new generation history entry
 */

import { NextRequest, NextResponse } from 'next/server';
import { generationHistoryRepository } from '@/app/db/repositories/generation-history.repository';

export interface CreateHistoryRequest {
  template_id: string;
  query: string;
  file_path: string;
}

/**
 * GET /api/generation-history
 * List all generation history entries (newest first)
 */
export async function GET(): Promise<NextResponse> {
  try {
    const history = generationHistoryRepository.getAll();
    return NextResponse.json(history);
  } catch (error) {
    console.error('[Generation History] List failed:', error);
    return NextResponse.json(
      { error: 'Failed to list generation history' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/generation-history
 * Create a new generation history entry
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as CreateHistoryRequest;
    const { template_id, query, file_path } = body;

    // Validate required fields
    if (!template_id || !query || !file_path) {
      return NextResponse.json(
        { error: 'template_id, query, and file_path are required' },
        { status: 400 }
      );
    }

    const entry = generationHistoryRepository.create({
      template_id,
      query,
      file_path,
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error('[Generation History] Create failed:', error);
    return NextResponse.json(
      { error: 'Failed to create generation history entry' },
      { status: 500 }
    );
  }
}
