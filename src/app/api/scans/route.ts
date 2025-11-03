import { NextRequest, NextResponse } from 'next/server';
import { scanDb, DbScan } from '@/app/db';
import { v4 as uuidv4 } from 'uuid';

/**
 * GET /api/scans
 * Get all scans or filter by query parameters
 * Query params:
 * - projectId: Filter by project
 * - limit: Limit number of results
 * - offset: Offset for pagination
 * - scanType: Filter by scan type
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');
    const scanType = searchParams.get('scanType');

    let scans: DbScan[];

    // Get scans based on filters
    if (projectId) {
      scans = scanDb.getScansByProject(projectId);
    } else {
      // If no projectId, we'll need to add a getAllScans method to the repository
      // For now, throw an error
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    // Filter by scan type if specified
    if (scanType) {
      scans = scans.filter(scan => scan.scan_type === scanType);
    }

    // Calculate pagination
    const total = scans.length;
    const parsedOffset = offset ? parseInt(offset, 10) : 0;
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;

    // Apply pagination
    if (parsedLimit !== undefined) {
      scans = scans.slice(parsedOffset, parsedOffset + parsedLimit);
    }

    return NextResponse.json({
      scans,
      pagination: {
        total,
        offset: parsedOffset,
        limit: parsedLimit || total,
        hasMore: parsedLimit !== undefined && parsedOffset + parsedLimit < total
      }
    });
  } catch (error) {
    logger.error('Error fetching scans:', { error: error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch scans' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/scans
 * Create a new scan
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      project_id,
      scan_type,
      summary,
      input_tokens,
      output_tokens
    } = body;

    if (!project_id || !scan_type) {
      return NextResponse.json(
        { error: 'project_id and scan_type are required' },
        { status: 400 }
      );
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
  } catch (error) {
    logger.error('Error creating scan:', { error: error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create scan' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/scans
 * Update scan token usage
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, input_tokens, output_tokens } = body;

    if (!id || input_tokens === undefined || output_tokens === undefined) {
      return NextResponse.json(
        { error: 'id, input_tokens, and output_tokens are required' },
        { status: 400 }
      );
    }

    const scan = scanDb.updateTokenUsage(id, input_tokens, output_tokens);

    if (!scan) {
      return NextResponse.json(
        { error: 'Scan not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ scan });
  } catch (error) {
    logger.error('Error updating scan:', { error: error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update scan' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/scans
 * Delete a scan by ID
 * Query params:
 * - id: Delete a single scan by ID
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'id parameter is required' },
        { status: 400 }
      );
    }

    const success = scanDb.deleteScan(id);

    if (!success) {
      return NextResponse.json(
        { error: 'Scan not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting scan:', { error: error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete scan' },
      { status: 500 }
    );
  }
}
