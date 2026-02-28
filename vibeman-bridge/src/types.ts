/**
 * Vibeman Bridge Types
 *
 * Shared types for the VS Code extension bridge.
 * SSE events match Vibeman's CLIEvent protocol (protocol.ts).
 */

/** Request body for POST /execute-task */
export interface ExecuteTaskRequest {
  projectPath: string;
  prompt: string;
  model?: string; // e.g. 'gpt-4o', 'gpt-4.1', 'claude-sonnet-4'
}

/** Response from POST /execute-task */
export interface ExecuteTaskResponse {
  executionId: string;
  streamUrl: string;
}

/**
 * SSE event types — must match Vibeman's CLIEvent discriminated union:
 * connected, message, tool_use, tool_result, result, error
 */
export type BridgeEventType = 'connected' | 'message' | 'tool_use' | 'tool_result' | 'result' | 'error';

export interface BridgeEvent {
  type: BridgeEventType;
  data: Record<string, unknown>;
  timestamp: number;
}

/** Tool definition for vscode.lm API */
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

/** Tool execution result */
export interface ToolResult {
  output: string;
  isError?: boolean;
}

/** Active execution tracking */
export interface ActiveExecution {
  id: string;
  projectPath: string;
  prompt: string;
  model: string;
  cancelled: boolean;
  listeners: Set<(event: BridgeEvent) => void>;
  cancelToken: { cancelled: boolean };
}

/** Health check response */
export interface HealthResponse {
  running: boolean;
  models: string[];
  version: string;
}
