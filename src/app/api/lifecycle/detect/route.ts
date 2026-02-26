/**
 * Lifecycle Detection API
 * POST: Detect code changes via git diff analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { DetectionResult } from '@/app/features/Ideas/sub_Lifecycle/lib/lifecycleTypes';
import { logger } from '@/lib/logger';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectPath } = body;

    const cwd = projectPath || process.cwd();

    const result = await detectChanges(cwd);

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Error detecting changes:', { error });
    return NextResponse.json(
      { error: 'Failed to detect changes', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function detectChanges(cwd: string): Promise<DetectionResult> {
  try {
    // Get current branch
    const { stdout: branchOutput } = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd });
    const currentBranch = branchOutput.trim();

    // Get status (changed + untracked files)
    const { stdout: statusOutput } = await execAsync('git status --porcelain', { cwd });
    const statusLines = statusOutput.trim().split('\n').filter(Boolean);

    const filesChanged: string[] = [];
    const untrackedFiles: string[] = [];

    for (const line of statusLines) {
      const status = line.substring(0, 2).trim();
      const filePath = line.substring(3).trim();

      if (status === '??') {
        untrackedFiles.push(filePath);
      } else {
        filesChanged.push(filePath);
      }
    }

    // Get diff stats for tracked changes
    let insertions = 0;
    let deletions = 0;

    if (filesChanged.length > 0) {
      try {
        const { stdout: diffOutput } = await execAsync('git diff --stat --numstat', { cwd });
        const diffLines = diffOutput.trim().split('\n').filter(Boolean);

        for (const line of diffLines) {
          const match = line.match(/^(\d+)\s+(\d+)\s+/);
          if (match) {
            insertions += parseInt(match[1], 10) || 0;
            deletions += parseInt(match[2], 10) || 0;
          }
        }
      } catch {
        // Diff stats not critical
      }
    }

    return {
      has_changes: filesChanged.length > 0 || untrackedFiles.length > 0,
      files_changed: filesChanged,
      insertions,
      deletions,
      untracked_files: untrackedFiles,
      current_branch: currentBranch,
    };
  } catch (error) {
    // Not a git repo or git not available
    return {
      has_changes: false,
      files_changed: [],
      insertions: 0,
      deletions: 0,
      untracked_files: [],
      current_branch: 'unknown',
    };
  }
}
