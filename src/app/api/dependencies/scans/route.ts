import { NextRequest, NextResponse } from 'next/server';
import { dependencyScanDb } from '@/lib/dependency_database';
import { withObservability } from '@/lib/observability/middleware';

/**
 * GET /api/dependencies/scans
 * Get all dependency scans
 */
async function handleGet() {
  try {
    const scans = dependencyScanDb.getAllScans();

    const scansWithParsedData = scans.map(scan => ({
      ...scan,
      project_ids: JSON.parse(scan.project_ids)
    }));

    return NextResponse.json({ scans: scansWithParsedData });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch scans', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export const GET = withObservability(handleGet, '/api/dependencies/scans');
