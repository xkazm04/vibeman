/**
 * CLI-based Terminal Service
 *
 * Spawns CLI processes (Claude Code or Gemini CLI) and parses stream-json output.
 * Provider-agnostic: the buildSpawnConfig() function maps provider+model to command/args/env.
 */

import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import type { CLIProvider, CLIProviderConfig } from './types';

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
      content: string | Array<{ type: string; text?: string }>;
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
  // Gemini result fields
  status?: string;
  stats?: {
    total_tokens?: number;
    input_tokens?: number;
    output_tokens?: number;
    cached?: number;
    input?: number;
    duration_ms?: number;
    tool_calls?: number;
  };
  error?: { type?: string; message?: string } | string;
}

// Gemini-specific stream-json message types
export interface GeminiInitMessage {
  type: 'init';
  session_id?: string;
  model?: string;
  timestamp?: string;
}

export interface GeminiTextMessage {
  type: 'message';
  role: string;
  content: string;
  delta?: boolean;
  timestamp?: string;
}

export interface GeminiToolUseMessage {
  type: 'tool_use';
  tool_name: string;
  tool_id: string;
  parameters?: Record<string, unknown>;
  timestamp?: string;
}

export interface GeminiToolResultMessage {
  type: 'tool_result';
  tool_id: string;
  status?: string;
  output?: string | Record<string, unknown>;
  error?: { type?: string; message?: string };
  timestamp?: string;
}

export type CLIMessage =
  | CLISystemMessage
  | CLIAssistantMessage
  | CLIUserMessage
  | CLIResultMessage
  | GeminiInitMessage
  | GeminiTextMessage
  | GeminiToolUseMessage
  | GeminiToolResultMessage;

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
  provider?: CLIProvider;
  status: 'running' | 'completed' | 'error' | 'aborted';
  startTime: number;
  endTime?: number;
  events: CLIExecutionEvent[];
  logFilePath?: string;
}

// Active executions map - use globalThis to persist across Next.js module reloads in dev mode
const globalForExecutions = globalThis as unknown as {
  cliActiveExecutions: Map<string, CLIExecution> | undefined;
};

const activeExecutions = globalForExecutions.cliActiveExecutions ?? new Map<string, CLIExecution>();

if (!globalForExecutions.cliActiveExecutions) {
  globalForExecutions.cliActiveExecutions = activeExecutions;
}

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
 * Generate log file path (prefixed with provider name)
 */
function getLogFilePath(projectPath: string, executionId: string, provider: CLIProvider = 'claude'): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const sanitized = executionId.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 50);
  return path.join(getLogsDirectory(projectPath), `${provider}_${sanitized}_${timestamp}.log`);
}

/**
 * Build provider-specific spawn configuration.
 * Maps (provider, model, prompt) → (command, args, env, stdinPrompt).
 */
interface SpawnConfig {
  command: string;
  args: string[];
  env: NodeJS.ProcessEnv;
  /** If true, write prompt to stdin; otherwise prompt is in args */
  stdinPrompt: boolean;
}

function buildSpawnConfig(
  prompt: string,
  resumeSessionId?: string,
  providerConfig?: CLIProviderConfig
): SpawnConfig {
  const provider = providerConfig?.provider || 'claude';
  const model = providerConfig?.model;

  if (provider === 'vscode') {
    throw new Error('VS Code provider uses direct HTTP communication with the vibeman-bridge extension. It cannot be executed via the CLI service.');
  }

  if (provider === 'ollama') {
    // Ollama v0.14+ supports Anthropic Messages API at /v1/messages.
    // Claude CLI sends to ANTHROPIC_BASE_URL + '/v1/messages', so we point
    // the base URL at Ollama's root.
    // Per Ollama docs, ANTHROPIC_API_KEY must be empty and ANTHROPIC_AUTH_TOKEN
    // must be 'ollama' — these are required by Claude CLI but ignored by Ollama.
    // For cloud models (e.g. qwen3.5:cloud), run `ollama signin` first so the
    // local server can proxy requests to ollama.com.
    const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

    const args = [
      '-p', '-', // Read from stdin
      '--output-format', 'stream-json',
      '--verbose',
      '--dangerously-skip-permissions',
      '--model', model || 'qwen3.5:cloud',
    ];
    if (resumeSessionId) args.push('--resume', resumeSessionId);

    const env = { ...process.env };
    env.ANTHROPIC_BASE_URL = ollamaBaseUrl;
    env.ANTHROPIC_API_KEY = '';
    env.ANTHROPIC_AUTH_TOKEN = 'ollama';
    return { command: 'claude', args, env, stdinPrompt: true };
  }

  if (provider === 'gemini') {
    const args = [
      '-o', 'stream-json',
      '--approval-mode=yolo',
    ];
    if (model) args.push('-m', model);
    if (resumeSessionId) args.push('--resume', resumeSessionId);
    // Use stdin for prompt delivery + '-p _' to trigger headless mode.
    // On Windows, shell:true causes spawn to split multi-word -p values
    // into positional args. Gemini appends stdin to -p value, so the
    // effective prompt is: <stdin>\n\n_ (trailing _ is harmless).
    args.push('-p', '_');

    const env = { ...process.env };
    delete env.ANTHROPIC_API_KEY;
    return { command: 'gemini', args, env, stdinPrompt: true };
  }

  // Claude (default)
  const args = [
    '-p', '-', // Read from stdin
    '--output-format', 'stream-json',
    '--verbose',
    '--dangerously-skip-permissions',
  ];
  if (model) args.push('--model', model);
  if (resumeSessionId) args.push('--resume', resumeSessionId);

  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY; // Force web subscription auth
  return { command: 'claude', args, env, stdinPrompt: true };
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
  onEvent?: (event: CLIExecutionEvent) => void,
  providerConfig?: CLIProviderConfig,
  extraEnv?: Record<string, string>
): string {
  const provider = providerConfig?.provider || 'claude';
  const executionId = `exec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  ensureLogsDirectory(projectPath);
  const logFilePath = getLogFilePath(projectPath, executionId, provider);

  const execution: CLIExecution = {
    id: executionId,
    projectPath,
    prompt,
    process: null,
    provider,
    status: 'running',
    startTime: Date.now(),
    events: [],
    logFilePath,
  };

  activeExecutions.set(executionId, execution);
  console.log(`[CLI:${provider}] Registered execution: ${executionId}. Total active: ${activeExecutions.size}`);

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

  logMessage(`=== CLI Terminal Execution Started (${provider}) ===`);
  logMessage(`Execution ID: ${executionId}`);
  logMessage(`Provider: ${provider}${providerConfig?.model ? ` (model: ${providerConfig.model})` : ''}`);
  logMessage(`Project Path: ${projectPath}`);
  logMessage(`Prompt length: ${prompt.length} characters`);
  if (resumeSessionId) {
    logMessage(`Resume session: ${resumeSessionId}`);
  }
  logMessage('');

  // Build provider-specific spawn configuration
  // On Windows, shell resolves both .exe and .cmd installs automatically
  const isWindows = process.platform === 'win32';
  const spawnConfig = buildSpawnConfig(prompt, resumeSessionId, providerConfig);

  // Merge extra env vars (e.g., VIBEMAN_PROJECT_ID, VIBEMAN_TASK_ID for MCP bidirectional channel)
  if (extraEnv) {
    Object.assign(spawnConfig.env, extraEnv);
  }

  try {
    const childProcess = spawn(spawnConfig.command, spawnConfig.args, {
      cwd: projectPath,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: isWindows,
      env: spawnConfig.env,
    });

    execution.process = childProcess;

    // Write prompt to stdin only for providers that use it (Claude)
    if (spawnConfig.stdinPrompt) {
      childProcess.stdin.write(prompt);
    }
    childProcess.stdin.end();

    // Buffer for incomplete lines
    let lineBuffer = '';
    let resultEventEmitted = false;
    let initEventReceived = false;
    let assistantMessageCount = 0;

    // Process a single line of JSON output.
    // Handles both Claude CLI and Gemini CLI stream-json formats.
    const processLine = (line: string) => {
      const parsed = parseStreamJsonLine(line);
      if (!parsed) return;

      // ── Claude: {"type":"system","subtype":"init",...}
      if (parsed.type === 'system' && parsed.subtype === 'init') {
        initEventReceived = true;
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

      // ── Gemini: {"type":"init","session_id":"...","model":"..."}
      } else if (parsed.type === 'init') {
        initEventReceived = true;
        execution.sessionId = parsed.session_id;
        emitEvent({
          type: 'init',
          data: {
            sessionId: parsed.session_id,
            model: parsed.model,
          },
          timestamp: Date.now(),
        });

      // ── Claude: {"type":"assistant","message":{"role":"assistant","content":[...]}}
      } else if (parsed.type === 'assistant') {
        assistantMessageCount++;
        const textContent = extractTextContent(parsed);
        if (textContent) {
          emitEvent({
            type: 'text',
            data: { content: textContent, model: parsed.message.model },
            timestamp: Date.now(),
          });
        }
        const toolUses = extractToolUses(parsed);
        for (const toolUse of toolUses) {
          emitEvent({
            type: 'tool_use',
            data: { id: toolUse.id, name: toolUse.name, input: toolUse.input },
            timestamp: Date.now(),
          });
        }

      // ── Gemini: {"type":"message","role":"assistant","content":"...","delta":true}
      // ── Gemini: {"type":"message","role":"user","content":"..."}
      } else if (parsed.type === 'message') {
        if (parsed.role === 'assistant' && parsed.content) {
          assistantMessageCount++;
          emitEvent({
            type: 'text',
            data: { content: parsed.content, model: undefined },
            timestamp: Date.now(),
          });
        }
        // Gemini tool calls come as separate action/action_result events (handled below)

      // ── Gemini: {"type":"tool_use","tool_name":"glob","tool_id":"glob_...","parameters":{...}}
      } else if (parsed.type === 'tool_use') {
        emitEvent({
          type: 'tool_use',
          data: {
            id: parsed.tool_id,
            name: parsed.tool_name,
            input: parsed.parameters || {},
          },
          timestamp: Date.now(),
        });

      // ── Gemini: {"type":"tool_result","tool_id":"glob_...","status":"success","output":"..."}
      } else if (parsed.type === 'tool_result') {
        emitEvent({
          type: 'tool_result',
          data: {
            toolUseId: parsed.tool_id,
            content: typeof parsed.output === 'string' ? parsed.output : JSON.stringify(parsed.output || ''),
          },
          timestamp: Date.now(),
        });

      // ── Claude: {"type":"user","message":{"content":[{"type":"tool_result",...}]}}
      } else if (parsed.type === 'user' && parsed.message?.content) {
        const results = parsed.message.content.filter((c: any) => c.type === 'tool_result');
        for (const result of results) {
          const rawContent = result.content;
          const normalizedContent = typeof rawContent === 'string'
            ? rawContent
            : Array.isArray(rawContent)
              ? rawContent.map((block: { type: string; text?: string }) => block.text || '').join('\n')
              : String(rawContent || '');
          emitEvent({
            type: 'tool_result',
            data: { toolUseId: result.tool_use_id, content: normalizedContent },
            timestamp: Date.now(),
          });
        }

      // ── Both: {"type":"result",...}
      // Claude: {"result":{"session_id":"..."},"duration_ms":...,"cost_usd":...}
      // Gemini: {"status":"success","stats":{"total_tokens":...,"duration_ms":...}}
      } else if (parsed.type === 'result') {
        resultEventEmitted = true;
        // Claude format
        if (parsed.result) {
          execution.sessionId = parsed.result.session_id || execution.sessionId;
          emitEvent({
            type: 'result',
            data: {
              sessionId: parsed.result.session_id,
              usage: parsed.result.usage,
              durationMs: parsed.duration_ms,
              costUsd: parsed.cost_usd,
              isError: parsed.is_error,
            },
            timestamp: Date.now(),
          });
        } else {
          // Gemini format
          const stats = parsed.stats || {};
          const isError = parsed.status === 'error';
          emitEvent({
            type: isError ? 'error' : 'result',
            data: {
              sessionId: execution.sessionId,
              usage: stats.total_tokens ? {
                inputTokens: stats.input_tokens || 0,
                outputTokens: stats.output_tokens || 0,
              } : undefined,
              durationMs: stats.duration_ms,
              isError,
              ...(isError && parsed.error ? { message: typeof parsed.error === 'string' ? parsed.error : (parsed.error.message || String(parsed.error)) } : {}),
            },
            timestamp: Date.now(),
          });
        }
      }
    };

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
        processLine(line);
      }
    });

    // Handle stderr
    childProcess.stderr.on('data', (data: Buffer) => {
      const text = data.toString();
      logMessage(`[STDERR] ${text.trim()}`);
    });

    // Handle process exit
    childProcess.on('close', (code: number) => {
      // Flush any remaining content in the line buffer
      if (lineBuffer.trim()) {
        logMessage(`[STDOUT-FINAL] ${lineBuffer.trim()}`);
        processLine(lineBuffer);
        lineBuffer = '';
      }

      const durationMs = Date.now() - execution.startTime;
      logMessage('');
      logMessage(`Process exited with code: ${code}`);
      logMessage(`Duration: ${durationMs}ms`);
      logMessage(`Init received: ${initEventReceived}, Assistant messages: ${assistantMessageCount}`);
      logMessage(`Result event emitted: ${resultEventEmitted}`);
      logMessage(`=== CLI Terminal Execution Finished (${provider}) ===`);
      closeLogStream();

      execution.endTime = Date.now();
      execution.status = code === 0 ? 'completed' : 'error';

      if (code !== 0) {
        const errorMsg = !initEventReceived && durationMs < 3000
          ? `'${spawnConfig.command}' CLI failed to start (exit code ${code}). Is it installed and in PATH?`
          : `Process exited with code ${code}`;
        emitEvent({
          type: 'error',
          data: { exitCode: code, message: errorMsg },
          timestamp: Date.now(),
        });
      } else if (!resultEventEmitted) {
        // Process completed successfully but no result event was captured
        // Only emit synthetic result if CLI actually started and did meaningful work:
        // - Must have received init event (CLI initialized)
        // - Must have at least one assistant message (Claude responded)
        // - Must have run for at least 5 seconds (to filter out immediate failures)
        const shouldEmitSynthetic = initEventReceived && assistantMessageCount > 0 && durationMs > 5000;

        if (shouldEmitSynthetic) {
          logMessage('[SYNTHETIC] Emitting synthetic result event (CLI did work but result not captured)');
          emitEvent({
            type: 'result',
            data: {
              sessionId: execution.sessionId,
              isError: false,
              synthetic: true, // Mark as synthetic for debugging
            },
            timestamp: Date.now(),
          });
        } else {
          // Don't emit anything - let the SSE stream handler deal with status changes
          // This prevents premature task failure for CLI processes that are still initializing
          logMessage(`[NO-SYNTHETIC] Skipping synthetic result: init=${initEventReceived}, msgs=${assistantMessageCount}, duration=${durationMs}ms`);
        }
      }
    });

    // Handle spawn errors
    childProcess.on('error', (err: Error & { code?: string }) => {
      logMessage(`[ERROR] ${err.message}`);
      closeLogStream();

      execution.endTime = Date.now();
      execution.status = 'error';

      // Provide helpful error messages for common spawn failures
      let errorMessage = err.message;
      if (err.code === 'ENOENT') {
        const cliName = spawnConfig.command;
        errorMessage = `'${cliName}' CLI not found. Please install it and ensure it's available in PATH.`;
      }

      emitEvent({
        type: 'error',
        data: { message: errorMessage },
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
  const execution = activeExecutions.get(executionId);
  if (!execution) {
    // Log for debugging - helps identify if Map was cleared
    console.debug(`[CLI] getExecution: ${executionId} not found. Active executions: ${activeExecutions.size}`);
  }
  return execution;
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
