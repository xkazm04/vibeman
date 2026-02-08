/**
 * CLI Event Stream Protocol
 *
 * Defines the contract between server (SSE producer) and client (SSE consumer)
 * for all CLI terminal event types. Uses a discriminated union for type safety
 * and a handler registry pattern to replace ad-hoc switch statements.
 */

import type { ExecutionInfo, ExecutionResult, LogEntry, FileChange } from './types';

// ============ Protocol Version ============

export const CLI_PROTOCOL_VERSION = 1;

// ============ Typed Event Discriminated Union ============

export interface ConnectedEvent {
  type: 'connected';
  data: ExecutionInfo & { executionId?: string };
  timestamp: number;
}

export interface MessageEvent {
  type: 'message';
  data: { type: string; content: string; model?: string };
  timestamp: number;
}

export interface ToolUseEvent {
  type: 'tool_use';
  data: { toolUseId: string; toolName: string; toolInput: Record<string, unknown> };
  timestamp: number;
}

export interface ToolResultEvent {
  type: 'tool_result';
  data: { toolUseId: string; content: string };
  timestamp: number;
}

export interface ResultEvent {
  type: 'result';
  data: ExecutionResult;
  timestamp: number;
}

export interface ErrorEvent {
  type: 'error';
  data: { error: string; exitCode?: number };
  timestamp: number;
}

/** All possible CLI SSE event types */
export type CLIEvent =
  | ConnectedEvent
  | MessageEvent
  | ToolUseEvent
  | ToolResultEvent
  | ResultEvent
  | ErrorEvent;

/** The discriminant values */
export type CLIEventType = CLIEvent['type'];

// ============ Handler Registry ============

/** Handler function for a specific event type */
export type EventHandler<T extends CLIEvent = CLIEvent> = (event: T) => void;

/** Map of event type to its handler */
export type EventHandlerMap = {
  [K in CLIEventType]?: EventHandler<Extract<CLIEvent, { type: K }>>;
};

/**
 * Create a protocol handler from a map of typed event handlers.
 *
 * Returns a single `handle(event)` function that dispatches to the correct
 * typed handler. Unknown event types are silently ignored (forward compat).
 *
 * @example
 * ```ts
 * const protocol = createEventProtocol({
 *   connected: (e) => setSessionId(e.data.sessionId),
 *   message: (e) => addLog({ ... }),
 *   result: (e) => setLastResult(e.data),
 *   error: (e) => setError(e.data.error),
 * });
 *
 * // In SSE onmessage:
 * const event = decodeEvent(raw);
 * if (event) protocol.handle(event);
 * ```
 */
export function createEventProtocol(handlers: EventHandlerMap) {
  return {
    handle(event: CLIEvent): void {
      const handler = handlers[event.type] as EventHandler<typeof event> | undefined;
      if (handler) {
        handler(event);
      }
    },

    /** Check if this event type signals stream completion */
    isTerminal(event: CLIEvent): boolean {
      return event.type === 'result' || event.type === 'error';
    },
  };
}

// ============ Codec ============

/**
 * Decode a raw SSE data string into a typed CLIEvent.
 * Returns null for unparseable or unknown event shapes.
 */
export function decodeEvent(raw: string): CLIEvent | null {
  try {
    const parsed = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof parsed.type === 'string' &&
      typeof parsed.timestamp === 'number' &&
      typeof parsed.data === 'object'
    ) {
      return parsed as CLIEvent;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Encode a CLIEvent to a JSON string for SSE transmission.
 */
export function encodeEvent(event: CLIEvent): string {
  return JSON.stringify(event);
}

// ============ Helpers ============

/** Generate a unique log entry ID */
export function makeLogId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Create a LogEntry from a MessageEvent */
export function messageToLog(event: MessageEvent): LogEntry | null {
  if (event.data.type !== 'assistant' || !event.data.content) return null;
  return {
    id: makeLogId('msg'),
    type: 'assistant',
    content: event.data.content,
    timestamp: event.timestamp,
    model: event.data.model,
  };
}

/** Create a LogEntry from a ToolUseEvent */
export function toolUseToLog(event: ToolUseEvent): LogEntry {
  return {
    id: makeLogId('tool'),
    type: 'tool_use',
    content: event.data.toolName,
    timestamp: event.timestamp,
    toolName: event.data.toolName,
    toolInput: event.data.toolInput,
  };
}

/** Create a LogEntry from a ToolResultEvent */
export function toolResultToLog(event: ToolResultEvent, maxLen = 200): LogEntry {
  const content = typeof event.data.content === 'string'
    ? event.data.content.slice(0, maxLen)
    : JSON.stringify(event.data.content).slice(0, maxLen);
  return {
    id: makeLogId('result'),
    type: 'tool_result',
    content,
    timestamp: event.timestamp,
  };
}

/** Create a LogEntry from an ErrorEvent */
export function errorToLog(event: ErrorEvent): LogEntry {
  return {
    id: makeLogId('error'),
    type: 'error',
    content: event.data.error,
    timestamp: event.timestamp,
  };
}

/** Extract a FileChange from a ToolUseEvent (if applicable) */
export function toolUseToFileChange(
  event: ToolUseEvent,
  sessionId: string,
): FileChange | null {
  const { toolName, toolInput, toolUseId } = event.data;
  if (!['Edit', 'Write', 'Read'].includes(toolName)) return null;

  const filePath = toolInput.file_path as string;
  if (!filePath) return null;

  return {
    id: `fc-${Date.now()}`,
    sessionId,
    filePath,
    changeType: toolName === 'Edit' ? 'edit' : toolName === 'Write' ? 'write' : 'read',
    timestamp: event.timestamp,
    toolUseId,
  };
}
