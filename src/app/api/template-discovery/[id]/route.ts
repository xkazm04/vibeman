/**
 * Single Template Discovery API
 * GET: Get template by ID
 * DELETE: Delete template by ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { discoveredTemplateRepository } from '@/app/db/repositories/discovered-template.repository';
import { isTableMissingError } from '@/app/db/repositories/repository.utils';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/template-discovery/[id]
 * Get a single discovered template by ID
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id } = await params;

    // Try to find by database ID first
    let template = discoveredTemplateRepository.getById(id);

    // If not found, try by templateId
    if (!template) {
      template = discoveredTemplateRepository.getByTemplateId(id);
    }

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ template });

  } catch (error) {
    if (isTableMissingError(error)) {
      return NextResponse.json(
        { error: 'Template discovery feature requires database setup. Run migrations and restart the app.' },
        { status: 503 }
      );
    }
    console.error('[Template Discovery] Get failed:', error);
    return NextResponse.json(
      { error: 'Failed to get template' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/template-discovery/[id]
 * Delete a discovered template by ID
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id } = await params;

    const deleted = discoveredTemplateRepository.delete(id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    if (isTableMissingError(error)) {
      return NextResponse.json(
        { error: 'Template discovery feature requires database setup. Run migrations and restart the app.' },
        { status: 503 }
      );
    }
    console.error('[Template Discovery] Delete failed:', error);
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}
