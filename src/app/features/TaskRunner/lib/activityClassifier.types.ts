/**
 * Activity Classification Types
 * Used to parse and display Claude Code tool usage from stream-json output
 */

import type {
  ActivityType,
  TaskPhase,
  ToolName,
} from './constants';

export { ActivityType };

export interface ActivityEvent {
  type: ActivityType;
  tool: ToolName;
  target?: string;      // File path or command
  timestamp: Date;
  duration?: number;    // ms since last event
}

export interface TaskActivity {
  currentActivity: ActivityEvent | null;
  activityHistory: ActivityEvent[];  // Last 5 events
  toolCounts: Record<string, number>;
  phase: TaskPhase;
}

/**
 * Stream-JSON message types from Claude Code CLI
 */
export interface StreamJsonSystemInit {
  type: 'system';
  subtype: 'init';
  session_id: string;
  tools?: string[];
}

export interface StreamJsonToolUse {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface StreamJsonAssistantMessage {
  type: 'assistant';
  message: {
    content: Array<StreamJsonToolUse | { type: 'text'; text: string }>;
  };
}

export interface StreamJsonUserMessage {
  type: 'user';
  message: {
    content: Array<{
      type: 'tool_result';
      tool_use_id: string;
      content: string;
    }>;
  };
}

export type StreamJsonMessage =
  | StreamJsonSystemInit
  | StreamJsonAssistantMessage
  | StreamJsonUserMessage;
