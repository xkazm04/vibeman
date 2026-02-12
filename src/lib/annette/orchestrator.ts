/**
 * Annette Orchestrator
 * Core conversation engine using claude-haiku-4-5 with native tool_use
 *
 * Flow: user message → brain context injection → Claude API → tool dispatch → response
 */

import { getToolDefinitions, executeTool, ToolResult } from './toolRegistry';
import { buildSystemPrompt } from './systemPrompt';
import { formatBrainForPrompt } from './brainInjector';
import { logger } from '@/lib/logger';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOOL_ROUNDS = 10;
const MAX_TOKENS = 4096;

// Anthropic API types
interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string | AnthropicContentBlock[];
}

interface AnthropicContentBlock {
  type: 'text' | 'tool_use' | 'tool_result';
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: string;
  is_error?: boolean;
}

interface AnthropicResponse {
  id: string;
  type: string;
  role: string;
  content: AnthropicContentBlock[];
  model: string;
  stop_reason: 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence';
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: Array<{ name: string; input: Record<string, unknown>; result: string }>;
}

export interface OrchestratorInput {
  message: string;
  projectId: string;
  projectPath?: string;
  conversationHistory?: ConversationMessage[];
  sessionSummary?: string;
  relevantTopics?: string;
  userPreferences?: string;
  audioMode?: boolean;
}

export interface QuickOption {
  label: string;
  message: string;
}

export interface OrchestratorOutput {
  response: string;
  quickOptions: QuickOption[];
  toolsUsed: Array<{ name: string; input: Record<string, unknown>; result: string }>;
  tokensUsed: { input: number; output: number; total: number };
  model: string;
}

/**
 * Parse <quick_options> JSON from response text, returning cleaned text and options
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
        options: parsed.filter((o: any) => o.label && o.message).slice(0, 4),
      };
    }
  } catch {
    // JSON parse failed, ignore
  }
  return { cleanText, options: [] };
}

/**
 * Summarize conversation history when it exceeds the message threshold.
 * Keeps the first 2 and last 4 messages, replacing the middle with a summary.
 */
const HISTORY_SUMMARIZE_THRESHOLD = 10;

function summarizeHistory(history: ConversationMessage[]): ConversationMessage[] {
  if (history.length <= HISTORY_SUMMARIZE_THRESHOLD) {
    return history;
  }

  const kept = history.slice(0, 2);
  const middle = history.slice(2, -4);
  const recent = history.slice(-4);

  // Build a condensed summary of the middle messages
  const topics = middle
    .filter(m => m.role === 'user')
    .map(m => m.content.slice(0, 80))
    .join('; ');

  const toolNames = middle
    .filter(m => m.toolCalls && m.toolCalls.length > 0)
    .flatMap(m => m.toolCalls!.map(t => t.name));
  const uniqueTools = [...new Set(toolNames)];

  const summaryContent = `[Earlier conversation summary: User discussed ${middle.length} messages covering: ${topics || 'various topics'}. Tools used: ${uniqueTools.join(', ') || 'none'}]`;

  kept.push({
    role: 'user',
    content: summaryContent,
  });
  kept.push({
    role: 'assistant',
    content: 'Understood, I have context from our earlier conversation. How can I help?',
  });

  return [...kept, ...recent];
}

/**
 * Run the Annette orchestration loop
 * Sends message to Claude with tools, executes any tool calls, loops until text response
 */
export async function orchestrate(input: OrchestratorInput): Promise<OrchestratorOutput> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is required for Annette');
  }

  // Build system prompt with brain context
  const brainContext = formatBrainForPrompt(input.projectId);
  const systemPrompt = buildSystemPrompt({
    brainContext,
    sessionSummary: input.sessionSummary,
    relevantTopics: input.relevantTopics,
    userPreferences: input.userPreferences,
    audioMode: input.audioMode,
  });

  // Build conversation messages for the API (with summarization for long histories)
  const condensedHistory = input.conversationHistory
    ? summarizeHistory(input.conversationHistory)
    : undefined;
  const messages = buildApiMessages(input.message, condensedHistory);

  // Get tool definitions
  const tools = getToolDefinitions();

  // Orchestration loop
  let totalInput = 0;
  let totalOutput = 0;
  const toolsUsed: OrchestratorOutput['toolsUsed'] = [];
  let currentMessages = [...messages];
  let rounds = 0;

  while (rounds < MAX_TOOL_ROUNDS) {
    rounds++;

    // Call Claude API
    const apiResponse = await callClaude(apiKey, systemPrompt, currentMessages, tools);
    totalInput += apiResponse.usage.input_tokens;
    totalOutput += apiResponse.usage.output_tokens;

    // Check if we got a final text response (no more tool calls)
    if (apiResponse.stop_reason === 'end_turn' || apiResponse.stop_reason === 'max_tokens') {
      const textContent = apiResponse.content
        .filter(b => b.type === 'text')
        .map(b => b.text)
        .join('');

      const { cleanText, options } = parseQuickOptions(
        textContent || 'I processed your request but have no additional response.'
      );

      return {
        response: cleanText,
        quickOptions: options,
        toolsUsed,
        tokensUsed: { input: totalInput, output: totalOutput, total: totalInput + totalOutput },
        model: apiResponse.model,
      };
    }

    // Handle tool_use stop reason - execute tool calls
    if (apiResponse.stop_reason === 'tool_use') {
      const toolUseBlocks = apiResponse.content.filter(b => b.type === 'tool_use');

      if (toolUseBlocks.length === 0) {
        // Shouldn't happen, but handle gracefully
        const textContent = apiResponse.content
          .filter(b => b.type === 'text')
          .map(b => b.text)
          .join('');
        const { cleanText, options } = parseQuickOptions(textContent || 'Processing complete.');
        return {
          response: cleanText,
          quickOptions: options,
          toolsUsed,
          tokensUsed: { input: totalInput, output: totalOutput, total: totalInput + totalOutput },
          model: apiResponse.model,
        };
      }

      // Execute each tool call
      const toolResults: ToolResult[] = [];
      for (const block of toolUseBlocks) {
        if (block.id && block.name && block.input) {
          logger.info('Annette executing tool', { tool: block.name, input: block.input });

          const result = await executeTool(
            { id: block.id, name: block.name, input: block.input },
            input.projectId,
            input.projectPath
          );
          toolResults.push(result);

          // Publish Annette tool action to persona event bus
          try {
            const actionTools = new Set([
              'accept_idea', 'reject_idea', 'generate_ideas',
              'accept_direction', 'reject_direction', 'generate_directions',
              'execute_now', 'execute_requirement',
            ]);
            if (actionTools.has(block.name)) {
              const { personaEventBus } = require('@/lib/personas/eventBus');
              if (personaEventBus && typeof personaEventBus.publish === 'function') {
                personaEventBus.publish({
                  event_type: 'custom' as const,
                  source_type: 'system' as const,
                  source_id: `annette_${block.id}`,
                  target_persona_id: undefined,
                  project_id: input.projectId,
                  payload: {
                    type: 'voice_command_executed',
                    tool_name: block.name,
                    tool_input: block.input,
                    success: !result.is_error,
                    timestamp: new Date().toISOString(),
                  },
                });
              }
            }
          } catch {
            // Event bus publishing must never break Annette
          }

          toolsUsed.push({
            name: block.name,
            input: block.input,
            result: result.content,
          });
        }
      }

      // Add assistant message (with tool_use blocks) and tool results to conversation
      currentMessages.push({
        role: 'assistant',
        content: apiResponse.content,
      });

      currentMessages.push({
        role: 'user',
        content: toolResults.map(r => ({
          type: 'tool_result' as const,
          tool_use_id: r.tool_use_id,
          content: r.content,
          is_error: r.is_error,
        })),
      });
    }
  }

  // If we exceeded max rounds, return what we have
  logger.warn('Annette orchestration exceeded max tool rounds', { rounds: MAX_TOOL_ROUNDS });
  return {
    response: 'I executed multiple actions but reached the processing limit. Here is what I accomplished so far.',
    quickOptions: [],
    toolsUsed,
    tokensUsed: { input: totalInput, output: totalOutput, total: totalInput + totalOutput },
    model: MODEL,
  };
}

/**
 * Build API messages from conversation history + new user message
 */
function buildApiMessages(
  newMessage: string,
  history?: ConversationMessage[]
): AnthropicMessage[] {
  const messages: AnthropicMessage[] = [];

  // Add conversation history
  if (history && history.length > 0) {
    for (const msg of history) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }
  }

  // Add new user message
  messages.push({
    role: 'user',
    content: newMessage,
  });

  return messages;
}

/**
 * Call the Anthropic Messages API with tool_use support
 */
async function callClaude(
  apiKey: string,
  systemPrompt: string,
  messages: AnthropicMessage[],
  tools: ReturnType<typeof getToolDefinitions>
): Promise<AnthropicResponse> {
  const requestBody = {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages,
    tools,
  };

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    let errorMessage = `Anthropic API error (${response.status})`;

    try {
      const errorData = JSON.parse(errorText);
      if (errorData.error?.message) {
        errorMessage = errorData.error.message;
      }
    } catch {
      errorMessage += `: ${errorText.substring(0, 200)}`;
    }

    throw new Error(errorMessage);
  }

  return await response.json();
}

/**
 * Extract key topics from a completed conversation for future context injection.
 * Returns topic strings that can be stored in the memory system.
 */
export function extractConversationTopics(
  messages: ConversationMessage[],
  toolsUsed: OrchestratorOutput['toolsUsed']
): string[] {
  const topics: Set<string> = new Set();

  // Extract topics from user messages (first 50 chars of each)
  for (const msg of messages) {
    if (msg.role === 'user') {
      const firstSentence = msg.content.split(/[.!?\n]/)[0]?.trim();
      if (firstSentence && firstSentence.length > 10) {
        topics.add(firstSentence.slice(0, 80));
      }
    }
  }

  // Extract tool usage patterns
  const toolNames = [...new Set(toolsUsed.map(t => t.name))];
  if (toolNames.length > 0) {
    topics.add(`Tools: ${toolNames.join(', ')}`);
  }

  // Extract direction/context references from tool results
  for (const tool of toolsUsed) {
    if (tool.name === 'get_directions' || tool.name === 'get_insights') {
      try {
        const parsed = JSON.parse(tool.result);
        if (parsed.directions?.length > 0) {
          topics.add(`Reviewed ${parsed.directions.length} directions`);
        }
        if (parsed.insights?.length > 0) {
          topics.add(`Discussed ${parsed.insights.length} insights`);
        }
      } catch { /* ignore parse errors */ }
    }
  }

  return [...topics].slice(0, 10);
}
