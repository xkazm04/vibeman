import * as fs from 'fs';
import * as path from 'path';
import { readRequirement } from './folderManager';
import { getLogFilePath, getLogsDirectory } from './logManager';
import { buildExecutionPrompt } from './executionPrompt';
import { validateProjectPath, validateRequirementName, secureTempPath, validateCommand, recordExecution, recordFailure } from '@/lib/command/commandSandbox';
/**
 * Execution manager for Claude Code requirements
 * Handles spawning and managing Claude Code CLI processes
 */

export interface GitExecutionConfig {
  enabled: boolean;
  commands: string[];
  commitMessage: string;
}

export interface SessionConfig {
  sessionId?: string;        // Internal session ID (for tracking)
  claudeSessionId?: string;  // Claude CLI session ID (for --resume)
}

/**
 * Execute a requirement using Claude Code CLI
 * Uses headless mode with proper slash command syntax
 * Logs all output to a file for observability
 * Supports session management with --resume flag
 */
export async function executeRequirement(
  projectPath: string,
  requirementName: string,
  projectId?: string,
  onProgress?: (data: string) => void,
  gitConfig?: GitExecutionConfig,
  sessionConfig?: SessionConfig
): Promise<{
  success: boolean;
  output?: string;
  error?: string;
  sessionLimitReached?: boolean;
  logFilePath?: string;
  capturedClaudeSessionId?: string;  // Claude session ID captured from output
  memoryApplicationIds?: string[];   // Collective memory application IDs for feedback loop
}> {
  const { spawn } = require('child_process');

  // Validate project path to prevent path traversal attacks
  const pathCheck = validateProjectPath(projectPath);
  if (!pathCheck.valid) {
    return { success: false, error: `Invalid project path: ${pathCheck.error}` };
  }
  const safeProjectPath = pathCheck.resolved;

  // Validate requirement name to prevent directory traversal via filenames
  const nameCheck = validateRequirementName(requirementName);
  if (!nameCheck.valid) {
    return { success: false, error: `Invalid requirement name: ${nameCheck.error}` };
  }

  const logFilePath = getLogFilePath(safeProjectPath, requirementName);

  try {
    // First, verify the requirement exists
    const readResult = readRequirement(safeProjectPath, requirementName);
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
          // Log write failure once, then close the stream to avoid repeated errors
          console.error('[executionManager] Log stream write failed:', err instanceof Error ? err.message : err);
          streamClosed = true;
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
      let memoryApplicationIds: string[] = [];
      try {
        // Read the requirement content to pass as prompt
        const requirementContent = readResult.content || '';

        // Build the enhanced prompt with logging instructions
        const dbPath = path.join(safeProjectPath, 'database', 'goals.db');
        const { prompt: fullPrompt, memoryApplicationIds: appIds } = buildExecutionPrompt({
          requirementContent,
          projectPath: safeProjectPath,
          projectId,
          dbPath,
          taskId: requirementName,
          gitEnabled: gitConfig?.enabled,
          gitCommands: gitConfig?.commands,
          gitCommitMessage: gitConfig?.commitMessage,
        });
        memoryApplicationIds = appIds;

        // Write prompt to temporary file with cryptographically random name
        const tempPromptFile = secureTempPath(getLogsDirectory(safeProjectPath), 'prompt');
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

        // Add --resume flag if we have a Claude session ID
        if (sessionConfig?.claudeSessionId) {
          args.push('--resume', sessionConfig.claudeSessionId);
          logMessage(`Session resume mode: ${sessionConfig.claudeSessionId}`);
        }

        // Variable to capture session ID from output
        let capturedClaudeSessionId: string | undefined;

        // Validate command against allowlist before spawning
        const cmdCheck = validateCommand(command, args, { shell: isWindows });
        if (!cmdCheck.valid) {
          closeLogStream();
          resolve({ success: false, error: `Command blocked: ${cmdCheck.error}` });
          return;
        }

        // Prepare environment - remove ANTHROPIC_API_KEY to force web auth usage
        const env = { ...process.env };
        delete env.ANTHROPIC_API_KEY; // Remove API key to use web subscription auth

        const spawnStartTime = Date.now();

        // Spawn the process (non-blocking) with validated path
        const childProcess = spawn(command, args, {
          cwd: safeProjectPath,
          stdio: ['pipe', 'pipe', 'pipe'], // stdin, stdout, stderr
          shell: isWindows, // Required on Windows for .cmd files
          env, // Use modified environment without API key
        });

        // Write the prompt to stdin
        childProcess.stdin.write(fullPrompt);
        childProcess.stdin.end();

        let stdout = '';
        let stderr = '';

        // Capture stdout and parse for session ID
        childProcess.stdout.on('data', (data: Buffer) => {
          const text = data.toString();
          stdout += text;
          logMessage(`[STDOUT] ${text.trim()}`);

          // Try to parse session ID from stream-json output
          // Claude CLI outputs session info in JSON format
          try {
            const lines = text.split('\n');
            for (const line of lines) {
              if (!line.trim()) continue;

              // Parse JSON lines to find session ID
              const parsed = JSON.parse(line);

              // Session ID might be in different locations depending on message type
              // Check common patterns:
              // - {"session_id": "..."}
              // - {"type": "session", "session_id": "..."}
              // - {"result": {"session_id": "..."}}
              if (parsed.session_id && !capturedClaudeSessionId) {
                capturedClaudeSessionId = parsed.session_id;
                logMessage(`[SESSION] Captured session ID: ${capturedClaudeSessionId}`);
              } else if (parsed.result?.session_id && !capturedClaudeSessionId) {
                capturedClaudeSessionId = parsed.result.session_id;
                logMessage(`[SESSION] Captured session ID from result: ${capturedClaudeSessionId}`);
              }
            }
          } catch {
            // Not all lines are JSON, ignore parse errors
          }
        });

        // Capture stderr
        childProcess.stderr.on('data', (data: Buffer) => {
          const text = data.toString();
          stderr += text;
          logMessage(`[STDERR] ${text.trim()}`);
        });

        // Handle process completion
        childProcess.on('close', (code: number) => {
          const durationMs = Date.now() - spawnStartTime;
          logMessage('');
          logMessage(`Process exited with code: ${code} (${durationMs}ms)`);
          logMessage('=== Claude Code Execution Finished ===');
          closeLogStream();

          // Audit log
          if (code === 0) {
            recordExecution(command, args, durationMs);
          } else {
            recordFailure(command, args, `Exit code ${code}`);
          }

          if (code === 0) {
            resolve({
              success: true,
              output: stdout || 'Requirement executed successfully',
              logFilePath,
              capturedClaudeSessionId,
              memoryApplicationIds,
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
                memoryApplicationIds,
              });
            } else {
              resolve({
                success: false,
                error: `Execution failed (code ${code}). Check log file: ${logFilePath}\n\n${stderr}`,
                logFilePath,
                memoryApplicationIds,
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

            // In simulation mode, generate a fake session ID for testing
            const simulatedSessionId = `simulated-${Date.now()}`;
            resolve({
              success: true,
              output: `[SIMULATION MODE - Claude CLI not installed]\n\nRequirement: ${requirementName}\n\n✓ Simulated execution completed\n\nLog file: ${logFilePath}`,
              logFilePath,
              capturedClaudeSessionId: simulatedSessionId,
              memoryApplicationIds,
            });
          } else {
            // Other spawn errors
            logMessage(`[FATAL] Failed to spawn process`);
            closeLogStream();

            resolve({
              success: false,
              error: `Failed to spawn process: ${err.message}`,
              logFilePath,
              memoryApplicationIds,
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

      } catch (execError: unknown) {
        const errorMessage = execError instanceof Error ? execError.message : String(execError);
        logMessage(`[EXCEPTION] ${errorMessage}`);
        closeLogStream();

        resolve({
          success: false,
          error: `Execution exception: ${execError instanceof Error ? execError.message : String(execError)}`,
          logFilePath,
          memoryApplicationIds,
        });
      }
    });
  } catch (error) {    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      logFilePath,
    };
  }
}
