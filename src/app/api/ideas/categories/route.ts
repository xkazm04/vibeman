/**
 * GET /api/ideas/categories
 * Returns distinct idea categories with counts for pending ideas
 * Used for the Tinder ideas filter sidebar
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/app/db/connection';
import { logger } from '@/lib/logger';

interface CategoryCount {
  category: string;
  count: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status') || 'pending';

    const db = getDatabase();

    // Build query based on filters
    let query = `
      SELECT category, COUNT(*) as count
      FROM ideas
      WHERE status = ?
    `;
    const params: (string | null)[] = [status];

    // Add project filter if specified
    if (projectId && projectId !== 'all') {
      query += ' AND project_id = ?';
      params.push(projectId);
    }

    query += ' GROUP BY category ORDER BY count DESC, category ASC';

    const stmt = db.prepare(query);
    const results = stmt.all(...params) as CategoryCount[];

    return NextResponse.json({
      categories: results,
      total: results.reduce((sum, cat) => sum + cat.count, 0),
    });
  } catch (error) {
    logger.error('Error fetching idea categories:', { error });
    return NextResponse.json(
      {
        error: 'Failed to fetch categories',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
