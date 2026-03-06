import { NextRequest, NextResponse } from 'next/server';
import { generateIdeas } from '@/app/projects/ProjectAI/ScanIdeas/generateIdeas';
import { ScanType } from '@/app/features/Ideas/lib/scanTypes';
import { withObservability } from '@/lib/observability/middleware';
import {
  IdeasErrorCode,
  createIdeasErrorResponse,
  handleIdeasApiError,
} from '@/app/features/Ideas/lib/ideasHandlers';

interface GenerateIdeasRequest {
  projectId: string;
  projectName: string;
  projectPath: string;
  contextId?: string;
  provider?: string;
  scanType?: ScanType;
  codebaseFiles: Array<{ path: string; content: string; type: string }>;
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

/**
 * POST /api/ideas/generate
 * Generate ideas for a project or specific context
 *
 * This is a long-running operation with no timeout restrictions
 */
async function handlePost(request: NextRequest) {
  try {
    const body: GenerateIdeasRequest = await request.json();

    const validationError = validateGenerateIdeasRequest(body);
    if (validationError) {
      return createIdeasErrorResponse(IdeasErrorCode.MISSING_REQUIRED_FIELD, {
        message: validationError,
      });
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
      return createIdeasErrorResponse(IdeasErrorCode.INTERNAL_ERROR, {
        message: result.error || 'Failed to generate ideas',
      });
    }

    return NextResponse.json({
      success: true,
      ideas: result.ideas || [],
      scanId: result.scanId || '',
      count: (result.ideas || []).length,
    });

  } catch (error) {
    return handleIdeasApiError(error);
  }
}

// Export with observability tracking
export const POST = withObservability(handlePost, '/api/ideas/generate');

// Increase the maximum duration for this route (Vercel)
export const maxDuration = 500; // Vercel hobby has 300s limit
// For self-hosted or Pro plan, you can set higher values

// Note: In Next.js App Router, body size limits are configured at the server level
// via next.config.js or through middleware, not through route-level config
