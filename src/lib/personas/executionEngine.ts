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
import { isCloudMode } from './cloudClient';
import { executePersonaCloud, cancelCloudExecution } from './cloudExecutionEngine';
import { personaCredentialRepository, manualReviewRepository, personaMessageRepository, personaToolUsageRepository, personaRepository } from '@/app/db/repositories/persona.repository';
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
  // Try local process first
  const proc = executionProcesses.get(executionId);
  if (proc && !proc.killed) {
    proc.kill();
    executionProcesses.delete(executionId);
    return true;
  }
  // If cloud mode, cancel via orchestrator
  if (isCloudMode()) {
    return cancelCloudExecution(executionId);
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
  executionFlows?: string;
  modelUsed?: string;
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
}

/**
 * Execute a persona task using Claude Code CLI.
 */
export async function executePersona(input: ExecutionInput): Promise<ExecutionResult> {
  // Route to cloud engine when in cloud mode
  if (isCloudMode()) {
    return executePersonaCloud(input);
  }

  const { spawn } = require('child_process');
  const startTime = Date.now();

  // Initialize output buffer
  executionBuffers.set(input.executionId, []);

  const MAX_BUFFER_LINES = 1000;
  const appendOutput = (line: string) => {
    const buffer = executionBuffers.get(input.executionId);
    if (buffer) {
      buffer.push(line);
      // Cap buffer to prevent memory leak on long executions
      if (buffer.length > MAX_BUFFER_LINES) {
        buffer.splice(0, buffer.length - MAX_BUFFER_LINES);
      }
    }
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

    // Parse model profile for CLI flags
    let modelProfile: { model?: string; provider?: string; base_url?: string; auth_token?: string } | null = null;
    try {
      if (input.persona.model_profile) {
        modelProfile = JSON.parse(input.persona.model_profile);
      }
    } catch { /* ignore invalid JSON */ }

    // Track execution metrics from stream output
    const executionMetrics = { model_used: modelProfile?.model || null, input_tokens: 0, output_tokens: 0, cost_usd: 0 };

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

        // Model selection
        if (modelProfile?.model) {
          args.push('--model', modelProfile.model);
        }

        // Budget and turn limits
        if (input.persona.max_budget_usd) {
          args.push('--max-budget-usd', String(input.persona.max_budget_usd));
        }
        if (input.persona.max_turns) {
          args.push('--max-turns', String(input.persona.max_turns));
        }

        // Prepare environment - remove ANTHROPIC_API_KEY for web auth
        const env = { ...process.env };
        delete env.ANTHROPIC_API_KEY;

        // Provider-specific environment
        if (modelProfile?.provider === 'ollama') {
          env.ANTHROPIC_BASE_URL = modelProfile.base_url || 'http://localhost:11434';
          env.ANTHROPIC_AUTH_TOKEN = 'ollama';
          env.ANTHROPIC_API_KEY = '';
        } else if (modelProfile?.provider === 'litellm' || modelProfile?.provider === 'custom') {
          if (modelProfile.base_url) {
            env.ANTHROPIC_BASE_URL = modelProfile.base_url;
          }
          if (modelProfile.auth_token) {
            env.ANTHROPIC_AUTH_TOKEN = modelProfile.auth_token;
          }
        }

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
        let assistantText = ''; // Extracted text from assistant blocks (unescaped)
        let claudeSessionId: string | undefined;
        const toolUseCounts = new Map<string, number>();

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
                      assistantText += textLine + '\n';

                      // Mid-stream detection: persona_action, emit_event, user_message
                      try {
                        const trimmed = textLine.trim();
                        if (trimmed.startsWith('{"user_message":')) {
                          const msgData = JSON.parse(trimmed);
                          if (msgData.user_message && typeof msgData.user_message === 'object') {
                            const msg = msgData.user_message;
                            const created = personaMessageRepository.create({
                              persona_id: input.persona.id,
                              execution_id: input.executionId,
                              title: msg.title || undefined,
                              content: msg.content || 'No content',
                              content_type: msg.content_type || 'text',
                              priority: ['low', 'normal', 'high'].includes(msg.priority) ? msg.priority : 'normal',
                            });
                            deliverMessage(created.id, input.persona.id).catch(() => {});
                            log(`[MESSAGE] Created message "${msg.title || 'untitled'}" (${created.id})`);
                          }
                        } else if (trimmed.startsWith('{"persona_action":')) {
                          const actionData = JSON.parse(trimmed);
                          if (actionData.persona_action?.target) {
                            const targetName = actionData.persona_action.target;
                            const allPersonas = personaRepository.getAll();
                            const targetPersona = allPersonas.find(p => p.name === targetName);
                            if (targetPersona) {
                              const { personaEventBus } = require('./eventBus');
                              const parentEvt = (input.inputData as Record<string, unknown> | undefined)?._event as
                                | { _meta?: { depth?: number } } | undefined;
                              const curDepth = (parentEvt?._meta?.depth as number) ?? 0;
                              personaEventBus.publish({
                                event_type: 'persona_action' as const,
                                source_type: 'persona' as const,
                                source_id: input.persona.id,
                                target_persona_id: targetPersona.id,
                                project_id: input.persona.project_id,
                                payload: {
                                  ...actionData.persona_action,
                                  _meta: { depth: curDepth + 1, source_persona_id: input.persona.id },
                                },
                              });
                              log(`[EVENT] Published persona_action targeting "${targetName}" (${targetPersona.id})`);
                            } else {
                              log(`[EVENT] persona_action target "${targetName}" not found`);
                            }
                          }
                        } else if (trimmed.startsWith('{"emit_event":')) {
                          const eventData = JSON.parse(trimmed);
                          if (eventData.emit_event) {
                            const { personaEventBus } = require('./eventBus');
                            const parentEvt = (input.inputData as Record<string, unknown> | undefined)?._event as
                              | { _meta?: { depth?: number } } | undefined;
                            const curDepth = (parentEvt?._meta?.depth as number) ?? 0;
                            personaEventBus.publish({
                              event_type: 'custom' as const,
                              source_type: 'persona' as const,
                              source_id: input.persona.id,
                              target_persona_id: null,
                              project_id: input.persona.project_id,
                              payload: {
                                ...eventData.emit_event,
                                _meta: { depth: curDepth + 1, source_persona_id: input.persona.id },
                              },
                            });
                            log(`[EVENT] Published custom event: ${eventData.emit_event.type || 'unknown'}`);
                          }
                        }
                      } catch { /* event parsing not critical */ }
                    }
                  } else if (block.type === 'tool_use') {
                    userLog(`> Using tool: ${block.name}`);
                    toolUseCounts.set(block.name, (toolUseCounts.get(block.name) || 0) + 1);
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
                  executionMetrics.cost_usd = parsed.total_cost_usd;
                }
                if (parsed.total_input_tokens) {
                  executionMetrics.input_tokens = parsed.total_input_tokens;
                }
                if (parsed.total_output_tokens) {
                  executionMetrics.output_tokens = parsed.total_output_tokens;
                }
                if (parsed.model) {
                  executionMetrics.model_used = parsed.model;
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

          // Parse manual review blocks from extracted assistant text
          // (NOT raw stdout which contains escaped JSON stream data)
          parseManualReviews(assistantText, input.executionId, input.persona.id);
          // Parse user message blocks (backup for multi-line JSON not caught mid-stream)
          parseUserMessages(assistantText, input.executionId, input.persona.id);
          // Record tool usage for analytics
          recordToolUsage(toolUseCounts, input.executionId, input.persona.id);
          // Parse execution flow diagrams from output
          const executionFlowsJson = parseExecutionFlows(assistantText);

          // Publish execution_completed event with depth metadata for loop prevention
          try {
            const { personaEventBus } = require('./eventBus');
            const parentMeta = (input.inputData as Record<string, unknown> | undefined)?._event as
              | { _meta?: { depth?: number } } | undefined;
            const newDepth = ((parentMeta?._meta?.depth as number) ?? 0) + 1;
            personaEventBus.publish({
              event_type: 'execution_completed' as const,
              source_type: 'execution' as const,
              source_id: input.executionId,
              target_persona_id: input.persona.id,
              project_id: input.persona.project_id,
              payload: {
                status: code === 0 ? 'completed' : 'failed',
                duration_ms: durationMs,
                _meta: { depth: newDepth, source_persona_id: input.persona.id },
              },
            });
          } catch { /* event bus not critical */ }

          if (code === 0) {
            resolve({
              success: true,
              output: stdout || 'Execution completed',
              logFilePath,
              claudeSessionId,
              durationMs,
              executionFlows: executionFlowsJson || undefined,
              modelUsed: executionMetrics.model_used || undefined,
              inputTokens: executionMetrics.input_tokens,
              outputTokens: executionMetrics.output_tokens,
              costUsd: executionMetrics.cost_usd,
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
 * Record tool usage counts to the database for analytics.
 */
function recordToolUsage(toolCounts: Map<string, number>, executionId: string, personaId: string): void {
  try {
    for (const [toolName, count] of toolCounts) {
      personaToolUsageRepository.record(executionId, personaId, toolName, count);
    }
  } catch {
    // Don't let tool usage recording errors affect execution
  }
}

/**
 * Parse output for user_message JSON blocks and create message records + trigger delivery.
 * This is a post-mortem fallback for multi-line JSON that mid-stream detection missed.
 * Skips creation if messages already exist for this execution (created mid-stream).
 */
function parseUserMessages(output: string, executionId: string, personaId: string): void {
  if (!output) return;

  try {
    // Skip if mid-stream detection already created messages for this execution
    const existing = personaMessageRepository.getByExecution(executionId);
    if (existing.length > 0) return;

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

/**
 * Parse output for execution_flow JSON blocks and return validated flow data.
 * Post-mortem only (flow JSON is too large for reliable mid-stream detection).
 */
function parseExecutionFlows(output: string): string | null {
  if (!output) return null;

  try {
    // Find {"execution_flow": ...} blocks using bracket counting
    const marker = '"execution_flow"';
    const idx = output.indexOf(marker);
    if (idx === -1) return null;

    // Walk backwards to find opening brace
    let start = idx;
    while (start > 0 && output[start] !== '{') start--;
    if (output[start] !== '{') return null;

    // Bracket-counting to find matching close
    let depth = 0;
    let end = start;
    for (let i = start; i < output.length; i++) {
      if (output[i] === '{') depth++;
      else if (output[i] === '}') {
        depth--;
        if (depth === 0) { end = i + 1; break; }
      }
    }
    if (depth !== 0) return null;

    const jsonStr = output.slice(start, end);
    const parsed = JSON.parse(jsonStr);

    if (!parsed.execution_flow?.flows || !Array.isArray(parsed.execution_flow.flows)) return null;

    const valid = parsed.execution_flow.flows.filter((f: Record<string, unknown>) =>
      f.id && f.name && Array.isArray(f.nodes) && Array.isArray(f.edges) &&
      (f.nodes as unknown[]).length >= 2
    );

    return valid.length > 0 ? JSON.stringify(valid) : null;
  } catch {
    return null;
  }
}
