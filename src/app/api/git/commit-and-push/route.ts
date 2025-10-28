import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
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

      console.log(`[GitOperation] Executing: ${processedCommand} in ${project.path}`);

      try {
        const { stdout, stderr } = await execAsync(processedCommand, {
          cwd: project.path,
          timeout: 30000 // 30 second timeout per command
        });

        const output = stdout.trim() || stderr.trim();
        results.push({
          command: processedCommand,
          success: true,
          output: output || 'Command executed successfully'
        });

        console.log(`[GitOperation] Success: ${processedCommand}`, output);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({
          command: processedCommand,
          success: false,
          error: errorMessage
        });

        console.error(`[GitOperation] Failed: ${processedCommand}`, errorMessage);

        // Stop execution on first failure
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
    console.error('Git operation error:', error);
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
