/**
 * API endpoint for Blueprint Build Scan
 * Used by Web Workers to execute build scans in background
 */

import { NextRequest, NextResponse } from 'next/server';
import { getActiveProject } from '@/lib/project_database';
import { getInitializedRegistry } from '@/app/features/Onboarding/sub_Blueprint/lib/adapters';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, projectPath, projectType, scanOnly } = body;

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Get project from database or construct from provided data
    const project = projectId
      ? getActiveProject(projectId)
      : { id: projectId, path: projectPath, type: projectType };

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    // Execute build scan using adapter system
    const registry = getInitializedRegistry();
    const result = await registry.executeScan(project, 'build', { scanOnly: scanOnly ?? true });

    return NextResponse.json({
      success: result.success,
      error: result.error,
      data: result.data,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Build scan failed';
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}
