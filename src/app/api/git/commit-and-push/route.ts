import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { GitManager } from '@/lib/gitManager';
import { projectDb } from '@/lib/project_database';
import {
  validateGitConfig,
  validateCommitMessageTemplate,
  GitValidationReport,
} from '@/app/features/TaskRunner/sub_Git/lib/gitConfigValidator';
import {
  executeCommand,
  validateCommitMessage,
  validateBranchName,
  validateProjectName,
} from '@/lib/command';

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
  validationReport?: GitValidationReport;
}

/**
 * Parses a git command template into command and arguments array.
 * Handles template variable substitution securely by passing values as separate arguments.
 *
 * Supported command templates:
 * - git add .
 * - git add -A
 * - git commit -m "{commitMessage}"
 * - git push origin {branch}
 * - git pull origin {branch}
 * - etc.
 */
function parseGitCommand(
  commandTemplate: string,
  variables: {
    commitMessage: string;
    projectName: string;
    branch: string;
  }
): { command: string; args: string[] } | { error: string } {
  // Validate input variables before use
  const commitMsgValidation = validateCommitMessage(variables.commitMessage);
  if (!commitMsgValidation.valid) {
    return { error: `Invalid commit message: ${commitMsgValidation.error}` };
  }

  const branchValidation = validateBranchName(variables.branch);
  if (!branchValidation.valid) {
    return { error: `Invalid branch name: ${branchValidation.error}` };
  }

  const projectNameValidation = validateProjectName(variables.projectName);
  if (!projectNameValidation.valid) {
    return { error: `Invalid project name: ${projectNameValidation.error}` };
  }

  // Safe variable values after validation
  const safeCommitMessage = commitMsgValidation.sanitized!;
  const safeBranch = branchValidation.sanitized!;
  const safeProjectName = projectNameValidation.sanitized!;

  // Parse the command template
  // First, replace template variables with unique markers for splitting
  const COMMIT_MSG_MARKER = '__COMMIT_MESSAGE__';
  const BRANCH_MARKER = '__BRANCH__';
  const PROJECT_NAME_MARKER = '__PROJECT_NAME__';

  let markedCommand = commandTemplate
    .replace(/\{commitMessage\}/g, COMMIT_MSG_MARKER)
    .replace(/\{branch\}/g, BRANCH_MARKER)
    .replace(/\{projectName\}/g, PROJECT_NAME_MARKER);

  // Remove surrounding quotes from markers that might be in the template
  // e.g., git commit -m "{commitMessage}" -> git commit -m __COMMIT_MESSAGE__
  markedCommand = markedCommand
    .replace(new RegExp(`"${COMMIT_MSG_MARKER}"`, 'g'), COMMIT_MSG_MARKER)
    .replace(new RegExp(`'${COMMIT_MSG_MARKER}'`, 'g'), COMMIT_MSG_MARKER)
    .replace(new RegExp(`"${BRANCH_MARKER}"`, 'g'), BRANCH_MARKER)
    .replace(new RegExp(`'${BRANCH_MARKER}'`, 'g'), BRANCH_MARKER)
    .replace(new RegExp(`"${PROJECT_NAME_MARKER}"`, 'g'), PROJECT_NAME_MARKER)
    .replace(new RegExp(`'${PROJECT_NAME_MARKER}'`, 'g'), PROJECT_NAME_MARKER);

  // Split command into parts (handle quoted strings for non-template values)
  const parts = markedCommand.trim().split(/\s+/);

  if (parts.length === 0 || parts[0] !== 'git') {
    return { error: 'Command must start with "git"' };
  }

  const command = parts[0];
  const args = parts.slice(1).map(part => {
    if (part === COMMIT_MSG_MARKER) {
      return safeCommitMessage;
    } else if (part === BRANCH_MARKER) {
      return safeBranch;
    } else if (part === PROJECT_NAME_MARKER) {
      return safeProjectName;
    }
    // Remove any surrounding quotes from literal values
    return part.replace(/^["']|["']$/g, '');
  });

  return { command, args };
}

/**
 * Filter out harmless stderr messages from git output
 */
function filterStderr(stderr: string): string {
  const harmlessPatterns = [
    /LF will be replaced by CRLF/i,
    /CRLF will be replaced by LF/i,
    /can't open file.*git.*hook/i,
    /warning: in the working copy/i,
  ];

  return stderr
    .split('\n')
    .filter(line => !harmlessPatterns.some(pattern => pattern.test(line)))
    .join('\n')
    .trim();
}

/**
 * Check if an error is a non-fatal git status
 */
function isNonFatalError(errorMessage: string, commandStr: string): boolean {
  return (
    errorMessage.includes('nothing to commit') ||
    errorMessage.includes('working tree clean') ||
    errorMessage.includes('no changes added') ||
    (errorMessage.includes('exit code') && commandStr.includes('git add'))
  );
}

/**
 * POST /api/git/commit-and-push
 * Execute git commands for a project securely
 *
 * SECURITY: This endpoint has been hardened against command injection:
 * - Uses execFile instead of exec (no shell spawning by default)
 * - All template variables are validated before use
 * - Arguments are passed as arrays, not interpolated into strings
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

    // Validate git configuration for security and correctness
    const validationReport = validateGitConfig({
      commands,
      commitMessageTemplate: commitMessage,
    });

    if (!validationReport.valid) {
      return NextResponse.json(
        {
          success: false,
          message: 'Git configuration validation failed',
          error: validationReport.errors.join('; '),
          validationReport,
        },
        { status: 400 }
      );
    }

    // Also validate commit message separately for template variable syntax
    const commitMessageValidation = validateCommitMessageTemplate(commitMessage);
    if (!commitMessageValidation.valid) {
      return NextResponse.json(
        {
          success: false,
          message: 'Commit message validation failed',
          error: commitMessageValidation.errors.join('; '),
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
    } catch {
      // Don't fail the operation if cleanup fails
    }

    // Prepare template variables
    const templateVariables = {
      commitMessage,
      projectName: project.name,
      branch: project.git_branch || 'main',
    };

    // Execute commands in sequence
    const results: Array<{
      command: string;
      success: boolean;
      output?: string;
      error?: string;
    }> = [];

    for (const commandTemplate of commands) {
      // Parse the command template into command and args
      const parsed = parseGitCommand(commandTemplate, templateVariables);

      if ('error' in parsed) {
        results.push({
          command: commandTemplate,
          success: false,
          error: parsed.error
        });
        return NextResponse.json(
          {
            success: false,
            message: `Command parsing failed: ${commandTemplate}`,
            results,
            error: parsed.error
          },
          { status: 400 }
        );
      }

      const { command, args } = parsed;
      const commandStr = `${command} ${args.join(' ')}`;

      try {
        // Execute with shell: false (default) for security
        // Disable the default argument validator since we've already validated
        const result = await executeCommand(command, args, {
          cwd: project.path,
          timeout: 30000,
          acceptNonZero: true,
          argValidator: null, // We've already validated template variables
        });

        const filteredStderr = filterStderr(result.stderr);
        const output = (result.stdout.trim() + (filteredStderr ? '\n' + filteredStderr : '')).trim();

        // Check for non-zero exit code
        if (result.exitCode !== 0) {
          const errorMessage = output || `Exit code: ${result.exitCode}`;

          if (isNonFatalError(errorMessage, commandStr)) {
            results.push({
              command: commandStr,
              success: true,
              output: errorMessage
            });
            continue;
          }

          // Real error
          results.push({
            command: commandStr,
            success: false,
            error: errorMessage
          });

          return NextResponse.json(
            {
              success: false,
              message: `Command failed: ${commandStr}`,
              results,
              error: errorMessage
            },
            { status: 500 }
          );
        }

        results.push({
          command: commandStr,
          success: true,
          output: output || 'Command executed successfully'
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        if (isNonFatalError(errorMessage, commandStr)) {
          results.push({
            command: commandStr,
            success: true,
            output: errorMessage
          });
          continue;
        }

        results.push({
          command: commandStr,
          success: false,
          error: errorMessage
        });

        return NextResponse.json(
          {
            success: false,
            message: `Command failed: ${commandStr}`,
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
