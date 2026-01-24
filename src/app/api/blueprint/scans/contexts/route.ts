/**
 * API endpoint for Blueprint Contexts Scan
 * Used by Web Workers to execute contexts scans in background
 */

import { NextRequest, NextResponse } from 'next/server';
import { projectDb, DbProject } from '@/lib/project_database';
import { getInitializedRegistry } from '@/app/features/Onboarding/sub_Blueprint/lib/adapters';
import { Project, ProjectType } from '@/types';
import { withObservability } from '@/lib/observability/middleware';

// Map legacy 'other' type to 'generic'
function normalizeProjectType(type: string | null | undefined): ProjectType {
  if (!type || type === 'other') return 'generic';
  return type as ProjectType;
}

// Convert DbProject to Project type
function toProject(dbProject: DbProject): Project {
  return {
    id: dbProject.id,
    name: dbProject.name,
    path: dbProject.path,
    port: dbProject.port,
    type: normalizeProjectType(dbProject.type),
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

async function handlePost(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, projectPath, projectType, provider } = body;

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
        type: normalizeProjectType(projectType)
      };
    }

    // Execute contexts scan using adapter system
    const registry = getInitializedRegistry();
    const result = await registry.executeScan(project, 'contexts', { provider });

    return NextResponse.json({
      success: result.success,
      error: result.error,
      data: result.data,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Contexts scan failed';
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}

// Export with observability tracking
export const POST = withObservability(handlePost, '/api/blueprint/scans/contexts');
