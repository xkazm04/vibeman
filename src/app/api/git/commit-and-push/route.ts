import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { GitManager } from '@/lib/gitManager';
import { projectDb } from '@/lib/project_database';

const execAsync = promisify(exec);

export interface GitOperationRequest {
  projectId: string;
  commands: string[];
  commitMessage: string;
}

export interface GitOperationResponse {
  success: boolean;
  message: string;
  results?: Array<{
    command: string;
    success: boolean;
    output?: string;
    error?: string;
  }>;
  error?: string;
}

/**
 * POST /api/git/commit-and-push
 * Execute git commands for a project
 */
export async function POST(request: NextRequest): Promise<NextResponse<GitOperationResponse>> {
  try {
    const { projectId, commands, commitMessage }: GitOperationRequest = await request.json();

    if (!projectId || !commands || commands.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Missing required fields',
          error: 'projectId and commands are required'
        },
        { status: 400 }
      );
    }

    // Get project details
    const project = projectDb.getProject(projectId);
    if (!project) {
      return NextResponse.json(
        {
          success: false,
          message: 'Project not found',
          error: `No project found with ID: ${projectId}`
        },
        { status: 404 }
      );
    }

    // Check if project has git repository configured
    if (!project.git_repository) {
      return NextResponse.json(
        {
          success: false,
          message: 'Git repository not configured',
          error: 'Project does not have git_repository configured. Skipping git operations.'
        },
        { status: 400 }
      );
    }

    // Check if directory is a git repository
    const isGitRepo = await GitManager.isGitRepo(project.path);
    if (!isGitRepo) {
      return NextResponse.json(
        {
          success: false,
          message: 'Not a git repository',
          error: `${project.path} is not a git repository`
        },
        { status: 400 }
      );
    }

    // Check for and remove 'null' file if it exists (Claude Code sometimes creates this)
    try {
      const nullFilePath = path.join(project.path, 'null');

      if (fs.existsSync(nullFilePath)) {
        fs.unlinkSync(nullFilePath);
      }
    } catch (cleanupError) {
      // Don't fail the operation if cleanup fails
    }

    // Execute commands in sequence
    const results: Array<{
      command: string;
      success: boolean;
      output?: string;
      error?: string;
    }> = [];

    for (const command of commands) {
      // Replace placeholders in command
      const processedCommand = command
        .replace(/{commitMessage}/g, commitMessage)
        .replace(/{projectName}/g, project.name)
        .replace(/{branch}/g, project.git_branch || 'main');


      try {
        const { stdout, stderr } = await execAsync(processedCommand, {
          cwd: project.path,
          timeout: 30000 // 30 second timeout per command
        });

        // Filter out harmless stderr messages
        const harmlessPatterns = [
          /LF will be replaced by CRLF/i,              // Line ending warnings (Windows)
          /CRLF will be replaced by LF/i,              // Line ending warnings (Unix)
          /can't open file.*git.*hook/i,               // Missing git hooks (optional)
          /warning: in the working copy/i,             // Generic working copy warnings
        ];

        const filteredStderr = stderr
          .split('\n')
          .filter(line => {
            // Keep line if it doesn't match any harmless pattern
            return !harmlessPatterns.some(pattern => pattern.test(line));
          })
          .join('\n')
          .trim();

        // Combine stdout and filtered stderr for output
        const output = (stdout.trim() + (filteredStderr ? '\n' + filteredStderr : '')).trim();

        // Check if filtered stderr contains actual errors
        const hasRealWarnings = filteredStderr && !filteredStderr.includes('fatal') && !filteredStderr.includes('error:');

        results.push({
          command: processedCommand,
          success: true,
          output: output || 'Command executed successfully'
        });

        if (hasRealWarnings) {
        } else {
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const exitCode = (error as { code?: number }).code;

        // Check if it's a non-fatal git error (like "nothing to commit")
        const isNonFatal =
          errorMessage.includes('nothing to commit') ||
          errorMessage.includes('working tree clean') ||
          errorMessage.includes('no changes added') ||
          (exitCode === 1 && processedCommand.includes('git add'));

        if (isNonFatal) {
          // Treat as success with informational message
          results.push({
            command: processedCommand,
            success: true,
            output: errorMessage
          });
          continue; // Continue to next command
        }

        // Real error - log and stop
        results.push({
          command: processedCommand,
          success: false,
          error: errorMessage
        });


        // Stop execution on first real failure
        return NextResponse.json(
          {
            success: false,
            message: `Command failed: ${processedCommand}`,
            results,
            error: errorMessage
          },
          { status: 500 }
        );
      }
    }

    // All commands succeeded
    return NextResponse.json({
      success: true,
      message: 'All git operations completed successfully',
      results
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: 'Git operation failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
