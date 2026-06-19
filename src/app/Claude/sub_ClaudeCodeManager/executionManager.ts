import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { readRequirement } from './folderManager';
import { getLogFilePath, getLogsDirectory } from './logManager';
import { buildExecutionPrompt } from './executionPrompt';
import { validateProjectPath, validateRequirementName, secureTempPath, validateCommand, recordExecution, recordFailure } from '@/lib/command/commandSandbox';
import { killProcessTree } from '@/lib/process/killProcessTree';
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

/** Phrases indicating an API rate limit / subscription quota / session cap. */
const SESSION_LIMIT_KEYWORDS = [
  'session limit',
  'rate limit',
  'usage limit',
  'quota exceeded',
  'too many requests',
  'subscription plan',
];

function containsSessionLimit(text: string): boolean {
  const t = text.toLowerCase();
  return SESSION_LIMIT_KEYWORDS.some((k) => t.includes(k));
}

/**
 * A 0 exit code can still carry a rate-limit/overage in the FINAL stream-json
 * `result` message (is_error:true). Inspect only that structured message — not the
 * whole transcript — so a task that merely mentions "rate limit" in its own output
 * is not misread as a quota hit (which would re-queue a successful run).
 */
function detectSessionLimitFromResult(stdout: string): boolean {
  const lines = stdout.split('\n');
  for (let i = lines.length - 1; i >= 0 && i >= lines.length - 40; i--) {
    const line = lines[i].trim();
    if (!line.startsWith('{')) continue;
    try {
      const msg = JSON.parse(line) as {
        type?: string; is_error?: boolean; subtype?: string; result?: string; error?: string;
      };
      if (msg?.type === 'result' && msg.is_error) {
        const text = `${msg.result ?? ''} ${msg.error ?? ''} ${msg.subtype ?? ''}`;
        if (containsSessionLimit(text)) return true;
      }
    } catch {
      // not a JSON line — skip
    }
  }
  return false;
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
  sessionConfig?: SessionConfig,
  healingContext?: string
): Promise<{
  success: boolean;
  output?: string;
  error?: string;
  sessionLimitReached?: boolean;
  logFilePath?: string;
  capturedClaudeSessionId?: string;  // Claude session ID captured from output
  memoryApplicationIds?: string[];   // Collective memory application IDs for feedback loop
  pid?: number;                      // OS process ID of the spawned CLI process
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
          healingContext,
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
        // Inject VIBEMAN env vars for MCP bidirectional channel
        const env = { ...process.env };
        delete env.ANTHROPIC_API_KEY; // Remove API key to use web subscription auth
        if (projectId) env.VIBEMAN_PROJECT_ID = projectId;
        env.VIBEMAN_TASK_ID = requirementName;
        env.VIBEMAN_HOOK_SECRET = randomUUID();

        const spawnStartTime = Date.now();

        // Spawn the process (non-blocking) with validated path
        const childProcess = spawn(command, args, {
          cwd: safeProjectPath,
          stdio: ['pipe', 'pipe', 'pipe'], // stdin, stdout, stderr
          shell: isWindows, // Required on Windows for .cmd files
          env, // Use modified environment without API key
        });

        const spawnedPid = childProcess.pid;

        // Record PID in session DB for orphan reaping on server restart
        if (spawnedPid && sessionConfig?.sessionId) {
          try {
            const { sessionRepository } = require('@/app/db/repositories/session.repository');
            sessionRepository.updatePid(sessionConfig.sessionId, spawnedPid);
            logMessage(`[PID] Recorded PID ${spawnedPid} for session ${sessionConfig.sessionId}`);
          } catch {
            // PID recording must never break execution
          }
        }

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

          // Clear PID from session DB (process no longer running)
          if (sessionConfig?.sessionId) {
            try {
              const { sessionRepository } = require('@/app/db/repositories/session.repository');
              sessionRepository.updatePid(sessionConfig.sessionId, null);
            } catch {
              // Must never break completion flow
            }
          }

          // Audit log
          if (code === 0) {
            recordExecution(command, args, durationMs);
          } else {
            recordFailure(command, args, `Exit code ${code}`);
          }

          if (code === 0 && detectSessionLimitFromResult(stdout)) {
            // Exit 0 but the structured result reported a rate-limit/overage. Surface
            // it as a session limit so the queue takes the backoff path instead of
            // masking it as a successful run (and the self-healing engine re-running
            // immediately against the rate-limited endpoint).
            resolve({
              success: false,
              error: `Session limit reached (reported in result, exit 0). Check log file: ${logFilePath}`,
              sessionLimitReached: true,
              logFilePath,
              capturedClaudeSessionId,
              memoryApplicationIds,
              pid: spawnedPid,
            });
          } else if (code === 0) {
            resolve({
              success: true,
              output: stdout || 'Requirement executed successfully',
              logFilePath,
              capturedClaudeSessionId,
              memoryApplicationIds,
              pid: spawnedPid,
            });
          } else {
            // Check for session limit errors. The CLI runs with
            // `--output-format stream-json`, so limit/quota events are emitted on
            // STDOUT (as JSON), not stderr — scan both streams or a rate-limited run
            // is misclassified as a generic failure and gets an instant re-queue
            // (retry storm) instead of the rate-limit backoff path.
            const isSessionLimit = containsSessionLimit(`${stdout}\n${stderr}`);

            if (isSessionLimit) {
              resolve({
                success: false,
                error: `Session limit reached. Check log file: ${logFilePath}`,
                sessionLimitReached: true,
                logFilePath,
                memoryApplicationIds,
                pid: spawnedPid,
              });
            } else {
              resolve({
                success: false,
                error: `Execution failed (code ${code}). Check log file: ${logFilePath}\n\n${stderr}`,
                logFilePath,
                memoryApplicationIds,
                pid: spawnedPid,
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
            logMessage('ERROR: Claude CLI not found — the task was NOT executed.');
            logMessage('To enable execution:');
            logMessage('1. Install Claude Code CLI from https://docs.claude.com/claude-code');
            logMessage('2. Run: claude auth login');
            logMessage('3. Restart the server');
            logMessage('');
            closeLogStream();

            // Fail honestly. Previously this resolved success:true in "simulation
            // mode" with a fake session id, so the queue marked the task completed,
            // fired success events, resolved collective memory as success, and ran
            // performTaskCleanup (deleting the requirement file + flipping idea
            // status) for a run that wrote zero code — pure success theater.
            resolve({
              success: false,
              error:
                'Claude CLI not found (ENOENT). Install Claude Code and run `claude auth login`, then restart the server. The task was NOT executed.',
              logFilePath,
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
            killProcessTree(childProcess); // kill the cmd.exe wrapper AND the node CLI grandchild on Windows
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
