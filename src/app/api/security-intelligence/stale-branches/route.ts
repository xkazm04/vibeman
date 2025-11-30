import { NextRequest, NextResponse } from 'next/server';
import { staleBranchDb } from '@/app/db';
import { spawn } from 'child_process';

/**
 * Execute a git command
 */
function executeGitCommand(
  args: string[],
  cwd: string
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const proc = spawn('git', args, { cwd, shell: true });
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`Git command failed: ${stderr}`));
      }
    });

    proc.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * GET /api/security-intelligence/stale-branches
 * Get stale branches
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');
    const autoCloseEligibleOnly = searchParams.get('autoCloseEligibleOnly') === 'true';

    if (autoCloseEligibleOnly) {
      const branches = staleBranchDb.getAutoCloseEligible(projectId || undefined);
      return NextResponse.json({ branches });
    }

    if (projectId) {
      const branches = staleBranchDb.getByProjectId(projectId);
      return NextResponse.json({ branches });
    }

    // Return all auto-close eligible branches across all projects
    const branches = staleBranchDb.getAutoCloseEligible();
    return NextResponse.json({ branches });
  } catch (error) {
    console.error('Error fetching stale branches:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stale branches' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/security-intelligence/stale-branches
 * Create or update a stale branch record
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId,
      branchName,
      lastCommitAt,
      lastCommitAuthor,
      daysStale,
      hasVulnerabilities,
      vulnerabilityCount,
      autoCloseEligible,
    } = body;

    if (!projectId || !branchName || !lastCommitAt) {
      return NextResponse.json(
        { error: 'projectId, branchName, and lastCommitAt are required' },
        { status: 400 }
      );
    }

    const id = `sb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const branch = staleBranchDb.upsert({
      id,
      projectId,
      branchName,
      lastCommitAt: new Date(lastCommitAt),
      lastCommitAuthor: lastCommitAuthor || null,
      daysStale: daysStale || 0,
      hasVulnerabilities: hasVulnerabilities || false,
      vulnerabilityCount: vulnerabilityCount || 0,
      autoCloseEligible: autoCloseEligible || false,
      autoClosed: false,
      autoClosedAt: null,
      manuallyPreserved: false,
    });

    return NextResponse.json({ branch });
  } catch (error) {
    console.error('Error creating stale branch record:', error);
    return NextResponse.json(
      { error: 'Failed to create stale branch record' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/security-intelligence/stale-branches
 * Update a stale branch (auto-close or preserve)
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action, projectPath } = body;

    if (!id || !action) {
      return NextResponse.json(
        { error: 'id and action are required' },
        { status: 400 }
      );
    }

    if (action === 'preserve') {
      staleBranchDb.markPreserved(id);
      return NextResponse.json({ success: true, action: 'preserved' });
    }

    if (action === 'auto-close') {
      if (!projectPath) {
        return NextResponse.json(
          { error: 'projectPath is required for auto-close action' },
          { status: 400 }
        );
      }

      // Get the branch info first
      const branches = staleBranchDb.getAutoCloseEligible();
      const branch = branches.find(b => b.id === id);

      if (!branch) {
        return NextResponse.json(
          { error: 'Branch not found or not eligible for auto-close' },
          { status: 404 }
        );
      }

      try {
        // Delete the remote branch
        await executeGitCommand(
          ['push', 'origin', '--delete', branch.branchName],
          projectPath
        );

        // Mark as auto-closed
        staleBranchDb.markAutoClosed(id);

        return NextResponse.json({
          success: true,
          action: 'auto-closed',
          branchName: branch.branchName,
        });
      } catch (gitError) {
        console.error('Git error during branch deletion:', gitError);
        return NextResponse.json(
          { error: 'Failed to delete remote branch', details: String(gitError) },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: 'action must be either "preserve" or "auto-close"' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error updating stale branch:', error);
    return NextResponse.json(
      { error: 'Failed to update stale branch' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/security-intelligence/stale-branches
 * Delete a stale branch record
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');
    const branchName = searchParams.get('branchName');

    if (!projectId || !branchName) {
      return NextResponse.json(
        { error: 'projectId and branchName are required' },
        { status: 400 }
      );
    }

    staleBranchDb.delete(projectId, branchName);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting stale branch record:', error);
    return NextResponse.json(
      { error: 'Failed to delete stale branch record' },
      { status: 500 }
    );
  }
}
