/**
 * Copilot SDK Client Wrapper
 *
 * Server-side wrapper around @github/copilot-sdk that manages execution
 * lifecycle, event tracking, and SSE coordination.
 *
 * Features:
 * - Session resume: reuse existing Copilot sessions across tasks for context continuity
 * - Auth pre-check: validates GitHub auth before starting execution
 * - Global persistence: survives Next.js HMR reloads in dev mode
 */

import { CopilotClient, approveAll, type SessionEvent } from '@github/copilot-sdk';
import { EventEmitter } from 'events';
import { join } from 'path';
import { existsSync } from 'fs';

// ─── Execution Types ─────────────────────────────────────────────────

export interface CopilotExecutionEvent {
  type: 'init' | 'text' | 'tool_use' | 'tool_result' | 'result' | 'error';
  data: Record<string, unknown>;
  timestamp: number;
}

export interface CopilotExecution {
  id: string;
  projectPath: string;
  prompt: string;
  model: string;
  status: 'running' | 'completed' | 'error' | 'aborted';
  startTime: number;
  endTime?: number;
  events: CopilotExecutionEvent[];
  sessionId?: string;
  /** Whether this execution resumed a previous session */
  resumed?: boolean;
  /** Internal: for abort support */
  _session?: { abort: () => Promise<void>; destroy: () => Promise<void>; setModel: (model: string) => Promise<void> };
  _client?: CopilotClient;
}

// ─── Global Persistence (survives Next.js HMR) ──────────────────────

const globalForCopilot = globalThis as unknown as {
  copilotActiveExecutions: Map<string, CopilotExecution> | undefined;
  copilotExecutionBus: EventEmitter | undefined;
  /** Persist session IDs per project path for resume across executions */
  copilotSessionCache: Map<string, string> | undefined;
};

const activeExecutions = globalForCopilot.copilotActiveExecutions ?? new Map<string, CopilotExecution>();
const executionBus = globalForCopilot.copilotExecutionBus ?? new EventEmitter();
const sessionCache = globalForCopilot.copilotSessionCache ?? new Map<string, string>();
executionBus.setMaxListeners(50);

if (!globalForCopilot.copilotActiveExecutions) {
  globalForCopilot.copilotActiveExecutions = activeExecutions;
}
if (!globalForCopilot.copilotExecutionBus) {
  globalForCopilot.copilotExecutionBus = executionBus;
}
if (!globalForCopilot.copilotSessionCache) {
  globalForCopilot.copilotSessionCache = sessionCache;
}

// ─── Public API ──────────────────────────────────────────────────────

export interface StartExecutionOptions {
  projectPath: string;
  prompt: string;
  model?: string;
  apiKey?: string;
  /** Resume a specific session by ID (takes priority over auto-resume) */
  resumeSessionId?: string;
}

/**
 * Start a new Copilot SDK execution.
 * Returns the execution ID immediately; the session runs asynchronously.
 *
 * If `resumeSessionId` is provided, the execution will resume that session
 * preserving conversation history. Otherwise, a new session is created
 * (and its ID is cached for future resume by project path).
 */
export function startCopilotExecution(
  projectPath: string,
  prompt: string,
  model?: string,
  apiKey?: string,
  resumeSessionId?: string
): string {
  const executionId = `copilot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const execution: CopilotExecution = {
    id: executionId,
    projectPath,
    prompt,
    model: model || 'gpt-5.4',
    status: 'running',
    startTime: Date.now(),
    events: [],
    resumed: !!resumeSessionId,
  };

  activeExecutions.set(executionId, execution);
  executionBus.emit('registered', executionId);
  console.log(`[Copilot SDK] Registered execution: ${executionId}${resumeSessionId ? ` (resuming ${resumeSessionId})` : ''}. Total active: ${activeExecutions.size}`);

  // Kick off async execution (don't await)
  runCopilotSession(execution, apiKey, resumeSessionId).catch((err) => {
    console.error(`[Copilot SDK] Execution ${executionId} failed:`, err);
    if (execution.status === 'running') {
      execution.status = 'error';
      execution.endTime = Date.now();
      execution.events.push({
        type: 'error',
        data: { message: err instanceof Error ? err.message : 'Unknown error' },
        timestamp: Date.now(),
      });
    }
  });

  return executionId;
}

/**
 * Get an active execution by ID.
 */
export function getCopilotExecution(id: string): CopilotExecution | undefined {
  return activeExecutions.get(id);
}

/**
 * Wait for an execution to be registered (handles SSE connect race).
 */
export function waitForCopilotExecution(id: string, timeoutMs = 5000): Promise<CopilotExecution> {
  const existing = activeExecutions.get(id);
  if (existing) return Promise.resolve(existing);

  return new Promise<CopilotExecution>((resolve, reject) => {
    const timeout = setTimeout(() => {
      executionBus.removeListener('registered', handler);
      reject(new Error(`Execution ${id} not found within ${timeoutMs}ms`));
    }, timeoutMs);

    const handler = (registeredId: string) => {
      if (registeredId === id) {
        clearTimeout(timeout);
        executionBus.removeListener('registered', handler);
        const exec = activeExecutions.get(id);
        if (exec) resolve(exec);
        else reject(new Error(`Execution ${id} disappeared after registration`));
      }
    };

    executionBus.on('registered', handler);
  });
}

/**
 * Abort a running execution.
 */
export async function abortCopilotExecution(id: string): Promise<boolean> {
  const execution = activeExecutions.get(id);
  if (!execution || execution.status !== 'running') return false;

  try {
    if (execution._session) {
      await execution._session.abort();
    }
    execution.status = 'aborted';
    execution.endTime = Date.now();
    execution.events.push({
      type: 'error',
      data: { message: 'Execution aborted by user' },
      timestamp: Date.now(),
    });

    // Cleanup client
    if (execution._client) {
      await execution._client.stop().catch(() => {});
    }

    return true;
  } catch (err) {
    console.error(`[Copilot SDK] Abort failed for ${id}:`, err);
    return false;
  }
}

/**
 * Get cached session ID for a project path (for resume support).
 */
export function getCachedSessionId(projectPath: string): string | undefined {
  return sessionCache.get(projectPath);
}

/**
 * Check if GitHub Copilot auth is valid.
 * Returns null if auth is OK, or an error message if not.
 */
export async function checkCopilotAuth(apiKey?: string): Promise<string | null> {
  let client: CopilotClient | undefined;
  try {
    const options: Record<string, unknown> = {};
    const cliPath = resolveCopilotCliPath();
    if (cliPath) options.cliPath = cliPath;
    if (apiKey) options.githubToken = apiKey;

    client = new CopilotClient(options);
    await client.start();
    const authStatus = await client.getAuthStatus();

    if (!authStatus.isAuthenticated) {
      return 'Not authenticated with GitHub Copilot. Run: gh auth login';
    }
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : 'Auth check failed';
  } finally {
    if (client) await client.stop().catch(() => {});
  }
}

// ─── Internal: CLI Path Resolution ───────────────────────────────────

/**
 * Resolve the bundled Copilot CLI path manually.
 *
 * The SDK internally uses `import.meta.resolve("@github/copilot/sdk")` to find
 * the CLI entry point, but Turbopack transforms `import.meta.resolve` into a
 * broken stub (`__TURBOPACK__import$2e$meta__.resolve`). By passing `cliPath`
 * explicitly we bypass that call entirely.
 *
 * Note: `require.resolve('@github/copilot/sdk')` also fails because the
 * @github/copilot package exports `./sdk` only for ESM import, not CJS require
 * (ERR_PACKAGE_PATH_NOT_EXPORTED). We use direct path construction instead.
 */
function resolveCopilotCliPath(): string | undefined {
  // Direct path: @github/copilot ships as a dependency of @github/copilot-sdk
  const cliPath = join(process.cwd(), 'node_modules', '@github', 'copilot', 'index.js');
  if (existsSync(cliPath)) return cliPath;

  // Let the SDK try its own resolution (may work if serverExternalPackages kicks in)
  return undefined;
}

// ─── Internal: Session Runner ────────────────────────────────────────

async function runCopilotSession(
  execution: CopilotExecution,
  apiKey?: string,
  resumeSessionId?: string
): Promise<void> {
  const clientOptions: Record<string, unknown> = {};

  // Resolve CLI path to avoid Turbopack import.meta.resolve breakage
  const cliPath = resolveCopilotCliPath();
  if (cliPath) {
    clientOptions.cliPath = cliPath;
  }

  // BYOK: if an API key is provided, pass it as a custom provider
  if (apiKey) {
    clientOptions.githubToken = apiKey;
  }

  const client = new CopilotClient(clientOptions);
  execution._client = client;

  try {
    let session;

    if (resumeSessionId) {
      // Resume existing session — preserves conversation history
      try {
        session = await client.resumeSession(resumeSessionId, {
          onPermissionRequest: approveAll,
          streaming: true,
        });
        console.log(`[Copilot SDK] Resumed session: ${resumeSessionId}`);
      } catch (resumeErr) {
        // If resume fails (session expired/deleted), fall back to new session
        console.warn(`[Copilot SDK] Resume failed for ${resumeSessionId}, creating new session:`, resumeErr);
        session = await client.createSession({
          model: execution.model,
          streaming: true,
          workingDirectory: execution.projectPath,
          onPermissionRequest: approveAll,
        });
      }
    } else {
      session = await client.createSession({
        model: execution.model,
        streaming: true,
        workingDirectory: execution.projectPath,
        onPermissionRequest: approveAll,
      });
    }

    execution._session = session;
    execution.sessionId = session.sessionId;

    // Cache session ID for future resume
    sessionCache.set(execution.projectPath, session.sessionId);

    // Emit init event
    execution.events.push({
      type: 'init',
      data: {
        sessionId: session.sessionId,
        model: execution.model,
        resumed: !!resumeSessionId,
      },
      timestamp: Date.now(),
    });

    // Subscribe to all session events and map to our event format
    session.on((event: SessionEvent) => {
      mapSessionEvent(execution, event);
    });

    // Send prompt and wait for completion
    await session.sendAndWait(
      { prompt: execution.prompt },
      600_000 // 10 minute timeout
    );

    // Mark completed if still running (not aborted)
    if (execution.status === 'running') {
      execution.status = 'completed';
      execution.endTime = Date.now();
      execution.events.push({
        type: 'result',
        data: {
          sessionId: execution.sessionId,
          isError: false,
          durationMs: Date.now() - execution.startTime,
        },
        timestamp: Date.now(),
      });
    }
  } catch (err) {
    if (execution.status === 'running') {
      execution.status = 'error';
      execution.endTime = Date.now();
      execution.events.push({
        type: 'error',
        data: { message: err instanceof Error ? err.message : 'Unknown error' },
        timestamp: Date.now(),
      });
    }
  } finally {
    // Cleanup: destroy session and stop client
    // Note: we DON'T clear sessionCache here so it can be resumed later
    try {
      if (execution._session) await execution._session.destroy();
    } catch { /* ignore */ }
    try {
      await client.stop();
    } catch { /* ignore */ }

    // Clear internal refs
    execution._session = undefined;
    execution._client = undefined;

    // Schedule cleanup from map after 5 minutes
    setTimeout(() => {
      activeExecutions.delete(execution.id);
    }, 5 * 60 * 1000);
  }
}

/**
 * Map Copilot SDK SessionEvent to our CopilotExecutionEvent format.
 */
function mapSessionEvent(execution: CopilotExecution, event: SessionEvent): void {
  const ts = Date.now();

  switch (event.type) {
    case 'assistant.message_delta':
      execution.events.push({
        type: 'text',
        data: { content: event.data.deltaContent },
        timestamp: ts,
      });
      break;

    case 'assistant.message':
      // Full message — emit as text (streaming deltas handle incremental)
      if (event.data.content) {
        execution.events.push({
          type: 'text',
          data: { content: event.data.content },
          timestamp: ts,
        });
      }
      break;

    case 'tool.execution_start':
      execution.events.push({
        type: 'tool_use',
        data: {
          id: event.data.toolCallId,
          name: event.data.toolName,
          input: event.data.arguments || {},
        },
        timestamp: ts,
      });
      break;

    case 'tool.execution_complete':
      execution.events.push({
        type: 'tool_result',
        data: {
          toolUseId: event.data.toolCallId,
          content: event.data.result?.content || (event.data.error?.message ?? ''),
          isError: !event.data.success,
        },
        timestamp: ts,
      });
      break;

    case 'session.error':
      execution.events.push({
        type: 'error',
        data: { message: event.data.message },
        timestamp: ts,
      });
      break;

    case 'assistant.usage':
      // Track usage but don't emit as separate event — included in result
      break;

    // Other events (session.idle, session.start, etc.) are internal — skip
    default:
      break;
  }
}
