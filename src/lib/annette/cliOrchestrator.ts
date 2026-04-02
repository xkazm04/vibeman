/**
 * Annette CLI Orchestrator
 * Conversation engine using Claude CLI subprocess (`claude -p`) which uses
 * the user's subscription/Max plan — no API credits consumed.
 *
 * Uses startExecution() from cli-service.ts to spawn `claude -p` with
 * --output-format stream-json. Collects text and tool_use events from
 * the stream, supports session resumption via --resume for multi-turn chat.
 *
 * Flow: user message -> memory recall -> brain context injection -> CLI subprocess -> collect responses -> return
 */

import {
  startExecution,
  getExecution,
  extractTextContent,
  extractToolUses,
  type CLIExecutionEvent,
  type CLIExecution,
} from '@/lib/claude-terminal/cli-service';

import { buildSystemPrompt } from './systemPrompt';
import { formatBrainForPrompt } from './brainInjector';
import { buildRapportPromptContext } from './rapportEngine';
import { contextualRecaller } from '@/app/features/Annette/lib/contextualRecaller';
import { logger } from '@/lib/logger';

import type {
  OrchestratorInput,
  OrchestratorOutput,
  QuickOption,
  ConversationMessage,
} from './orchestrator';

// Defaults
const DEFAULT_TIMEOUT_MS = 50 * 60 * 1000; // 50 minutes — CLI sessions can be long
const POLL_INTERVAL_MS = 200;

export interface CLIOrchestratorOptions {
  /** Model alias: 'sonnet', 'opus' — passed to claude CLI --model */
  model?: string;
  /** Timeout in ms (default 5 min) */
  timeoutMs?: number;
  /** Resume a previous CLI session by ID for multi-turn conversation */
  resumeSessionId?: string;
}

/**
 * Active Annette session IDs per project, enabling multi-turn conversation
 * via --resume. Persisted in memory across requests.
 */
const projectSessions = new Map<string, string>();

/**
 * Get the stored CLI session ID for a project (for conversation resumption).
 */
export function getProjectSessionId(projectId: string): string | undefined {
  return projectSessions.get(projectId);
}

/**
 * Clear the stored CLI session for a project (e.g., on "clear chat").
 */
export function clearProjectSession(projectId: string): void {
  projectSessions.delete(projectId);
}

/**
 * Parse <quick_options> JSON from response text, returning cleaned text and options.
 */
function parseQuickOptions(text: string): { cleanText: string; options: QuickOption[] } {
  const match = text.match(/<quick_options>\s*([\s\S]*?)\s*<\/quick_options>/);
  if (!match) {
    return { cleanText: text.trim(), options: [] };
  }

  const cleanText = text.replace(/<quick_options>[\s\S]*?<\/quick_options>/, '').trim();
  try {
    const parsed = JSON.parse(match[1]);
    if (Array.isArray(parsed)) {
      return {
        cleanText,
        options: parsed
          .filter((o: Record<string, unknown>) => o.label && o.message)
          .slice(0, 4) as QuickOption[],
      };
    }
  } catch {
    // JSON parse failed, ignore
  }
  return { cleanText, options: [] };
}

/**
 * Recall semantically relevant memories for the current conversation.
 */
async function recallConversationMemories(
  projectId: string,
  currentMessage: string,
  recentHistory: ConversationMessage[],
): Promise<string> {
  try {
    const recalled = await contextualRecaller.recall({
      projectId,
      currentMessage,
      recentMessages: recentHistory.slice(-5).map((m) => ({
        role: m.role,
        content: m.content,
      })),
      maxMemories: 5,
      maxNodes: 3,
      minRelevanceScore: 0.3,
    });

    return contextualRecaller.formatForPrompt(recalled);
  } catch (err) {
    logger.warn('CLI orchestrator: failed to recall conversation memories', { err });
    return '';
  }
}

/**
 * Build the full prompt for the CLI subprocess.
 * Includes brain context, recalled memories, conversation history,
 * and system instructions prepended to the user's message.
 */
function buildCLIPrompt(
  userMessage: string,
  brainContext: string,
  recalledContext: string,
  systemInstructions: string,
  sessionSummary?: string,
  conversationHistory?: ConversationMessage[],
  isResume?: boolean,
): string {
  const parts: string[] = [];

  // Only include full context on first message (non-resume).
  // On resume, the CLI session already has context from prior turns.
  if (!isResume) {
    parts.push(`<system_instructions>\n${systemInstructions}\n</system_instructions>`);

    if (brainContext && brainContext !== 'No brain data available yet. The system will learn from your decisions over time.') {
      parts.push(`<brain_context>\n${brainContext}\n</brain_context>`);
    }
  }

  if (recalledContext) {
    parts.push(`<recalled_memories>\n${recalledContext}\n</recalled_memories>`);
  }

  if (sessionSummary) {
    parts.push(`<session_summary>\n${sessionSummary}\n</session_summary>`);
  }

  // Include brief conversation summary only on first message
  if (!isResume && conversationHistory && conversationHistory.length > 0) {
    const recentExchanges = conversationHistory.slice(-6);
    const summaryLines = recentExchanges.map(
      (m) =>
        `${m.role === 'user' ? 'User' : 'Annette'}: ${m.content.slice(0, 200)}${m.content.length > 200 ? '...' : ''}`,
    );
    parts.push(`<recent_conversation>\n${summaryLines.join('\n')}\n</recent_conversation>`);
  }

  parts.push(userMessage);

  return parts.join('\n\n');
}

/**
 * Run Annette orchestration via the Claude CLI subprocess.
 * Uses the user's subscription — no API credits consumed.
 */
export async function orchestrateCLI(
  input: OrchestratorInput,
  cliOptions?: CLIOrchestratorOptions,
): Promise<OrchestratorOutput> {
  const timeoutMs = cliOptions?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const model = cliOptions?.model;

  // Look up existing session for conversation resumption
  const resumeSessionId = cliOptions?.resumeSessionId || projectSessions.get(input.projectId);
  const isResume = !!resumeSessionId;

  // Recall semantically relevant memories
  const recalledContext = await recallConversationMemories(
    input.projectId,
    input.message,
    input.conversationHistory || [],
  );

  // Build system prompt components
  const brainContext = formatBrainForPrompt(input.projectId);
  const rapportContext = buildRapportPromptContext(input.projectId);
  const systemInstructions = buildSystemPrompt({
    brainContext,
    rapportContext,
    sessionSummary: input.sessionSummary,
    relevantTopics: input.relevantTopics,
    userPreferences: input.userPreferences,
    audioMode: input.audioMode,
    cliMode: true,
  });

  // Build the full prompt for the CLI
  const fullPrompt = buildCLIPrompt(
    input.message,
    brainContext,
    recalledContext,
    systemInstructions,
    input.sessionSummary,
    input.conversationHistory,
    isResume,
  );

  // Collect results from stream events
  const collectedText: string[] = [];
  const toolsUsed: OrchestratorOutput['toolsUsed'] = [];
  let usageInput = 0;
  let usageOutput = 0;
  let resultModel = 'claude-cli';
  let capturedSessionId: string | undefined;

  const onEvent = (event: CLIExecutionEvent) => {
    switch (event.type) {
      case 'init': {
        const data = event.data as Record<string, unknown>;
        if (data.sessionId) {
          capturedSessionId = data.sessionId as string;
        }
        if (data.model) {
          resultModel = data.model as string;
        }
        break;
      }
      case 'text': {
        // cli-service emits { content: string, model: string }
        const content = (event.data as Record<string, unknown>).content as string;
        if (content) {
          collectedText.push(content);
        }
        break;
      }
      case 'tool_use': {
        // cli-service emits { id, name, input }
        const data = event.data as Record<string, unknown>;
        toolsUsed.push({
          name: (data.name as string) || 'unknown',
          input: (data.input as Record<string, unknown>) || {},
          result: '',
        });
        break;
      }
      case 'result': {
        const data = event.data as Record<string, unknown>;
        const usage = data.usage as { input_tokens?: number; output_tokens?: number } | undefined;
        if (usage) {
          usageInput = usage.input_tokens || 0;
          usageOutput = usage.output_tokens || 0;
        }
        if (data.sessionId) {
          capturedSessionId = data.sessionId as string;
        }
        break;
      }
    }
  };

  const projectPath = input.projectPath || process.cwd();

  try {
    logger.info('CLI orchestrator: starting subprocess', {
      projectId: input.projectId,
      model: model || 'default',
      resumeSession: isResume,
      promptLength: fullPrompt.length,
    });

    // Start the CLI execution — this spawns `claude -p` as a subprocess
    const executionId = startExecution(
      projectPath,
      fullPrompt,
      resumeSessionId,
      onEvent,
      {
        provider: 'claude',
        model: model as 'sonnet' | 'opus' | undefined,
      },
    );

    // Wait for the execution to complete
    await waitForExecutionComplete(executionId, timeoutMs);

    // Store session ID for conversation resumption
    if (capturedSessionId) {
      projectSessions.set(input.projectId, capturedSessionId);
    }
  } catch (error) {
    logger.error('CLI orchestrator: subprocess failed', { error });
    throw error;
  }

  // Assemble final response text
  const rawResponse =
    collectedText.join('\n').trim() ||
    'I processed your request but have no additional response.';
  const { cleanText, options: quickOptions } = parseQuickOptions(rawResponse);

  logger.info('CLI orchestrator: complete', {
    projectId: input.projectId,
    toolsUsed: toolsUsed.length,
    tokensUsed: usageInput + usageOutput,
    model: resultModel,
    sessionId: capturedSessionId,
  });

  return {
    response: cleanText,
    quickOptions,
    toolsUsed,
    tokensUsed: {
      input: usageInput,
      output: usageOutput,
      total: usageInput + usageOutput,
    },
    model: resultModel,
  };
}

/**
 * Wait for a CLI execution to complete by polling its status.
 */
function waitForExecutionComplete(executionId: string, timeoutMs: number): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const startTime = Date.now();

    const poll = () => {
      const execution = getExecution(executionId);

      if (!execution) {
        reject(new Error(`Execution ${executionId} not found`));
        return;
      }

      if (execution.status !== 'running') {
        if (execution.status === 'error' || execution.status === 'aborted') {
          // Still resolve — we may have partial text collected via onEvent
          resolve();
        } else {
          resolve();
        }
        return;
      }

      if (Date.now() - startTime > timeoutMs) {
        reject(new Error(`CLI execution timed out after ${Math.round(timeoutMs / 1000)}s`));
        return;
      }

      setTimeout(poll, POLL_INTERVAL_MS);
    };

    poll();
  });
}
