import { NextRequest, NextResponse } from 'next/server';
import { refactoringPatternDb, PatternCategory } from '@/app/db';
import { logger } from '@/lib/logger';

/**
 * GET /api/marketplace/patterns/compatible
 * Get patterns compatible with the current project context
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const language = searchParams.get('language');
    const framework = searchParams.get('framework');
    const categoriesParam = searchParams.get('categories');
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    // Parse categories if provided
    const categories: PatternCategory[] | undefined = categoriesParam
      ? (categoriesParam.split(',').filter(Boolean) as PatternCategory[])
      : undefined;

    const patterns = refactoringPatternDb.getCompatiblePatterns({
      language: language || undefined,
      framework: framework || undefined,
      categories,
      limit,
    });

    return NextResponse.json({
      patterns,
      total: patterns.length,
    });
  } catch (error) {
    logger.error('Error fetching compatible patterns:', { error });
    return NextResponse.json(
      { error: 'Failed to fetch compatible patterns' },
      { status: 500 }
    );
  }
}
