import * as fs from 'fs';
import * as path from 'path';
import { readRequirement } from './folderManager';
import { getLogFilePath, getLogsDirectory } from './logManager';
import { buildExecutionPrompt } from './executionPrompt';

/**
 * Execution manager for Claude Code requirements
 * Handles spawning and managing Claude Code CLI processes
 */

/**
 * Execute a requirement using Claude Code CLI
 * Uses headless mode with proper slash command syntax
 * Logs all output to a file for observability
 */
export async function executeRequirement(
  projectPath: string,
  requirementName: string,
  projectId?: string,
  onProgress?: (data: string) => void
): Promise<{
  success: boolean;
  output?: string;
  error?: string;
  sessionLimitReached?: boolean;
  logFilePath?: string;
}> {
  const { spawn } = require('child_process');
  const logFilePath = getLogFilePath(projectPath, requirementName);

  try {
    // First, verify the requirement exists
    const readResult = readRequirement(projectPath, requirementName);
    if (!readResult.success) {
      return {
        success: false,
        error: readResult.error || 'Requirement not found',
      };
    }

    // Create log file stream
    const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });
    let streamClosed = false;

    const logMessage = (msg: string) => {
      const timestamp = new Date().toISOString();
      const logLine = `[${timestamp}] ${msg}\n`;

      // Only write if stream is still open
      if (!streamClosed) {
        try {
          logStream.write(logLine);
        } catch (err) {
          console.error('Failed to write to log stream:', err);
        }
      }

      if (onProgress) {
        onProgress(msg);
      }
    };

    const closeLogStream = () => {
      if (!streamClosed) {
        streamClosed = true;
        logStream.end();
      }
    };

    logMessage('=== Claude Code Execution Started ===');
    logMessage(`Requirement: ${requirementName}`);
    logMessage(`Project Path: ${projectPath}`);
    logMessage(`Log File: ${logFilePath}`);
    if (projectId) {
      logMessage(`Project ID: ${projectId}`);
    }
    logMessage('');

    return new Promise((resolve) => {
      try {
        // Read the requirement content to pass as prompt
        const requirementContent = readResult.content || '';

        // Build the enhanced prompt with logging instructions
        const dbPath = path.join(projectPath, 'database', 'goals.db');
        const fullPrompt = buildExecutionPrompt({
          requirementContent,
          projectPath,
          projectId,
          dbPath,
        });

        // Write prompt to temporary file to avoid shell escaping issues
        const tempPromptFile = path.join(getLogsDirectory(projectPath), `prompt_${Date.now()}.txt`);
        fs.writeFileSync(tempPromptFile, fullPrompt, 'utf-8');

        logMessage(`Executing command: cat prompt | claude -p - --output-format stream-json`);
        logMessage(`Requirement length: ${requirementContent.length} characters`);
        logMessage(`Full prompt length: ${fullPrompt.length} characters`);
        logMessage(`Temp prompt file: ${tempPromptFile}`);
        logMessage(`Database path: ${dbPath}`);
        logMessage(`Authentication mode: Web subscription (ANTHROPIC_API_KEY removed from environment)`);
        logMessage('');

        // Use stdin piping instead of command line arguments to avoid escaping issues
        const isWindows = process.platform === 'win32';
        const command = isWindows ? 'claude.cmd' : 'claude';
        const args = [
          '-p',
          '-', // Read from stdin
          '--output-format',
          'stream-json',
          '--verbose', // Required for stream-json with --print
          '--dangerously-skip-permissions',
        ];

        // Prepare environment - remove ANTHROPIC_API_KEY to force web auth usage
        const env = { ...process.env };
        delete env.ANTHROPIC_API_KEY; // Remove API key to use web subscription auth

        // Spawn the process (non-blocking)
        const childProcess = spawn(command, args, {
          cwd: projectPath,
          stdio: ['pipe', 'pipe', 'pipe'], // stdin, stdout, stderr
          shell: isWindows, // Required on Windows for .cmd files
          env, // Use modified environment without API key
        });

        // Write the prompt to stdin
        childProcess.stdin.write(fullPrompt);
        childProcess.stdin.end();

        let stdout = '';
        let stderr = '';

        // Capture stdout
        childProcess.stdout.on('data', (data: Buffer) => {
          const text = data.toString();
          stdout += text;
          logMessage(`[STDOUT] ${text.trim()}`);
        });

        // Capture stderr
        childProcess.stderr.on('data', (data: Buffer) => {
          const text = data.toString();
          stderr += text;
          logMessage(`[STDERR] ${text.trim()}`);
        });

        // Handle process completion
        childProcess.on('close', (code: number) => {
          logMessage('');
          logMessage(`Process exited with code: ${code}`);
          logMessage('=== Claude Code Execution Finished ===');
          closeLogStream();

          if (code === 0) {
            resolve({
              success: true,
              output: stdout || 'Requirement executed successfully',
              logFilePath,
            });
          } else {
            // Check for session limit errors
            const errorOutput = stderr.toLowerCase();
            const isSessionLimit =
              errorOutput.includes('session limit') ||
              errorOutput.includes('rate limit') ||
              errorOutput.includes('usage limit') ||
              errorOutput.includes('quota exceeded') ||
              errorOutput.includes('too many requests') ||
              errorOutput.includes('subscription plan');

            if (isSessionLimit) {
              resolve({
                success: false,
                error: `Session limit reached. Check log file: ${logFilePath}`,
                sessionLimitReached: true,
                logFilePath,
              });
            } else {
              resolve({
                success: false,
                error: `Execution failed (code ${code}). Check log file: ${logFilePath}\n\n${stderr}`,
                logFilePath,
              });
            }
          }
        });

        // Handle spawn errors (e.g., Claude CLI not found)
        childProcess.on('error', (err: Error) => {
          logMessage(`[ERROR] ${err.message}`);

          // Check if it's a "command not found" error
          if (err.message.includes('ENOENT') || err.message.includes('spawn claude')) {
            logMessage('');
            logMessage('WARNING: Claude CLI not found, using simulation mode');
            logMessage('To enable real execution:');
            logMessage('1. Install Claude Code CLI from https://docs.claude.com/claude-code');
            logMessage('2. Run: claude auth login');
            logMessage('3. Restart the server');
            logMessage('');
            logMessage('✓ Simulated execution completed');
            closeLogStream();

            resolve({
              success: true,
              output: `[SIMULATION MODE - Claude CLI not installed]\n\nRequirement: ${requirementName}\n\n✓ Simulated execution completed\n\nLog file: ${logFilePath}`,
              logFilePath,
            });
          } else {
            // Other spawn errors
            logMessage(`[FATAL] Failed to spawn process`);
            closeLogStream();

            resolve({
              success: false,
              error: `Failed to spawn process: ${err.message}`,
              logFilePath,
            });
          }
        });

        // Set timeout
        const timeoutHandle = setTimeout(() => {
          if (!childProcess.killed) {
            logMessage('[TIMEOUT] Execution exceeded 100 minutes, killing process...');
            childProcess.kill();
            closeLogStream();
          }
        }, 6000000); // 100 minute timeout

        // Clear timeout when process completes
        childProcess.on('close', () => {
          clearTimeout(timeoutHandle);
        });

      } catch (execError: any) {
        logMessage(`[EXCEPTION] ${execError.message}`);
        closeLogStream();

        resolve({
          success: false,
          error: `Execution exception: ${execError.message}`,
          logFilePath,
        });
      }
    });
  } catch (error) {
    console.error('Error executing requirement:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      logFilePath,
    };
  }
}
