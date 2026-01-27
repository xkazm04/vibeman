/**
 * Remote Sync API
 * POST: Sync pending directions and requirements to Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { syncPendingDirections } from '@/lib/remote/directionSync';
import { syncRequirements } from '@/lib/remote/requirementSync';
import { projectDb } from '@/lib/project_database';
import {
  validateRequiredFields,
  createApiSuccessResponse,
  createApiErrorResponse,
  ApiErrorCode,
} from '@/lib/api-errors';

export interface SyncResponse {
  success: boolean;
  directions: { count: number; error?: string };
  requirements: { count: number; error?: string };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const validationError = validateRequiredFields(body, ['projectId']);
    if (validationError) {
      return validationError;
    }

    const { projectId } = body;

    // Get project details
    const project = projectDb.getProject(projectId);
    if (!project) {
      return createApiErrorResponse(
        ApiErrorCode.RESOURCE_NOT_FOUND,
        `Project not found: ${projectId}`
      );
    }

    // Run both syncs in parallel
    const [directionsResult, requirementsResult] = await Promise.all([
      syncPendingDirections(projectId, project.name),
      syncRequirements(projectId, project.name, project.path),
    ]);

    // Build response
    const response: SyncResponse = {
      // Success if at least one sync succeeded without critical error
      success: directionsResult.success || requirementsResult.success,
      directions: {
        count: directionsResult.count,
        ...(directionsResult.error && { error: directionsResult.error }),
      },
      requirements: {
        count: requirementsResult.count,
        ...(requirementsResult.error && { error: requirementsResult.error }),
      },
    };

    // If both failed with errors, return as error response
    if (!directionsResult.success && !requirementsResult.success) {
      const errorMessage = [
        directionsResult.error && `Directions: ${directionsResult.error}`,
        requirementsResult.error && `Requirements: ${requirementsResult.error}`,
      ]
        .filter(Boolean)
        .join('; ');

      return createApiErrorResponse(
        ApiErrorCode.EXTERNAL_SERVICE_ERROR,
        errorMessage || 'Sync failed',
        { directions: response.directions, requirements: response.requirements }
      );
    }

    return createApiSuccessResponse(response, {
      message: `Synced ${directionsResult.count} directions and ${requirementsResult.count} requirements`,
    });
  } catch (error) {
    console.error('[Remote/Sync] Error:', error);
    return createApiErrorResponse(
      ApiErrorCode.INTERNAL_ERROR,
      error instanceof Error ? error.message : 'Failed to sync'
    );
  }
}
