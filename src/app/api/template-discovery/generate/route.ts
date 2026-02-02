/**
 * API Route: Generate Requirement File
 * POST /api/template-discovery/generate
 *
 * Creates a requirement .md file in the target project's .claude/commands directory.
 * This runs on the server to access the filesystem.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRequirement } from '@/app/Claude/lib/claudeCodeManager';

interface GenerateRequestBody {
  targetProjectPath: string;
  templateId: string;
  query: string;
  content: string;
  overwrite?: boolean;
}

/**
 * Create a URL-safe slug from text
 * Takes the first 5 words and converts to lowercase hyphenated format
 */
function createSlug(text: string): string {
  return text
    .split(/\s+/)
    .slice(0, 5)
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequestBody = await request.json();
    const { targetProjectPath, templateId, query, content, overwrite = false } = body;

    // Validate required fields
    if (!targetProjectPath?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Target project path is required' },
        { status: 400 }
      );
    }

    if (!templateId?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Template ID is required' },
        { status: 400 }
      );
    }

    if (!query?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Query is required' },
        { status: 400 }
      );
    }

    if (!content?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Content is required' },
        { status: 400 }
      );
    }

    // Build filename: {templateId}-{slug}.md
    const slug = createSlug(query);
    const filename = `${templateId}-${slug}`;

    // Use createRequirement from claudeCodeManager
    const result = createRequirement(targetProjectPath.trim(), filename, content, overwrite);

    // Handle the file exists case
    if (!result.success && result.error?.includes('already exists')) {
      return NextResponse.json({
        success: false,
        exists: true,
        filePath: result.filePath,
        error: 'File exists',
      });
    }

    return NextResponse.json({
      success: result.success,
      filePath: result.filePath,
      error: result.error,
    });
  } catch (error) {
    console.error('Error generating requirement file:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
