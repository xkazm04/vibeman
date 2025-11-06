import { NextRequest, NextResponse } from 'next/server';
import { generateIdeas } from '@/app/projects/ProjectAI/ScanIdeas/generateIdeas';

interface GenerateIdeasRequest {
  projectId: string;
  projectName: string;
  projectPath: string;
  contextId?: string;
  provider?: string;
  scanType?: string;
  codebaseFiles: string[];
}

function validateGenerateIdeasRequest(body: Partial<GenerateIdeasRequest>): string | null {
  if (!body.projectId || !body.projectName || !body.projectPath) {
    return 'projectId, projectName, and projectPath are required';
  }

  if (!Array.isArray(body.codebaseFiles) || body.codebaseFiles.length === 0) {
    return 'codebaseFiles array is required and must not be empty';
  }

  return null;
}

function createErrorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function createSuccessResponse(ideas: any[], scanId: string) {
  return NextResponse.json({
    success: true,
    ideas,
    scanId,
    count: ideas.length
  });
}

/**
 * POST /api/ideas/generate
 * Generate ideas for a project or specific context
 *
 * This is a long-running operation with no timeout restrictions
 */
export async function POST(request: NextRequest) {
  try {
    const body: GenerateIdeasRequest = await request.json();

    const validationError = validateGenerateIdeasRequest(body);
    if (validationError) {
      return createErrorResponse(validationError, 400);
    }

    const {
      projectId,
      projectName,
      projectPath,
      contextId,
      provider,
      scanType,
      codebaseFiles
    } = body;

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
      return createErrorResponse(result.error || 'Failed to generate ideas', 500);
    }

    return createSuccessResponse(result.ideas || [], result.scanId || '');

  } catch (error) {
    return createErrorResponse(
      error instanceof Error ? error.message : 'Unknown error occurred',
      500
    );
  }
}

// Increase the maximum duration for this route (Vercel)
export const maxDuration = 500; // Vercel hobby has 300s limit
// For self-hosted or Pro plan, you can set higher values

// Note: In Next.js App Router, body size limits are configured at the server level
// via next.config.js or through middleware, not through route-level config
