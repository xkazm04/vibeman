/**
 * Claude Terminal Types
 * Types for the CLI-like UI component using Claude Agent SDK
 */

// Session status
export type SessionStatus = 'idle' | 'running' | 'waiting_approval' | 'completed' | 'error';

// Tool approval decision
export type ApprovalDecision = 'approve' | 'deny';

// Message types for the terminal
export type TerminalMessageType =
  | 'user'
  | 'assistant'
  | 'tool_use'
  | 'tool_result'
  | 'error'
  | 'system'
  | 'approval_request'
  | 'streaming';

// Base message interface
export interface TerminalMessage {
  id: string;
  type: TerminalMessageType;
  content: string;
  timestamp: number;
  sessionId: string;
  metadata?: Record<string, unknown>;
}

// User message
export interface UserMessage extends TerminalMessage {
  type: 'user';
}

// Assistant message (can be streaming)
export interface AssistantMessage extends TerminalMessage {
  type: 'assistant';
  isStreaming?: boolean;
  parentToolUseId?: string | null;
}

// Tool use request
export interface ToolUseMessage extends TerminalMessage {
  type: 'tool_use';
  toolName: string;
  toolInput: Record<string, unknown>;
  toolUseId: string;
}

// Tool result
export interface ToolResultMessage extends TerminalMessage {
  type: 'tool_result';
  toolName: string;
  toolUseId: string;
  isError?: boolean;
}

// Error message
export interface ErrorMessage extends TerminalMessage {
  type: 'error';
  errorCode?: string;
}

// System message
export interface SystemMessage extends TerminalMessage {
  type: 'system';
  subtype?: 'init' | 'info' | 'warning';
}

// Approval request
export interface ApprovalRequestMessage extends TerminalMessage {
  type: 'approval_request';
  toolName: string;
  toolInput: Record<string, unknown>;
  toolUseId: string;
  pendingApprovalId: string;
}

// Streaming partial message
export interface StreamingMessage extends TerminalMessage {
  type: 'streaming';
  parentMessageId: string;
}

// File change tracking
export interface FileChange {
  id: string;
  sessionId: string;
  filePath: string;
  changeType: 'edit' | 'write' | 'delete' | 'read';
  timestamp: number;
  toolUseId: string;
  preview?: string; // First few lines of change
}

// Union type of all messages
export type AnyTerminalMessage =
  | UserMessage
  | AssistantMessage
  | ToolUseMessage
  | ToolResultMessage
  | ErrorMessage
  | SystemMessage
  | ApprovalRequestMessage
  | StreamingMessage;

// Terminal session
export interface TerminalSession {
  id: string;
  projectPath: string;
  status: SessionStatus;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  lastPrompt?: string;
  totalTokensIn?: number;
  totalTokensOut?: number;
  totalCostUsd?: number;
}

// Pending tool approval
export interface PendingApproval {
  id: string;
  sessionId: string;
  toolUseId: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  createdAt: number;
  status: 'pending' | 'approved' | 'denied';
  decision?: ApprovalDecision;
  decisionReason?: string;
  decidedAt?: number;
}

// Query options
export interface TerminalQueryOptions {
  sessionId?: string;
  resume?: boolean;
  maxTurns?: number;
  allowedTools?: string[];
  disallowedTools?: string[];
  permissionMode?: 'default' | 'acceptEdits' | 'bypassPermissions' | 'plan';
  systemPromptAppend?: string;
  model?: string;
}

// SSE event types
export type SSEEventType =
  | 'message'
  | 'tool_use'
  | 'tool_result'
  | 'approval_request'
  | 'streaming'
  | 'result'
  | 'error'
  | 'connected'
  | 'heartbeat';

// SSE event payload
export interface SSEEvent {
  type: SSEEventType;
  data: AnyTerminalMessage | ResultData | ErrorData | ConnectedData;
  timestamp: number;
}

// Result data from completed query
export interface ResultData {
  sessionId: string;
  result: string;
  isError: boolean;
  numTurns: number;
  durationMs: number;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens?: number;
    cacheCreationTokens?: number;
  };
  totalCostUsd: number;
}

// Error data
export interface ErrorData {
  sessionId: string;
  error: string;
  errorCode?: string;
}

// Connected event data
export interface ConnectedData {
  sessionId: string;
  model: string;
  tools: string[];
  permissionMode: string;
}

// API request/response types
export interface CreateSessionRequest {
  projectPath: string;
}

export interface CreateSessionResponse {
  session: TerminalSession;
}

export interface StartQueryRequest {
  sessionId: string;
  prompt: string;
  options?: TerminalQueryOptions;
}

export interface StartQueryResponse {
  streamUrl: string;
  sessionId: string;
}

export interface ApproveToolRequest {
  sessionId: string;
  pendingApprovalId: string;
  toolUseId: string;
  decision: ApprovalDecision;
  reason?: string;
}

export interface ApproveToolResponse {
  success: boolean;
  message: string;
}

// Database types
export interface DbTerminalSession {
  id: string;
  project_path: string;
  status: SessionStatus;
  created_at: string;
  updated_at: string;
  message_count: number;
  last_prompt: string | null;
  total_tokens_in: number;
  total_tokens_out: number;
  total_cost_usd: number;
}

export interface DbTerminalMessage {
  id: string;
  session_id: string;
  type: TerminalMessageType;
  content: string;
  timestamp: string;
  metadata: string | null; // JSON string
}

export interface DbPendingApproval {
  id: string;
  session_id: string;
  tool_use_id: string;
  tool_name: string;
  tool_input: string; // JSON string
  created_at: string;
  status: 'pending' | 'approved' | 'denied';
  decision: ApprovalDecision | null;
  decision_reason: string | null;
  decided_at: string | null;
}
