/**
 * Persona Execution Engine
 *
 * Spawns Claude Code CLI in headless mode to execute persona tasks.
 * Follows the pattern from executionManager.ts but adapted for persona agents.
 *
 * Flow:
 * 1. Assemble prompt (persona instructions + tools + input)
 * 2. Spawn `claude -p - --output-format stream-json --dangerously-skip-permissions`
 * 3. Pipe prompt via stdin
 * 4. Stream output to buffer + log file
 * 5. Capture session ID and results
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { ChildProcess } from 'child_process';
import type { DbPersona, DbPersonaToolDefinition } from '@/app/db/models/persona.types';
import { assemblePrompt } from './promptAssembler';
import {
  decryptCredential,
  writeTempCredentialFile,
  deleteTempCredentialFile,
} from './credentialCrypto';
import { personaCredentialRepository, manualReviewRepository, personaMessageRepository } from '@/app/db/repositories/persona.repository';
import { deliverMessage } from './messageDelivery';

// ============================================================================
// In-memory state for streaming
// Use globalThis to survive Next.js dev mode module reloads — without this,
// the /execute route and /stream SSE route get different Map instances.
// ============================================================================

const g = globalThis as any;

/** Output lines per execution for SSE streaming */
const executionBuffers: Map<string, string[]> =
  (g.__personaExecutionBuffers ??= new Map<string, string[]>());

/** Active child processes for cancellation */
const executionProcesses: Map<string, ChildProcess> =
  (g.__personaExecutionProcesses ??= new Map<string, ChildProcess>());

/**
 * Consume output lines from a running/completed execution.
 * Returns lines starting from `offset` for incremental streaming.
 */
export function consumeOutput(executionId: string, offset: number = 0): string[] {
  const buffer = executionBuffers.get(executionId);
  if (!buffer) return [];
  return buffer.slice(offset);
}

/**
 * Cancel a running execution by killing the child process.
 */
export function cancelExecution(executionId: string): boolean {
  const proc = executionProcesses.get(executionId);
  if (proc && !proc.killed) {
    proc.kill();
    executionProcesses.delete(executionId);
    return true;
  }
  return false;
}

/**
 * Get the number of buffered output lines for an execution.
 */
export function getBufferLength(executionId: string): number {
  return executionBuffers.get(executionId)?.length ?? 0;
}

/**
 * Clean up buffers for a completed execution (call after client disconnects).
 */
export function cleanupExecution(executionId: string): void {
  executionBuffers.delete(executionId);
  executionProcesses.delete(executionId);
}

// ============================================================================
// Execution
// ============================================================================

export interface ExecutionInput {
  executionId: string;
  persona: DbPersona;
  tools: DbPersonaToolDefinition[];
  inputData?: object;
  logDir?: string;
  /** Last completed execution for this persona (for temporal context) */
  lastExecution?: {
    completed_at: string;
    duration_ms: number | null;
    status: string;
  } | null;
  /** Trigger context if execution was triggered automatically */
  triggerContext?: {
    trigger_type: string;
    interval_seconds: number | null;
  } | null;
}

export interface ExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  sessionLimitReached?: boolean;
  logFilePath?: string;
  claudeSessionId?: string;
  durationMs?: number;
}

/**
 * Execute a persona task using Claude Code CLI.
 */
export async function executePersona(input: ExecutionInput): Promise<ExecutionResult> {
  const { spawn } = require('child_process');
  const startTime = Date.now();

  // Initialize output buffer
  executionBuffers.set(input.executionId, []);

  const appendOutput = (line: string) => {
    const buffer = executionBuffers.get(input.executionId);
    if (buffer) buffer.push(line);
  };

  // Set up log file
  const logDir = input.logDir || path.join(os.tmpdir(), 'vibeman-persona-logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  const logFilePath = path.join(logDir, `${input.executionId}.log`);
  const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });
  let streamClosed = false;

  // log() writes to the log FILE only (not user-facing SSE buffer)
  const log = (msg: string) => {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${msg}`;
    if (!streamClosed) {
      try { logStream.write(logLine + '\n'); } catch { /* ignore */ }
    }
  };

  // userLog() writes to BOTH the SSE buffer (user-facing) AND the log file
  const userLog = (msg: string) => {
    appendOutput(msg);
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${msg}`;
    if (!streamClosed) {
      try { logStream.write(logLine + '\n'); } catch { /* ignore */ }
    }
  };

  const closeLog = () => {
    if (!streamClosed) {
      streamClosed = true;
      logStream.end();
    }
  };

  // Resolve credential file paths for tools that need them
  const credentialFilePaths = new Map<string, string>();
  const tempCredFiles: string[] = [];

  // Capture project root and create isolated exec dir before try block
  const projectRoot = process.cwd();
  const execDir = path.join(os.tmpdir(), `vibeman-persona-exec-${input.executionId}`);

  try {
    for (const tool of input.tools) {
      if (tool.requires_credential_type) {
        const creds = personaCredentialRepository.getByServiceType(tool.requires_credential_type);
        if (creds.length > 0) {
          const cred = creds[0];
          const decrypted = decryptCredential(cred.encrypted_data, cred.iv);
          const tmpPath = writeTempCredentialFile(decrypted);
          credentialFilePaths.set(tool.name, tmpPath);
          tempCredFiles.push(tmpPath);
          personaCredentialRepository.markUsed(cred.id);
        }
      }
    }

    // Create isolated temp directory so Claude CLI won't load the project's CLAUDE.md
    if (!fs.existsSync(execDir)) {
      fs.mkdirSync(execDir, { recursive: true });
    }

    // Assemble prompt with absolute tool paths
    const prompt = assemblePrompt({
      persona: input.persona,
      tools: input.tools,
      inputData: input.inputData,
      credentialFilePaths,
      projectRoot,
      lastExecution: input.lastExecution,
      triggerContext: input.triggerContext,
    });

    log('=== Persona Execution Started ===');
    log(`Persona: ${input.persona.name}`);
    log(`Execution ID: ${input.executionId}`);
    log(`Tools: ${input.tools.map(t => t.name).join(', ') || 'none'}`);
    log(`Prompt length: ${prompt.length} characters`);
    log(`Exec dir: ${execDir}`);
    log('');

    return await new Promise<ExecutionResult>((resolve) => {
      try {
        const isWindows = process.platform === 'win32';
        const command = isWindows ? 'claude.cmd' : 'claude';
        const args = [
          '-p',
          '-',
          '--output-format',
          'stream-json',
          '--verbose',
          '--dangerously-skip-permissions',
        ];

        // Prepare environment - remove ANTHROPIC_API_KEY for web auth
        const env = { ...process.env };
        delete env.ANTHROPIC_API_KEY;

        const childProcess = spawn(command, args, {
          cwd: execDir,
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: isWindows,
          env,
        });

        executionProcesses.set(input.executionId, childProcess);

        // Pipe prompt to stdin
        childProcess.stdin.write(prompt);
        childProcess.stdin.end();

        let stdout = '';
        let stderr = '';
        let claudeSessionId: string | undefined;

        childProcess.stdout.on('data', (data: Buffer) => {
          const text = data.toString();
          stdout += text;

          for (const line of text.split('\n')) {
            if (!line.trim()) continue;

            try {
              const parsed = JSON.parse(line);

              // Always log raw JSON to file
              log(`[STDOUT] ${line.trim()}`);

              // Capture session ID (file-only)
              if (parsed.session_id && !claudeSessionId) {
                claudeSessionId = parsed.session_id;
                log(`[SESSION] Captured: ${claudeSessionId}`);
              } else if (parsed.result?.session_id && !claudeSessionId) {
                claudeSessionId = parsed.result.session_id;
                log(`[SESSION] Captured from result: ${claudeSessionId}`);
              }

              // Parse for user-facing output
              if (parsed.type === 'system' && parsed.subtype === 'init') {
                userLog(`Session started (${parsed.model})`);
              } else if (parsed.type === 'assistant' && parsed.message?.content) {
                for (const block of parsed.message.content) {
                  if (block.type === 'text' && block.text) {
                    for (const textLine of block.text.split('\n')) {
                      userLog(textLine);
                    }
                  } else if (block.type === 'tool_use') {
                    userLog(`> Using tool: ${block.name}`);
                  }
                }
              } else if (parsed.type === 'tool_result' || parsed.type === 'tool') {
                if (parsed.content) {
                  const preview = typeof parsed.content === 'string'
                    ? parsed.content.slice(0, 200)
                    : JSON.stringify(parsed.content).slice(0, 200);
                  userLog(`  Tool result: ${preview}${preview.length >= 200 ? '...' : ''}`);
                }
              } else if (parsed.type === 'result') {
                userLog('');
                userLog(`Completed in ${((parsed.duration_ms || 0) / 1000).toFixed(1)}s`);
                if (parsed.total_cost_usd) {
                  userLog(`Cost: $${parsed.total_cost_usd.toFixed(4)}`);
                }
              }
              // Skip: system hooks, session captures, other noise
            } catch {
              // Non-JSON line — show it directly
              userLog(line.trim());
            }
          }
        });

        childProcess.stderr.on('data', (data: Buffer) => {
          const text = data.toString();
          stderr += text;
          userLog(`[ERROR] ${text.trim()}`);
        });

        childProcess.on('close', (code: number) => {
          const durationMs = Date.now() - startTime;
          log('');
          log(`Process exited with code: ${code}`);
          log(`Duration: ${durationMs}ms`);
          log('=== Persona Execution Finished ===');
          if (code !== 0) {
            userLog(`Process exited with code: ${code}`);
          }
          closeLog();
          executionProcesses.delete(input.executionId);

          // Parse manual review blocks from output
          parseManualReviews(stdout, input.executionId, input.persona.id);
          // Parse user message blocks from output
          parseUserMessages(stdout, input.executionId, input.persona.id);

          if (code === 0) {
            resolve({
              success: true,
              output: stdout || 'Execution completed',
              logFilePath,
              claudeSessionId,
              durationMs,
            });
          } else {
            const errorOutput = stderr.toLowerCase();
            const isSessionLimit =
              errorOutput.includes('session limit') ||
              errorOutput.includes('rate limit') ||
              errorOutput.includes('usage limit') ||
              errorOutput.includes('quota exceeded') ||
              errorOutput.includes('too many requests');

            resolve({
              success: false,
              error: isSessionLimit
                ? 'Session limit reached'
                : `Execution failed (code ${code}): ${stderr}`,
              sessionLimitReached: isSessionLimit,
              logFilePath,
              durationMs,
            });
          }
        });

        childProcess.on('error', (err: Error) => {
          const durationMs = Date.now() - startTime;

          if (err.message.includes('ENOENT') || err.message.includes('spawn claude')) {
            userLog('[WARN] Claude CLI not found - running in simulation mode');
            userLog('Install Claude Code CLI: https://docs.claude.com/claude-code');
            closeLog();
            executionProcesses.delete(input.executionId);

            resolve({
              success: true,
              output: `[SIMULATION MODE] Persona: ${input.persona.name}\n\nClaude CLI not installed. Install it to enable real execution.`,
              logFilePath,
              claudeSessionId: `simulated-${Date.now()}`,
              durationMs,
            });
          } else {
            userLog(`[ERROR] ${err.message}`);
            closeLog();
            executionProcesses.delete(input.executionId);

            resolve({
              success: false,
              error: `Failed to spawn process: ${err.message}`,
              logFilePath,
              durationMs,
            });
          }
        });

        // Timeout
        const timeoutMs = input.persona.timeout_ms || 300000;
        const timeoutHandle = setTimeout(() => {
          if (!childProcess.killed) {
            userLog(`[TIMEOUT] Exceeded ${timeoutMs}ms, killing process`);
            childProcess.kill();
          }
        }, timeoutMs);

        childProcess.on('close', () => clearTimeout(timeoutHandle));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        userLog(`[EXCEPTION] ${msg}`);
        closeLog();

        resolve({
          success: false,
          error: `Execution exception: ${msg}`,
          logFilePath,
          durationMs: Date.now() - startTime,
        });
      }
    });
  } finally {
    // Clean up temp credential files
    for (const tmpPath of tempCredFiles) {
      deleteTempCredentialFile(tmpPath);
    }
    // Clean up isolated exec directory
    try {
      if (fs.existsSync(execDir)) {
        fs.rmSync(execDir, { recursive: true, force: true });
      }
    } catch { /* ignore cleanup errors */ }
  }
}

/**
 * Parse output for manual_review JSON blocks and create review records.
 */
function parseManualReviews(output: string, executionId: string, personaId: string): void {
  if (!output) return;

  try {
    // Match {"manual_review": {...}} patterns in the output
    const regex = /\{[\s\S]*?"manual_review"[\s\S]*?\{[\s\S]*?\}[\s\S]*?\}/g;
    const matches = output.match(regex);
    if (!matches) return;

    for (const match of matches) {
      try {
        const parsed = JSON.parse(match);
        if (parsed.manual_review && typeof parsed.manual_review === 'object') {
          const review = parsed.manual_review;
          manualReviewRepository.create({
            execution_id: executionId,
            persona_id: personaId,
            title: review.title || 'Manual Review Required',
            description: review.description || undefined,
            severity: ['info', 'warning', 'critical'].includes(review.severity) ? review.severity : 'info',
            context_data: review.context_data || undefined,
            suggested_actions: Array.isArray(review.suggested_actions) ? review.suggested_actions : undefined,
          });
        }
      } catch {
        // Individual match parse failure - skip
      }
    }
  } catch {
    // Don't let review parsing errors affect execution
  }
}

/**
 * Parse output for user_message JSON blocks and create message records + trigger delivery.
 */
function parseUserMessages(output: string, executionId: string, personaId: string): void {
  if (!output) return;

  try {
    const regex = /\{[\s\S]*?"user_message"[\s\S]*?\{[\s\S]*?\}[\s\S]*?\}/g;
    const matches = output.match(regex);
    if (!matches) return;

    for (const match of matches) {
      try {
        const parsed = JSON.parse(match);
        if (parsed.user_message && typeof parsed.user_message === 'object') {
          const msg = parsed.user_message;
          const created = personaMessageRepository.create({
            persona_id: personaId,
            execution_id: executionId,
            title: msg.title || undefined,
            content: msg.content || 'No content',
            content_type: msg.content_type || 'text',
            priority: ['low', 'normal', 'high'].includes(msg.priority) ? msg.priority : 'normal',
          });
          // Fire-and-forget delivery
          deliverMessage(created.id, personaId).catch(() => {});
        }
      } catch {
        // Individual match parse failure - skip
      }
    }
  } catch {
    // Don't let message parsing errors affect execution
  }
}
