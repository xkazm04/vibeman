import { NextRequest, NextResponse } from 'next/server';
import { securityScanDb, securityPatchDb } from '@/app/db';
import { withObservability } from '@/lib/observability/middleware';

/**
 * GET /api/security/[scanId]
 * Get security scan details with patches
 */
async function handleGet(
  request: NextRequest,
  { params }: { params: Promise<{ scanId: string }> }
) {
  try {
    const { scanId } = await params;

    const scan = securityScanDb.getById(scanId);

    if (!scan) {
      return NextResponse.json(
        { error: 'Security scan not found' },
        { status: 404 }
      );
    }

    const patches = securityPatchDb.getByScanId(scanId);

    return NextResponse.json({
      scan,
      patches
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to fetch security scan',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export const GET = withObservability(handleGet, '/api/security/[scanId]');
