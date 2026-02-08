/**
 * GitHub Sync API
 * POST /api/goals/github-sync - Sync goals to GitHub Projects
 * GET /api/goals/github-sync - Check GitHub configuration status
 * POST /api/goals/github-sync/discover - Discover project configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  isGitHubProjectConfigured,
  batchSyncGoalsToGitHub,
  discoverProjectConfig,
  syncGoalToGitHub,
} from '@/lib/github';
import { goalDb } from '@/app/db';
import { logger } from '@/lib/logger';
import { createErrorResponse } from '@/lib/api-helpers';
import { withObservability } from '@/lib/observability/middleware';
import type { GitHubSyncStatusResponse, GitHubBatchSyncResponse } from '@/lib/api-types/goals';

/**
 * POST - Sync goals to GitHub Projects
 */
async function handlePost(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, goalId, action } = body;

    // Handle project discovery
    if (action === 'discover') {
      const { owner, projectNumber, token } = body;

      if (!owner || !projectNumber) {
        return createErrorResponse('Owner and project number are required', 400);
      }

      const result = await discoverProjectConfig(owner, projectNumber, token);
      return NextResponse.json(result);
    }

    // Handle single goal sync
    if (goalId) {
      const goal = goalDb.getGoalById(goalId);
      if (!goal) {
        return createErrorResponse('Goal not found', 404);
      }

      const result = await syncGoalToGitHub(goal);
      return NextResponse.json(result);
    }

    // Handle batch sync for project
    if (!projectId) {
      return createErrorResponse('Project ID or Goal ID is required', 400);
    }

    if (!isGitHubProjectConfigured()) {
      return NextResponse.json({
        success: false,
        synced: 0,
        failed: 0,
        errors: ['GitHub Project not configured. Set GITHUB_TOKEN, GITHUB_PROJECT_ID, and GITHUB_PROJECT_OWNER.'],
        configured: false,
      } satisfies GitHubBatchSyncResponse);
    }

    const result = await batchSyncGoalsToGitHub(projectId);

    return NextResponse.json({
      ...result,
      configured: true,
    });

  } catch (error) {
    logger.error('Error in POST /api/goals/github-sync:', { error });
    return createErrorResponse('Internal server error', 500);
  }
}

/**
 * GET - Check GitHub configuration status
 */
async function handleGet() {
  try {
    const configured = isGitHubProjectConfigured();
    const hasToken = !!process.env.GITHUB_TOKEN;
    const hasProjectId = !!process.env.GITHUB_PROJECT_ID;
    const hasOwner = !!process.env.GITHUB_PROJECT_OWNER;

    return NextResponse.json({
      configured,
      details: {
        hasToken,
        hasProjectId,
        hasOwner,
        hasStatusField: !!process.env.GITHUB_STATUS_FIELD_ID,
        hasStatusMapping: !!(
          process.env.GITHUB_STATUS_TODO_ID &&
          process.env.GITHUB_STATUS_IN_PROGRESS_ID &&
          process.env.GITHUB_STATUS_DONE_ID
        ),
      },
      message: configured
        ? 'GitHub Project sync is configured'
        : 'GitHub Project sync is not fully configured. Required: GITHUB_TOKEN, GITHUB_PROJECT_ID, GITHUB_PROJECT_OWNER',
      requiredEnvVars: [
        'GITHUB_TOKEN',
        'GITHUB_PROJECT_ID',
        'GITHUB_PROJECT_OWNER',
      ],
      optionalEnvVars: [
        'GITHUB_PROJECT_NUMBER',
        'GITHUB_STATUS_FIELD_ID',
        'GITHUB_TARGET_DATE_FIELD_ID',
        'GITHUB_STATUS_TODO_ID',
        'GITHUB_STATUS_IN_PROGRESS_ID',
        'GITHUB_STATUS_DONE_ID',
      ],
    } satisfies GitHubSyncStatusResponse);

  } catch (error) {
    logger.error('Error in GET /api/goals/github-sync:', { error });
    return createErrorResponse('Internal server error', 500);
  }
}

export const POST = withObservability(handlePost, '/api/goals/github-sync');
export const GET = withObservability(handleGet, '/api/goals/github-sync');
