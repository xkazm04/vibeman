/**
 * CLI-based Claude Terminal Service
 *
 * Spawns Claude Code CLI process and parses stream-json output.
 * Uses web subscription authentication instead of API key.
 */

import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Stream-json message types from Claude CLI
export interface CLISystemMessage {
  type: 'system';
  subtype: 'init';
  session_id: string;
  tools: string[];
  model?: string;
  cwd?: string;
  claude_code_version?: string;
}

export interface CLIAssistantMessage {
  type: 'assistant';
  message: {
    id: string;
    type: 'message';
    role: 'assistant';
    content: Array<{
      type: 'text' | 'tool_use';
      text?: string;
      id?: string;
      name?: string;
      input?: Record<string, unknown>;
    }>;
    model: string;
    stop_reason: string;
    usage?: {
      input_tokens: number;
      output_tokens: number;
    };
  };
}

export interface CLIUserMessage {
  type: 'user';
  message: {
    role: 'user';
    content: Array<{
      type: 'tool_result';
      tool_use_id: string;
      content: string;
    }>;
  };
}

export interface CLIResultMessage {
  type: 'result';
  subtype?: string;
  result?: {
    usage?: {
      input_tokens: number;
      output_tokens: number;
    };
    session_id?: string;
  };
  duration_ms?: number;
  cost_usd?: number;
  is_error?: boolean;
}

export type CLIMessage = CLISystemMessage | CLIAssistantMessage | CLIUserMessage | CLIResultMessage;

// Events emitted during execution
export interface CLIExecutionEvent {
  type: 'init' | 'text' | 'tool_use' | 'tool_result' | 'result' | 'error' | 'stdout';
  data: Record<string, unknown>;
  timestamp: number;
}

export interface CLIExecution {
  id: string;
  projectPath: string;
  prompt: string;
  process: ChildProcess | null;
  sessionId?: string;
  status: 'running' | 'completed' | 'error' | 'aborted';
  startTime: number;
  endTime?: number;
  events: CLIExecutionEvent[];
  logFilePath?: string;
}

// Active executions map
const activeExecutions = new Map<string, CLIExecution>();

/**
 * Get logs directory for a project
 */
function getLogsDirectory(projectPath: string): string {
  return path.join(projectPath, '.claude', 'logs');
}

/**
 * Ensure logs directory exists
 */
function ensureLogsDirectory(projectPath: string): void {
  const logsDir = getLogsDirectory(projectPath);
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
}

/**
 * Generate log file path
 */
function getLogFilePath(projectPath: string, executionId: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const sanitized = executionId.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 50);
  return path.join(getLogsDirectory(projectPath), `terminal_${sanitized}_${timestamp}.log`);
}

/**
 * Parse a JSON line from stream-json output
 */
export function parseStreamJsonLine(line: string): CLIMessage | null {
  try {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('[')) {
      // Skip empty lines and log prefixes like [STDOUT]
      return null;
    }
    return JSON.parse(trimmed) as CLIMessage;
  } catch {
    return null;
  }
}

/**
 * Extract text content from assistant message
 */
export function extractTextContent(msg: CLIAssistantMessage): string {
  const textParts = msg.message.content
    .filter(c => c.type === 'text')
    .map(c => c.text || '');
  return textParts.join('\n');
}

/**
 * Extract tool uses from assistant message
 */
export function extractToolUses(msg: CLIAssistantMessage): Array<{
  id: string;
  name: string;
  input: Record<string, unknown>;
}> {
  return msg.message.content
    .filter(c => c.type === 'tool_use')
    .map(c => ({
      id: c.id || '',
      name: c.name || '',
      input: c.input || {},
    }));
}

/**
 * Start a CLI execution
 */
export function startExecution(
  projectPath: string,
  prompt: string,
  resumeSessionId?: string,
  onEvent?: (event: CLIExecutionEvent) => void
): string {
  const executionId = `exec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  ensureLogsDirectory(projectPath);
  const logFilePath = getLogFilePath(projectPath, executionId);

  const execution: CLIExecution = {
    id: executionId,
    projectPath,
    prompt,
    process: null,
    status: 'running',
    startTime: Date.now(),
    events: [],
    logFilePath,
  };

  activeExecutions.set(executionId, execution);

  // Create log file stream
  const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });
  let streamClosed = false;

  const logMessage = (msg: string) => {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${msg}\n`;
    if (!streamClosed) {
      try {
        logStream.write(logLine);
      } catch {
        // Ignore write errors
      }
    }
  };

  const closeLogStream = () => {
    if (!streamClosed) {
      streamClosed = true;
      logStream.end();
    }
  };

  const emitEvent = (event: CLIExecutionEvent) => {
    execution.events.push(event);
    if (onEvent) {
      onEvent(event);
    }
  };

  logMessage('=== Claude Terminal Execution Started ===');
  logMessage(`Execution ID: ${executionId}`);
  logMessage(`Project Path: ${projectPath}`);
  logMessage(`Prompt length: ${prompt.length} characters`);
  if (resumeSessionId) {
    logMessage(`Resume session: ${resumeSessionId}`);
  }
  logMessage('');

  // Spawn CLI process
  const isWindows = process.platform === 'win32';
  const command = isWindows ? 'claude.cmd' : 'claude';
  const args = [
    '-p',
    '-', // Read from stdin
    '--output-format',
    'stream-json',
    '--verbose',
    '--dangerously-skip-permissions',
  ];

  if (resumeSessionId) {
    args.push('--resume', resumeSessionId);
  }

  // Remove ANTHROPIC_API_KEY to force web subscription auth
  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY;

  try {
    const childProcess = spawn(command, args, {
      cwd: projectPath,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: isWindows,
      env,
    });

    execution.process = childProcess;

    // Write prompt to stdin
    childProcess.stdin.write(prompt);
    childProcess.stdin.end();

    // Buffer for incomplete lines
    let lineBuffer = '';

    // Handle stdout (stream-json output)
    childProcess.stdout.on('data', (data: Buffer) => {
      const text = data.toString();
      logMessage(`[STDOUT] ${text.trim()}`);

      // Emit raw stdout event
      emitEvent({
        type: 'stdout',
        data: { raw: text },
        timestamp: Date.now(),
      });

      // Parse JSON lines
      lineBuffer += text;
      const lines = lineBuffer.split('\n');
      lineBuffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        const parsed = parseStreamJsonLine(line);
        if (!parsed) continue;

        if (parsed.type === 'system' && parsed.subtype === 'init') {
          execution.sessionId = parsed.session_id;
          emitEvent({
            type: 'init',
            data: {
              sessionId: parsed.session_id,
              tools: parsed.tools,
              model: parsed.model,
              cwd: parsed.cwd,
              version: parsed.claude_code_version,
            },
            timestamp: Date.now(),
          });
        } else if (parsed.type === 'assistant') {
          // Extract text content
          const textContent = extractTextContent(parsed);
          if (textContent) {
            emitEvent({
              type: 'text',
              data: {
                content: textContent,
                model: parsed.message.model,
              },
              timestamp: Date.now(),
            });
          }

          // Extract tool uses
          const toolUses = extractToolUses(parsed);
          for (const toolUse of toolUses) {
            emitEvent({
              type: 'tool_use',
              data: {
                id: toolUse.id,
                name: toolUse.name,
                input: toolUse.input,
              },
              timestamp: Date.now(),
            });
          }
        } else if (parsed.type === 'user') {
          // Tool results
          const results = parsed.message.content.filter(c => c.type === 'tool_result');
          for (const result of results) {
            emitEvent({
              type: 'tool_result',
              data: {
                toolUseId: result.tool_use_id,
                content: result.content,
              },
              timestamp: Date.now(),
            });
          }
        } else if (parsed.type === 'result') {
          execution.sessionId = parsed.result?.session_id || execution.sessionId;
          emitEvent({
            type: 'result',
            data: {
              sessionId: parsed.result?.session_id,
              usage: parsed.result?.usage,
              durationMs: parsed.duration_ms,
              costUsd: parsed.cost_usd,
              isError: parsed.is_error,
            },
            timestamp: Date.now(),
          });
        }
      }
    });

    // Handle stderr
    childProcess.stderr.on('data', (data: Buffer) => {
      const text = data.toString();
      logMessage(`[STDERR] ${text.trim()}`);
    });

    // Handle process exit
    childProcess.on('close', (code: number) => {
      logMessage('');
      logMessage(`Process exited with code: ${code}`);
      logMessage('=== Claude Terminal Execution Finished ===');
      closeLogStream();

      execution.endTime = Date.now();
      execution.status = code === 0 ? 'completed' : 'error';

      if (code !== 0) {
        emitEvent({
          type: 'error',
          data: { exitCode: code, message: `Process exited with code ${code}` },
          timestamp: Date.now(),
        });
      }
    });

    // Handle spawn errors
    childProcess.on('error', (err: Error) => {
      logMessage(`[ERROR] ${err.message}`);
      closeLogStream();

      execution.endTime = Date.now();
      execution.status = 'error';

      emitEvent({
        type: 'error',
        data: { message: err.message },
        timestamp: Date.now(),
      });
    });

    // Timeout after 100 minutes
    const timeoutHandle = setTimeout(() => {
      if (!childProcess.killed) {
        logMessage('[TIMEOUT] Execution exceeded 100 minutes, killing process...');
        childProcess.kill();
        execution.status = 'error';
        emitEvent({
          type: 'error',
          data: { message: 'Execution timed out after 100 minutes' },
          timestamp: Date.now(),
        });
      }
    }, 6000000);

    childProcess.on('close', () => {
      clearTimeout(timeoutHandle);
    });

  } catch (error) {
    logMessage(`[EXCEPTION] ${error instanceof Error ? error.message : String(error)}`);
    closeLogStream();

    execution.status = 'error';
    execution.endTime = Date.now();

    emitEvent({
      type: 'error',
      data: { message: error instanceof Error ? error.message : 'Unknown error' },
      timestamp: Date.now(),
    });
  }

  return executionId;
}

/**
 * Get execution by ID
 */
export function getExecution(executionId: string): CLIExecution | undefined {
  return activeExecutions.get(executionId);
}

/**
 * Abort an execution
 */
export function abortExecution(executionId: string): boolean {
  const execution = activeExecutions.get(executionId);
  if (!execution || !execution.process) {
    return false;
  }

  execution.process.kill();
  execution.status = 'aborted';
  execution.endTime = Date.now();

  return true;
}

/**
 * Get all active executions
 */
export function getActiveExecutions(): CLIExecution[] {
  return Array.from(activeExecutions.values()).filter(e => e.status === 'running');
}

/**
 * Clean up completed executions older than specified age
 */
export function cleanupExecutions(maxAgeMs: number = 3600000): void {
  const now = Date.now();
  for (const [id, execution] of activeExecutions) {
    if (execution.status !== 'running' && execution.endTime && now - execution.endTime > maxAgeMs) {
      activeExecutions.delete(id);
    }
  }
}
