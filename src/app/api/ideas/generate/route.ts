import { NextRequest, NextResponse } from 'next/server';
import { generateIdeas } from '@/app/projects/ProjectAI/ScanIdeas/generateIdeas';

/**
 * POST /api/ideas/generate
 * Generate ideas for a project or specific context
 *
 * This is a long-running operation with no timeout restrictions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId,
      projectName,
      projectPath,
      contextId,
      provider,
      scanType,
      codebaseFiles
    } = body;

    // Validation
    if (!projectId || !projectName || !projectPath) {
      return NextResponse.json(
        { error: 'projectId, projectName, and projectPath are required' },
        { status: 400 }
      );
    }

    if (!Array.isArray(codebaseFiles) || codebaseFiles.length === 0) {
      return NextResponse.json(
        { error: 'codebaseFiles array is required and must not be empty' },
        { status: 400 }
      );
    }

    console.log(`[API] Starting idea generation for project: ${projectName}`);
    if (contextId) {
      console.log(`[API] Context specified: ${contextId}`);
    }
    console.log(`[API] Analyzing ${codebaseFiles.length} files`);

    // Generate ideas (no timeout - let it run as long as needed)
    const result = await generateIdeas({
      projectId,
      projectName,
      projectPath,
      contextId,
      provider,
      scanType,
      codebaseFiles
    });

    if (!result.success) {
      console.error('[API] Idea generation failed:', result.error);
      return NextResponse.json(
        { error: result.error || 'Failed to generate ideas' },
        { status: 500 }
      );
    }

    console.log(`[API] Successfully generated ${result.ideas?.length || 0} ideas`);

    return NextResponse.json({
      success: true,
      ideas: result.ideas,
      scanId: result.scanId,
      count: result.ideas?.length || 0
    });

  } catch (error) {
    console.error('[API] Error in idea generation endpoint:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}

// Increase the maximum duration for this route (Vercel)
export const maxDuration = 500; // Vercel hobby has 300s limit
// For self-hosted or Pro plan, you can set higher values

// Note: In Next.js App Router, body size limits are configured at the server level
// via next.config.js or through middleware, not through route-level config
