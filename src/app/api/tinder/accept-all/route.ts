/**
 * POST /api/tinder/accept-all
 *
 * Bulk-accepts all pending ideas for a project (or all projects).
 * Processes sequentially to avoid overwhelming the file system with
 * concurrent requirement-file writes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ideaRepository } from '@/app/db/repositories/idea.repository';
import { withObservability } from '@/lib/observability/middleware';
import { acceptIdea as acceptIdeaWorkflow } from '@/lib/ideas/ideaAcceptanceWorkflow';
import { handleIdeasApiError } from '@/app/features/Ideas/lib/ideasHandlers';

interface AcceptAllRequest {
  projectId?: string;
  projectPathMap: Record<string, string>; // project_id -> project path
}

async function handlePost(request: NextRequest) {
  try {
    const body: AcceptAllRequest = await request.json();
    const { projectId, projectPathMap } = body;

    if (!projectPathMap || typeof projectPathMap !== 'object') {
      return NextResponse.json(
        { error: 'projectPathMap is required (Record<projectId, projectPath>)' },
        { status: 400 },
      );
    }

    // Fetch all pending ideas
    let pendingIdeas: import('@/app/db').DbIdea[];
    if (projectId && projectId !== 'all') {
      // Fetch all with a large limit (no pagination needed for bulk accept)
      const result = ideaRepository.getIdeasByProjectAndStatus(projectId, 'pending', 10000, null);
      pendingIdeas = result.ideas;
    } else {
      pendingIdeas = ideaRepository.getIdeasByStatus('pending');
    }

    let accepted = 0;
    let failed = 0;
    const errors: Array<{ ideaId: string; title: string; error: string }> = [];

    for (const idea of pendingIdeas) {
      const path = projectPathMap[idea.project_id];
      if (!path) {
        failed++;
        errors.push({ ideaId: idea.id, title: idea.title || 'Untitled', error: 'No project path mapped' });
        continue;
      }

      try {
        const result = acceptIdeaWorkflow({ ideaId: idea.id, projectPath: path, wrapperMode: 'mcp' });
        if (result.success) {
          accepted++;
        } else {
          failed++;
          errors.push({ ideaId: idea.id, title: idea.title || 'Untitled', error: result.message });
        }
      } catch (err) {
        failed++;
        errors.push({
          ideaId: idea.id,
          title: idea.title || 'Untitled',
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      total: pendingIdeas.length,
      accepted,
      failed,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    return handleIdeasApiError(error);
  }
}

export const POST = withObservability(handlePost, '/api/tinder/accept-all');
