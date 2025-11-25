/**
 * API endpoint for Blueprint Structure Scan
 * Used by Web Workers to execute structure scans in background
 */

import { NextRequest, NextResponse } from 'next/server';
import { projectDb, DbProject } from '@/lib/project_database';
import { getInitializedRegistry } from '@/app/features/Onboarding/sub_Blueprint/lib/adapters';
import { Project } from '@/types';

// Convert DbProject to Project type
function toProject(dbProject: DbProject): Project {
  return {
    id: dbProject.id,
    name: dbProject.name,
    path: dbProject.path,
    port: dbProject.port,
    type: dbProject.type as 'nextjs' | 'fastapi' | 'other',
    relatedProjectId: dbProject.related_project_id || undefined,
    git: dbProject.git_repository ? {
      repository: dbProject.git_repository,
      branch: dbProject.git_branch,
    } : undefined,
    runScript: dbProject.run_script,
    allowMultipleInstances: Boolean(dbProject.allow_multiple_instances),
    basePort: dbProject.base_port || undefined,
    instanceOf: dbProject.instance_of || undefined,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, projectPath, projectType } = body;

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Get project from database or construct from provided data
    let project: Project;
    if (projectId) {
      const dbProject = projectDb.getProject(projectId);
      if (!dbProject) {
        return NextResponse.json(
          { success: false, error: 'Project not found' },
          { status: 404 }
        );
      }
      project = toProject(dbProject);
    } else {
      project = {
        id: projectId,
        name: projectId,
        path: projectPath,
        port: 3000,
        type: projectType as 'nextjs' | 'fastapi' | 'other'
      };
    }

    // Execute structure scan using adapter system
    const registry = getInitializedRegistry();
    const result = await registry.executeScan(project, 'structure');

    return NextResponse.json({
      success: result.success,
      error: result.error,
      data: result.data,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Structure scan failed';
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}
