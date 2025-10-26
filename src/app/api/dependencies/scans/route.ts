import { NextRequest, NextResponse } from 'next/server';
import { dependencyScanDb } from '@/lib/dependency_database';

/**
 * GET /api/dependencies/scans
 * Get all dependency scans
 */
export async function GET() {
  try {
    const scans = dependencyScanDb.getAllScans();

    const scansWithParsedData = scans.map(scan => ({
      ...scan,
      project_ids: JSON.parse(scan.project_ids)
    }));

    return NextResponse.json({ scans: scansWithParsedData });
  } catch (error) {
    console.error('Error fetching scans:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scans', details: (error as Error).message },
      { status: 500 }
    );
  }
}
