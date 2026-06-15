/**
 * Git Branches API Route
 * GET: Fetch current git branch and status for multiple projects
 */

import { NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';

// execFile (not exec) → no shell is spawned, and the path only ever flows into
// `cwd`, never a command string.
const execFileAsync = promisify(execFile);

// Bound how many git child processes run at once, and how many projects a single
// request may probe — otherwise a large workspace fans out 2 shell+git processes
// per project in one tick (60-100+ for 30-50 projects), which can stall the dev
// server (especially on Windows where process spawning is heavy).
const GIT_CONCURRENCY = 8;
const MAX_PROJECTS_PER_REQUEST = 500;

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const idx = next++;
      if (idx >= items.length) break;
      results[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return results;
}

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
    const { stdout: branchOut } = await execFileAsync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd: projectPath,
      timeout: 5000,
    });
    const branch = branchOut.trim();

    // Check if there are uncommitted changes
    let dirty = false;
    try {
      const { stdout: statusOut } = await execFileAsync('git', ['status', '--porcelain'], {
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

    if (projects.length > MAX_PROJECTS_PER_REQUEST) {
      return NextResponse.json(
        { error: `Too many projects in one request: ${projects.length} (max ${MAX_PROJECTS_PER_REQUEST})` },
        { status: 400 }
      );
    }

    // Fetch branch info with bounded concurrency (not all-at-once)
    const results: ProjectBranchInfo[] = await mapWithConcurrency(
      projects,
      GIT_CONCURRENCY,
      async (project) => {
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
      }
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
