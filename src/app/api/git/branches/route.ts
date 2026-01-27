/**
 * Git Branches API Route
 * GET: Fetch current git branch and status for multiple projects
 */

import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface ProjectBranchInfo {
  projectId: string;
  branch: string | null;
  dirty: boolean;
  error?: string;
}

interface BranchRequest {
  projects: Array<{
    id: string;
    path: string;
  }>;
}

/**
 * Get current git branch for a project path
 */
async function getGitBranch(projectPath: string): Promise<{ branch: string | null; dirty: boolean }> {
  try {
    // Get current branch name
    const { stdout: branchOut } = await execAsync('git rev-parse --abbrev-ref HEAD', {
      cwd: projectPath,
      timeout: 5000,
    });
    const branch = branchOut.trim();

    // Check if there are uncommitted changes
    let dirty = false;
    try {
      const { stdout: statusOut } = await execAsync('git status --porcelain', {
        cwd: projectPath,
        timeout: 5000,
      });
      dirty = statusOut.trim().length > 0;
    } catch {
      // Ignore status errors
    }

    return { branch, dirty };
  } catch (error) {
    // Not a git repo or git not available
    return { branch: null, dirty: false };
  }
}

export async function POST(request: Request) {
  try {
    const body: BranchRequest = await request.json();
    const { projects } = body;

    if (!projects || !Array.isArray(projects)) {
      return NextResponse.json(
        { error: 'Projects array is required' },
        { status: 400 }
      );
    }

    // Fetch branch info for all projects in parallel
    const results: ProjectBranchInfo[] = await Promise.all(
      projects.map(async (project) => {
        try {
          const { branch, dirty } = await getGitBranch(project.path);
          return {
            projectId: project.id,
            branch,
            dirty,
          };
        } catch (error) {
          return {
            projectId: project.id,
            branch: null,
            dirty: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      branches: results,
    });
  } catch (error) {
    console.error('Error fetching git branches:', error);
    return NextResponse.json(
      { error: 'Failed to fetch git branches' },
      { status: 500 }
    );
  }
}
