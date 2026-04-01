/**
 * Annette CLI Orchestrator
 * Alternative conversation engine using Claude Agent SDK (query()) instead of direct Anthropic API calls.
 *
 * Uses @anthropic-ai/claude-agent-sdk to run deep, quality processing through Claude Code
 * with full codebase awareness and built-in tools.
 *
 * Flow: user message -> memory recall -> brain context injection -> SDK query() -> collect responses -> return
 */

import { query } from '@anthropic-ai/claude-agent-sdk';
import type {
  SDKMessage,
  SDKAssistantMessage,
  SDKResultMessage,
  SDKResultSuccess,
  SDKResultError,
  Options,
} from '@anthropic-ai/claude-agent-sdk';

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
const DEFAULT_MODEL = 'sonnet';
const DEFAULT_MAX_TURNS = 15;
const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export interface CLIOrchestratorOptions {
  /** Model alias: 'sonnet', 'opus', 'haiku', or full model ID */
  model?: string;
  /** Max SDK turns (default 15) */
  maxTurns?: number;
  /** Timeout in ms (default 5 min) */
  timeoutMs?: number;
}

/**
 * Parse <quick_options> JSON from response text, returning cleaned text and options.
 * Duplicated from orchestrator.ts to keep CLI orchestrator self-contained.
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
 * Build the contextual preamble that gets prepended to the user message.
 * This gives the SDK session context about brain state, recalled memories,
 * and conversation history without requiring explicit system prompt injection.
 */
function buildContextualPreamble(
  brainContext: string,
  recalledContext: string,
  sessionSummary?: string,
  conversationHistory?: ConversationMessage[],
): string {
  const parts: string[] = [];

  if (brainContext && brainContext !== 'No brain data available yet. The system will learn from your decisions over time.') {
    parts.push(`[Brain Context]\n${brainContext}`);
  }

  if (recalledContext) {
    parts.push(`[Recalled Memories]\n${recalledContext}`);
  }

  if (sessionSummary) {
    parts.push(`[Session Summary]\n${sessionSummary}`);
  }

  // Include a brief conversation summary if there is history
  if (conversationHistory && conversationHistory.length > 0) {
    const recentExchanges = conversationHistory.slice(-6);
    const summaryLines = recentExchanges.map(
      (m) => `${m.role === 'user' ? 'User' : 'Annette'}: ${m.content.slice(0, 200)}${m.content.length > 200 ? '...' : ''}`,
    );
    parts.push(`[Recent Conversation]\n${summaryLines.join('\n')}`);
  }

  return parts.length > 0 ? parts.join('\n\n') + '\n\n---\n\n' : '';
}

/**
 * Extract text content from an SDK assistant message.
 */
function extractTextFromAssistantMessage(message: SDKAssistantMessage): string {
  const content = message.message.content;
  if (typeof content === 'string') {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .filter((block) => block.type === 'text')
      .map((block) => (block as { type: 'text'; text: string }).text)
      .join('\n');
  }
  return '';
}

/**
 * Extract tool uses from an SDK assistant message.
 */
function extractToolUsesFromAssistantMessage(
  message: SDKAssistantMessage,
): Array<{ name: string; input: Record<string, unknown> }> {
  const content = message.message.content;
  if (!Array.isArray(content)) {
    return [];
  }

  return content
    .filter((block) => block.type === 'tool_use')
    .map((block) => {
      const toolBlock = block as { type: 'tool_use'; id: string; name: string; input: unknown };
      return {
        name: toolBlock.name,
        input: toolBlock.input as Record<string, unknown>,
      };
    });
}

/**
 * Run Annette orchestration via the Claude Agent SDK.
 * This is the CLI-based alternative to the API-based orchestrate() function.
 */
export async function orchestrateCLI(
  input: OrchestratorInput,
  cliOptions?: CLIOrchestratorOptions,
): Promise<OrchestratorOutput> {
  const model = cliOptions?.model ?? DEFAULT_MODEL;
  const maxTurns = cliOptions?.maxTurns ?? DEFAULT_MAX_TURNS;
  const timeoutMs = cliOptions?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  // Recall semantically relevant memories
  const recalledContext = await recallConversationMemories(
    input.projectId,
    input.message,
    input.conversationHistory || [],
  );

  // Merge recalled memory context with caller-provided session summary
  const sessionSummary =
    [input.sessionSummary, recalledContext].filter(Boolean).join('\n\n') || undefined;

  // Build system prompt components
  const brainContext = formatBrainForPrompt(input.projectId);
  const rapportContext = buildRapportPromptContext(input.projectId);
  const systemPromptAppend = buildSystemPrompt({
    brainContext,
    rapportContext,
    sessionSummary,
    relevantTopics: input.relevantTopics,
    userPreferences: input.userPreferences,
    audioMode: input.audioMode,
    cliMode: true,
  });

  // Build the prompt: contextual preamble + user message
  const preamble = buildContextualPreamble(
    brainContext,
    recalledContext,
    input.sessionSummary,
    input.conversationHistory,
  );
  const fullPrompt = preamble + input.message;

  // Configure abort controller with timeout
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);

  // Build SDK options
  const sdkOptions: Options = {
    abortController,
    cwd: input.projectPath || process.cwd(),
    permissionMode: 'plan',
    model,
    maxTurns,
    persistSession: false,
    systemPrompt: {
      type: 'preset',
      preset: 'claude_code',
      append: systemPromptAppend,
    },
    tools: { type: 'preset', preset: 'claude_code' },
    // Auto-approve all tools since Annette is read-oriented in plan mode
    canUseTool: async () => ({ behavior: 'allow' as const }),
  };

  // Collect results from the SDK message stream
  const collectedText: string[] = [];
  const toolsUsed: OrchestratorOutput['toolsUsed'] = [];
  let usageInput = 0;
  let usageOutput = 0;
  let resultModel = `claude-sdk-${model}`;

  try {
    logger.info('CLI orchestrator: starting SDK query', {
      projectId: input.projectId,
      model,
      maxTurns,
      promptLength: fullPrompt.length,
    });

    const q = query({ prompt: fullPrompt, options: sdkOptions });

    for await (const message of q) {
      handleSDKMessage(message, collectedText, toolsUsed);

      // Capture result data
      if (message.type === 'result') {
        const resultMsg = message as SDKResultMessage;
        usageInput = resultMsg.usage.input_tokens;
        usageOutput = resultMsg.usage.output_tokens;

        if (resultMsg.subtype === 'success') {
          const successMsg = resultMsg as SDKResultSuccess;
          // If the result has text, add it
          if (successMsg.result && !collectedText.includes(successMsg.result)) {
            collectedText.push(successMsg.result);
          }
        } else {
          const errorMsg = resultMsg as SDKResultError;
          logger.warn('CLI orchestrator: SDK query ended with error', {
            subtype: errorMsg.subtype,
            errors: errorMsg.errors,
          });
        }
      }
    }
  } catch (error) {
    if (abortController.signal.aborted) {
      logger.warn('CLI orchestrator: SDK query timed out', { timeoutMs });
    } else {
      logger.error('CLI orchestrator: SDK query failed', { error });
      throw error;
    }
  } finally {
    clearTimeout(timeoutId);
  }

  // Assemble final response text
  const rawResponse = collectedText.join('\n').trim()
    || 'I processed your request but have no additional response.';
  const { cleanText, options: quickOptions } = parseQuickOptions(rawResponse);

  logger.info('CLI orchestrator: complete', {
    projectId: input.projectId,
    toolsUsed: toolsUsed.length,
    tokensUsed: usageInput + usageOutput,
    model: resultModel,
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
 * Process a single SDK message and collect relevant data.
 */
function handleSDKMessage(
  message: SDKMessage,
  collectedText: string[],
  toolsUsed: OrchestratorOutput['toolsUsed'],
): void {
  switch (message.type) {
    case 'assistant': {
      const asstMsg = message as SDKAssistantMessage;

      // Collect text content (skip sub-agent/tool-nested responses)
      if (!asstMsg.parent_tool_use_id) {
        const text = extractTextFromAssistantMessage(asstMsg);
        if (text) {
          collectedText.push(text);
        }
      }

      // Track tool uses
      const tools = extractToolUsesFromAssistantMessage(asstMsg);
      for (const tool of tools) {
        toolsUsed.push({
          name: tool.name,
          input: tool.input,
          result: '', // SDK handles tool execution internally; we just track the call
        });
      }
      break;
    }

    case 'user': {
      // User messages in SDK flow are typically tool_result returns.
      // We can capture tool result content if needed.
      // For now, skip -- the SDK manages the tool loop internally.
      break;
    }

    // stream_event, system, etc. -- skip for output collection
    default:
      break;
  }
}
