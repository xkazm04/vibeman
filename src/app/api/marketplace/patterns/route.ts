import { NextRequest, NextResponse } from 'next/server';
import {
  refactoringPatternDb,
  marketplaceUserDb,
  PatternCategory,
  PatternScope,
} from '@/app/db';

/**
 * GET /api/marketplace/patterns
 * Get published patterns with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const category = searchParams.get('category') as PatternCategory | null;
    const scope = searchParams.get('scope') as PatternScope | null;
    const language = searchParams.get('language');
    const framework = searchParams.get('framework');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') as 'rating' | 'downloads' | 'recent' | null;
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const featured = searchParams.get('featured') === 'true';

    if (featured) {
      const patterns = refactoringPatternDb.getFeatured(limit);
      return NextResponse.json({ patterns, total: patterns.length });
    }

    const patterns = refactoringPatternDb.getPublished({
      category: category || undefined,
      scope: scope || undefined,
      language: language || undefined,
      framework: framework || undefined,
      search: search || undefined,
      sortBy: sortBy || 'rating',
      limit,
      offset,
    });

    return NextResponse.json({
      patterns,
      total: patterns.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching patterns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch patterns' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/marketplace/patterns
 * Create a new pattern
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const requiredFields = [
      'name',
      'title',
      'description',
      'problem_statement',
      'solution_approach',
      'category',
      'scope',
      'estimated_effort',
      'risk_level',
    ];

    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Get or create local user
    const user = marketplaceUserDb.getOrCreateLocalUser();

    // Create pattern
    const pattern = refactoringPatternDb.create({
      author_id: user.id,
      name: body.name,
      title: body.title,
      description: body.description,
      detailed_description: body.detailed_description,
      problem_statement: body.problem_statement,
      solution_approach: body.solution_approach,
      category: body.category,
      scope: body.scope,
      tags: body.tags || [],
      language: body.language,
      framework: body.framework,
      min_version: body.min_version,
      detection_rules: body.detection_rules || [],
      transformation_rules: body.transformation_rules || [],
      example_before: body.example_before,
      example_after: body.example_after,
      estimated_effort: body.estimated_effort,
      risk_level: body.risk_level,
      requires_review: body.requires_review,
      automated: body.automated,
      status: body.status || 'draft',
    });

    return NextResponse.json({ pattern }, { status: 201 });
  } catch (error) {
    console.error('Error creating pattern:', error);
    return NextResponse.json(
      { error: 'Failed to create pattern' },
      { status: 500 }
    );
  }
}
