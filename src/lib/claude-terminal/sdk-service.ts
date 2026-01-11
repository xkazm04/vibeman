/**
 * Claude Terminal SDK Service
 * Wrapper around @anthropic-ai/claude-agent-sdk for server-side execution
 */

import { query, type Query } from '@anthropic-ai/claude-agent-sdk';
import type {
  SDKMessage,
  SDKAssistantMessage,
  SDKUserMessage,
  SDKResultMessage,
  SDKSystemMessage,
  SDKPartialAssistantMessage,
  Options,
  PermissionResult,
} from '@anthropic-ai/claude-agent-sdk';

// Tool input type - generic record since SDK doesn't export it directly
type ToolInput = Record<string, unknown>;
import { v4 as uuidv4 } from 'uuid';
import type {
  TerminalQueryOptions,
  PendingApproval,
  ApprovalDecision,
  SSEEvent,
  AnyTerminalMessage,
  ResultData,
  ErrorData,
  ConnectedData,
} from './types';

// Active queries map - stores running query instances
const activeQueries = new Map<string, ActiveQuery>();

interface ActiveQuery {
  query: Query;
  sessionId: string;
  abortController: AbortController;
  pendingApprovals: Map<string, PendingApprovalHandler>;
  status: 'running' | 'waiting_approval' | 'completed' | 'error';
}

interface PendingApprovalHandler {
  resolve: (result: PermissionResult) => void;
  approval: PendingApproval;
}

/**
 * Start a new Claude query
 */
export async function startQuery(
  sessionId: string,
  prompt: string,
  projectPath: string,
  options: TerminalQueryOptions = {},
  onEvent: (event: SSEEvent) => void
): Promise<void> {
  const abortController = new AbortController();

  // Build SDK options
  const sdkOptions: Options = {
    abortController,
    cwd: projectPath,
    includePartialMessages: true,
    permissionMode: options.permissionMode || 'default',
    allowedTools: options.allowedTools,
    disallowedTools: options.disallowedTools,
    maxTurns: options.maxTurns,
    model: options.model,
    // Load project settings including CLAUDE.md
    settingSources: ['project'],
    // Use Claude Code's system prompt with optional append
    systemPrompt: options.systemPromptAppend
      ? { type: 'preset', preset: 'claude_code', append: options.systemPromptAppend }
      : { type: 'preset', preset: 'claude_code' },
    // Use Claude Code's default tools
    tools: { type: 'preset', preset: 'claude_code' },
    // Custom permission handler for tool approval
    canUseTool: async (toolName: string, input: ToolInput, opts) => {
      return handleToolPermission(sessionId, toolName, input, opts);
    },
  };

  // Handle session resume
  if (options.sessionId && options.resume) {
    sdkOptions.resume = options.sessionId;
  }

  try {
    const q = query({ prompt, options: sdkOptions });

    // Store active query
    const activeQuery: ActiveQuery = {
      query: q,
      sessionId,
      abortController,
      pendingApprovals: new Map(),
      status: 'running',
    };
    activeQueries.set(sessionId, activeQuery);

    // Process messages
    for await (const message of q) {
      const event = convertSDKMessageToEvent(sessionId, message);
      if (event) {
        onEvent(event);
      }

      // Update status based on message type
      if (message.type === 'result') {
        activeQuery.status = 'completed';
      }
    }
  } catch (error) {
    const errorEvent: SSEEvent = {
      type: 'error',
      data: {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'QUERY_ERROR',
      } as ErrorData,
      timestamp: Date.now(),
    };
    onEvent(errorEvent);
  } finally {
    // Cleanup
    activeQueries.delete(sessionId);
  }
}

/**
 * Handle tool permission requests
 */
async function handleToolPermission(
  sessionId: string,
  toolName: string,
  input: ToolInput,
  opts: { signal: AbortSignal }
): Promise<PermissionResult> {
  const activeQuery = activeQueries.get(sessionId);
  if (!activeQuery) {
    return { behavior: 'deny', message: 'Session not found' };
  }

  // For certain safe tools, auto-approve
  const safeTools = ['Read', 'Glob', 'Grep', 'WebSearch', 'WebFetch'];
  if (safeTools.includes(toolName)) {
    return { behavior: 'allow', updatedInput: input };
  }

  // Create pending approval
  const approvalId = uuidv4();
  const approval: PendingApproval = {
    id: approvalId,
    sessionId,
    toolUseId: approvalId, // Will be updated
    toolName,
    toolInput: input as Record<string, unknown>,
    createdAt: Date.now(),
    status: 'pending',
  };

  // Update query status
  activeQuery.status = 'waiting_approval';

  // Create promise that will be resolved when user approves/denies
  return new Promise<PermissionResult>((resolve) => {
    const handler: PendingApprovalHandler = {
      resolve,
      approval,
    };
    activeQuery.pendingApprovals.set(approvalId, handler);

    // Handle abort
    opts.signal.addEventListener('abort', () => {
      activeQuery.pendingApprovals.delete(approvalId);
      resolve({ behavior: 'deny', message: 'Request aborted' });
    });
  });
}

/**
 * Process a tool approval decision
 */
export function processApproval(
  sessionId: string,
  approvalId: string,
  decision: ApprovalDecision,
  reason?: string
): boolean {
  const activeQuery = activeQueries.get(sessionId);
  if (!activeQuery) {
    return false;
  }

  const handler = activeQuery.pendingApprovals.get(approvalId);
  if (!handler) {
    return false;
  }

  // Resolve the permission promise
  if (decision === 'approve') {
    handler.resolve({
      behavior: 'allow',
      updatedInput: handler.approval.toolInput as ToolInput,
    });
  } else {
    handler.resolve({
      behavior: 'deny',
      message: reason || 'User denied the tool use',
    });
  }

  // Update approval status
  handler.approval.status = decision === 'approve' ? 'approved' : 'denied';
  handler.approval.decision = decision;
  handler.approval.decisionReason = reason;
  handler.approval.decidedAt = Date.now();

  // Remove from pending
  activeQuery.pendingApprovals.delete(approvalId);

  // Update query status
  if (activeQuery.pendingApprovals.size === 0) {
    activeQuery.status = 'running';
  }

  return true;
}

/**
 * Get pending approvals for a session
 */
export function getPendingApprovals(sessionId: string): PendingApproval[] {
  const activeQuery = activeQueries.get(sessionId);
  if (!activeQuery) {
    return [];
  }

  return Array.from(activeQuery.pendingApprovals.values()).map((h) => h.approval);
}

/**
 * Abort a running query
 */
export function abortQuery(sessionId: string): boolean {
  const activeQuery = activeQueries.get(sessionId);
  if (!activeQuery) {
    return false;
  }

  activeQuery.abortController.abort();
  activeQueries.delete(sessionId);
  return true;
}

/**
 * Check if a session has an active query
 */
export function hasActiveQuery(sessionId: string): boolean {
  return activeQueries.has(sessionId);
}

/**
 * Get active query status
 */
export function getQueryStatus(sessionId: string): ActiveQuery['status'] | null {
  const activeQuery = activeQueries.get(sessionId);
  return activeQuery?.status || null;
}

/**
 * Convert SDK message to SSE event
 */
function convertSDKMessageToEvent(sessionId: string, message: SDKMessage): SSEEvent | null {
  const timestamp = Date.now();

  switch (message.type) {
    case 'system': {
      const sysMsg = message as SDKSystemMessage;
      if (sysMsg.subtype === 'init') {
        return {
          type: 'connected',
          data: {
            sessionId,
            model: sysMsg.model,
            tools: sysMsg.tools,
            permissionMode: sysMsg.permissionMode,
          } as ConnectedData,
          timestamp,
        };
      }
      return null;
    }

    case 'assistant': {
      const asstMsg = message as SDKAssistantMessage;
      const content = extractAssistantContent(asstMsg);
      const toolUses = extractToolUses(asstMsg);

      // If there are tool uses, emit them separately
      if (toolUses.length > 0) {
        // Return the first tool use; ideally we'd emit multiple events
        const tool = toolUses[0];
        return {
          type: 'tool_use',
          data: {
            id: tool.id,
            type: 'tool_use',
            content: `Using tool: ${tool.name}`,
            timestamp,
            sessionId,
            toolName: tool.name,
            toolInput: tool.input,
            toolUseId: tool.id,
          } as AnyTerminalMessage,
          timestamp,
        };
      }

      return {
        type: 'message',
        data: {
          id: asstMsg.uuid,
          type: 'assistant',
          content,
          timestamp,
          sessionId,
          isStreaming: false,
          parentToolUseId: asstMsg.parent_tool_use_id,
        } as AnyTerminalMessage,
        timestamp,
      };
    }

    case 'stream_event': {
      const streamMsg = message as SDKPartialAssistantMessage;
      const content = extractStreamContent(streamMsg);
      if (!content) return null;

      return {
        type: 'streaming',
        data: {
          id: streamMsg.uuid,
          type: 'streaming',
          content,
          timestamp,
          sessionId,
          parentMessageId: streamMsg.uuid,
        } as AnyTerminalMessage,
        timestamp,
      };
    }

    case 'result': {
      const resultMsg = message as SDKResultMessage;
      return {
        type: 'result',
        data: {
          sessionId,
          result: resultMsg.subtype === 'success' ? resultMsg.result : '',
          isError: resultMsg.is_error,
          numTurns: resultMsg.num_turns,
          durationMs: resultMsg.duration_ms,
          usage: {
            inputTokens: resultMsg.usage.input_tokens,
            outputTokens: resultMsg.usage.output_tokens,
            cacheReadTokens: resultMsg.usage.cache_read_input_tokens || 0,
            cacheCreationTokens: resultMsg.usage.cache_creation_input_tokens || 0,
          },
          totalCostUsd: resultMsg.total_cost_usd,
        } as ResultData,
        timestamp,
      };
    }

    default:
      return null;
  }
}

/**
 * Extract text content from assistant message
 */
function extractAssistantContent(message: SDKAssistantMessage): string {
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
 * Extract tool uses from assistant message
 */
function extractToolUses(
  message: SDKAssistantMessage
): Array<{ id: string; name: string; input: Record<string, unknown> }> {
  const content = message.message.content;
  if (!Array.isArray(content)) {
    return [];
  }

  return content
    .filter((block) => block.type === 'tool_use')
    .map((block) => {
      const toolBlock = block as { type: 'tool_use'; id: string; name: string; input: unknown };
      return {
        id: toolBlock.id,
        name: toolBlock.name,
        input: toolBlock.input as Record<string, unknown>,
      };
    });
}

/**
 * Extract content from streaming event
 */
function extractStreamContent(message: SDKPartialAssistantMessage): string | null {
  const event = message.event;
  if (event.type === 'content_block_delta') {
    const delta = event.delta;
    if (delta.type === 'text_delta') {
      return delta.text;
    }
  }
  return null;
}
