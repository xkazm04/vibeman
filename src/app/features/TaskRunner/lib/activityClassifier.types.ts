/**
 * Activity Classification Types
 * Used to parse and display Claude Code tool usage from stream-json output
 */

export type ActivityType =
  | 'reading'      // Read tool
  | 'editing'      // Edit tool
  | 'writing'      // Write tool
  | 'searching'    // Grep, Glob tools
  | 'executing'    // Bash tool
  | 'planning'     // TodoWrite tool
  | 'thinking'     // No tool, assistant thinking
  | 'idle';        // No recent activity

export interface ActivityEvent {
  type: ActivityType;
  tool: string;
  target?: string;      // File path or command
  timestamp: Date;
  duration?: number;    // ms since last event
}

export interface TaskActivity {
  currentActivity: ActivityEvent | null;
  activityHistory: ActivityEvent[];  // Last 5 events
  toolCounts: Record<string, number>;
  phase: 'analyzing' | 'planning' | 'implementing' | 'validating' | 'idle';
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
