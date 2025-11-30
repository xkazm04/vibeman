/**
 * Lifecycle Scan API
 * POST: Execute a scan as part of the lifecycle
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeContextScan } from '@/app/features/Ideas/sub_IdeasSetup/lib/scanHandlers';
import { ScanType, isValidScanType, ALL_SCAN_TYPES } from '@/app/features/Ideas/lib/scanTypes';
import { SupportedProvider } from '@/lib/llm/types';

// Simple in-memory project cache (in production, use proper DB lookup)
const projectCache: Record<string, { name: string; path: string }> = {};

export async function POST(request: NextRequest) {
  try {
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
        const projectResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/projects/${projectId}`);
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

    // Execute the scan
    const ideaCount = await executeContextScan({
      projectId,
      projectName: projectInfo.name,
      projectPath: projectInfo.path,
      scanType: scanType as ScanType,
      provider: (provider as SupportedProvider) || 'gemini',
      contextId,
      contextFilePaths,
    });

    return NextResponse.json({
      success: true,
      ideaCount,
      scanType,
      projectId,
    });
  } catch (error) {
    console.error('Error executing lifecycle scan:', error);
    return NextResponse.json(
      { error: 'Failed to execute scan', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
