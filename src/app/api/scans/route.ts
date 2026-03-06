import { NextRequest, NextResponse } from 'next/server';
import { scanDb } from '@/app/db';
import { v4 as uuidv4 } from 'uuid';
import {
  IdeasErrorCode,
  createIdeasErrorResponse,
  createMissingFieldError,
  withIdeasErrorHandler,
} from '@/app/features/Ideas/lib/ideasHandlers';

/**
 * GET /api/scans
 * Get all scans or filter by query parameters
 * Query params:
 * - projectId: Filter by project
 * - limit: Limit number of results
 * - offset: Offset for pagination
 * - scanType: Filter by scan type
 */
async function handleGet(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');
  const limit = searchParams.get('limit');
  const offset = searchParams.get('offset');
  const scanType = searchParams.get('scanType');

  if (!projectId) {
    return createMissingFieldError('projectId');
  }

  const parsedLimit = limit ? Math.min(Math.max(1, parseInt(limit, 10) || 50), 100) : undefined;
  const parsedOffset = offset ? parseInt(offset, 10) : 0;

  // Push filtering and pagination to SQL
  const { scans, total } = scanDb.getScansByProjectFiltered(projectId, {
    scanType: scanType || undefined,
    limit: parsedLimit,
    offset: parsedOffset,
  });

  return NextResponse.json({
    scans,
    pagination: {
      total,
      offset: parsedOffset,
      appliedLimit: parsedLimit || total,
      hasMore: parsedLimit !== undefined && parsedOffset + parsedLimit < total
    }
  });
}

/**
 * POST /api/scans
 * Create a new scan
 */
async function handlePost(request: NextRequest) {
  const body = await request.json();
  const {
    project_id,
    scan_type,
    summary,
    input_tokens,
    output_tokens
  } = body;

  if (!project_id || !scan_type) {
    return createIdeasErrorResponse(IdeasErrorCode.MISSING_REQUIRED_FIELD, {
      message: 'project_id and scan_type are required',
    });
  }

  const scan = scanDb.createScan({
    id: uuidv4(),
    project_id,
    scan_type,
    summary,
    input_tokens,
    output_tokens
  });

  return NextResponse.json({ scan }, { status: 201 });
}

/**
 * PATCH /api/scans
 * Update scan token usage
 */
async function handlePatch(request: NextRequest) {
  const body = await request.json();
  const { id, input_tokens, output_tokens } = body;

  if (!id || input_tokens === undefined || output_tokens === undefined) {
    return createIdeasErrorResponse(IdeasErrorCode.MISSING_REQUIRED_FIELD, {
      message: 'id, input_tokens, and output_tokens are required',
    });
  }

  const scan = scanDb.updateTokenUsage(id, input_tokens, output_tokens);

  if (!scan) {
    return createIdeasErrorResponse(IdeasErrorCode.IDEA_NOT_FOUND, {
      message: 'Scan not found',
      details: `No scan found with id: ${id}`,
    });
  }

  return NextResponse.json({ scan });
}

/**
 * DELETE /api/scans
 * Delete a scan by ID
 * Query params:
 * - id: Delete a single scan by ID
 */
async function handleDelete(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return createMissingFieldError('id');
  }

  const success = scanDb.deleteScan(id);

  if (!success) {
    return createIdeasErrorResponse(IdeasErrorCode.IDEA_NOT_FOUND, {
      message: 'Scan not found',
      details: `No scan found with id: ${id}`,
    });
  }

  return NextResponse.json({ success: true });
}

export const GET = withIdeasErrorHandler(handleGet, IdeasErrorCode.DATABASE_ERROR);
export const POST = withIdeasErrorHandler(handlePost, IdeasErrorCode.CREATE_FAILED);
export const PATCH = withIdeasErrorHandler(handlePatch, IdeasErrorCode.UPDATE_FAILED);
export const DELETE = withIdeasErrorHandler(handleDelete, IdeasErrorCode.DELETE_FAILED);
