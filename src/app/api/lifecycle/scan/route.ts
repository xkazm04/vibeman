/**
 * Lifecycle Scan API
 * POST: Execute a scan as part of the lifecycle
 */

import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/config/envConfig';
import { executeLlmScan as executeContextScan } from '@/app/features/Ideas/sub_IdeasSetup/lib/ideaExecutor';
import { ScanType, isValidScanType, ALL_SCAN_TYPES } from '@/app/features/Ideas/lib/scanTypes';
import { SupportedProvider } from '@/lib/llm/types';
import { logger } from '@/lib/logger';
import { createRouteHandler } from '@/lib/api-helpers/createRouteHandler';

// Simple in-memory project cache (in production, use proper DB lookup)
const projectCache: Record<string, { name: string; path: string }> = {};

async function handlePost(request: NextRequest) {
  const body = await request.json();
    const { projectId, scanType, provider, contextId, contextFilePaths } = body;

    if (!projectId || !scanType) {
      return NextResponse.json(
        { error: 'projectId and scanType are required' },
        { status: 400 }
      );
    }

    // Validate scan type
    if (!isValidScanType(scanType)) {
      return NextResponse.json(
        { error: `Invalid scan type: ${scanType}. Valid types: ${ALL_SCAN_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Get project info (simplified - should query DB in production)
    let projectInfo = projectCache[projectId];
    if (!projectInfo) {
      // Fallback to defaults
      projectInfo = {
        name: 'Project',
        path: process.cwd(),
      };

      // Try to fetch from projects API
      try {
        const projectResponse = await fetch(`${env.baseUrl()}/api/projects/${projectId}`);
        if (projectResponse.ok) {
          const projectData = await projectResponse.json();
          if (projectData.project) {
            projectInfo = {
              name: projectData.project.name,
              path: projectData.project.path,
            };
            projectCache[projectId] = projectInfo;
          }
        }
      } catch {
        // Use fallback
      }
    }

    // Execute the scan — pass the request signal so the fetch is cancelled if the client disconnects
    const { count: ideaCount, scanId } = await executeContextScan({
      projectId,
      projectName: projectInfo.name,
      projectPath: projectInfo.path,
      scanType: scanType as ScanType,
      provider: (provider as SupportedProvider) || 'anthropic',
      contextId,
      contextFilePaths,
      signal: request.signal,
    });

    return NextResponse.json({
      success: true,
      ideaCount,
      scanId,
      scanType,
      projectId,
  });
}

export const POST = createRouteHandler(handlePost, {
  endpoint: '/api/lifecycle/scan',
  method: 'POST',
  middleware: { rateLimit: { tier: 'expensive' } },
});
