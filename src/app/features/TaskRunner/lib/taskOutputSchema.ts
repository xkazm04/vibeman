/**
 * Task Output Schema
 *
 * Typed JSON schema contract between CLI stream output and Vibeman consumers.
 * Replaces fragile regex extraction and manual content-array walking with
 * a single normalization layer that produces typed, discriminated-union events.
 *
 * 5 event types:
 *   1. tool_invocation  — A tool was called (Read, Edit, Bash, etc.)
 *   2. progress_update  — Phase transition or milestone checkpoint
 *   3. file_change      — File was created, modified, or deleted
 *   4. completion        — Task finished (success or failure)
 *   5. system_init      — Session initialization metadata
 *
 * Consumers import TaskOutputEvent and switch on `event` field.
 */

import type { ToolName, ActivityType, TaskPhase } from './constants';
import type {
  StreamJsonMessage,
  StreamJsonToolUse,
} from './activityClassifier.types';
import { TOOL_NAMES } from './constants';

// ============================================================================
// Event Types (discriminated union)
// ============================================================================

export interface ToolInvocationEvent {
  event: 'tool_invocation';
  tool: ToolName;
  activityType: ActivityType;
  target?: string;
  /** Raw tool input for consumers that need full detail */
  input?: Record<string, unknown>;
  timestamp: Date;
}

export interface ProgressUpdateEvent {
  event: 'progress_update';
  phase: TaskPhase;
  /** Human-readable status message */
  message: string;
  timestamp: Date;
}

export interface FileChangeEvent {
  event: 'file_change';
  action: 'create' | 'modify' | 'delete';
  filePath: string;
  tool: 'Edit' | 'Write' | 'Bash';
  timestamp: Date;
}

export interface CompletionEvent {
  event: 'completion';
  success: boolean;
  message: string;
  timestamp: Date;
}

export interface SystemInitEvent {
  event: 'system_init';
  sessionId: string;
  tools: string[];
  timestamp: Date;
}

/**
 * Discriminated union of all structured task output events.
 * Consumers switch on `event` field for exhaustive handling.
 */
export type TaskOutputEvent =
  | ToolInvocationEvent
  | ProgressUpdateEvent
  | FileChangeEvent
  | CompletionEvent
  | SystemInitEvent;

// ============================================================================
// Tool → Activity mapping (single source of truth)
// ============================================================================

const TOOL_TO_ACTIVITY: Record<string, ActivityType> = {
  [TOOL_NAMES.Read]: 'reading',
  [TOOL_NAMES.Edit]: 'editing',
  [TOOL_NAMES.Write]: 'writing',
  [TOOL_NAMES.Grep]: 'searching',
  [TOOL_NAMES.Glob]: 'searching',
  [TOOL_NAMES.Bash]: 'executing',
  [TOOL_NAMES.TodoWrite]: 'planning',
  [TOOL_NAMES.Task]: 'thinking',
  [TOOL_NAMES.WebSearch]: 'searching',
  [TOOL_NAMES.WebFetch]: 'reading',
  [TOOL_NAMES.LSP]: 'reading',
  [TOOL_NAMES.NotebookEdit]: 'editing',
};

// ============================================================================
// Target extraction (single source of truth)
// ============================================================================

function extractTarget(toolUse: StreamJsonToolUse): string | undefined {
  const input = toolUse.input;
  if (!input || typeof input !== 'object') return undefined;

  if ('file_path' in input && typeof input.file_path === 'string') {
    return truncatePath(input.file_path);
  }
  if ('pattern' in input && typeof input.pattern === 'string') {
    return input.pattern;
  }
  if ('command' in input && typeof input.command === 'string') {
    return truncateCommand(input.command);
  }
  if ('todos' in input && Array.isArray(input.todos) && input.todos.length > 0) {
    const firstTodo = input.todos[0];
    if (typeof firstTodo === 'object' && firstTodo && 'content' in firstTodo) {
      return String(firstTodo.content).slice(0, 40);
    }
  }

  return undefined;
}

function truncatePath(path: string): string {
  const segments = path.replace(/\\/g, '/').split('/');
  if (segments.length <= 2) return path;
  return '...' + segments.slice(-2).join('/');
}

function truncateCommand(command: string): string {
  const firstLine = command.split('\n')[0];
  if (firstLine.length <= 50) return firstLine;
  return firstLine.slice(0, 47) + '...';
}

// ============================================================================
// File change extraction
// ============================================================================

function extractFileChanges(toolUse: StreamJsonToolUse, timestamp: Date): FileChangeEvent[] {
  const input = toolUse.input;
  if (!input || typeof input !== 'object') return [];

  const events: FileChangeEvent[] = [];

  if (toolUse.name === TOOL_NAMES.Write && 'file_path' in input && typeof input.file_path === 'string') {
    events.push({
      event: 'file_change',
      action: 'create',
      filePath: input.file_path,
      tool: 'Write',
      timestamp,
    });
  }

  if (toolUse.name === TOOL_NAMES.Edit && 'file_path' in input && typeof input.file_path === 'string') {
    events.push({
      event: 'file_change',
      action: 'modify',
      filePath: input.file_path,
      tool: 'Edit',
      timestamp,
    });
  }

  // Bash commands that create/modify/delete files are harder to detect statically
  // but we can catch common patterns
  if (toolUse.name === TOOL_NAMES.Bash && 'command' in input && typeof input.command === 'string') {
    const cmd = input.command;
    if (cmd.match(/\brm\s+(-[rf]+\s+)?/)) {
      // Rough heuristic: rm commands indicate deletion
      const fileMatch = cmd.match(/\brm\s+(?:-[rf]+\s+)?(.+)/);
      if (fileMatch) {
        events.push({
          event: 'file_change',
          action: 'delete',
          filePath: fileMatch[1].trim().split(/\s/)[0],
          tool: 'Bash',
          timestamp,
        });
      }
    }
  }

  return events;
}

// ============================================================================
// Structured Parser — the single normalization layer
// ============================================================================

/** Regex to extract STDOUT content from progress line format: [timestamp] [STDOUT] {...} */
const STDOUT_REGEX = /\[STDOUT\]\s*(.+)$/;

/** Regex to match completion markers in progress lines */
const COMPLETION_SUCCESS = /✓ Execution completed/;
const COMPLETION_FAILURE = /✗ Execution failed|✗ Session limit reached/;
const SESSION_ID_CAPTURE = /Session ID captured: (.+)/;

/**
 * Parse a single raw progress line into zero or more structured events.
 * This is the single fragile-parsing boundary — all regex and JSON walking
 * is isolated here. Consumers never touch raw strings.
 */
export function parseProgressLine(line: string): TaskOutputEvent[] {
  if (!line.trim()) return [];

  const events: TaskOutputEvent[] = [];
  const timestamp = new Date();

  // Check for completion markers (non-JSON lines from the execution queue)
  if (COMPLETION_SUCCESS.test(line)) {
    events.push({
      event: 'completion',
      success: true,
      message: 'Execution completed successfully',
      timestamp,
    });
    return events;
  }

  if (COMPLETION_FAILURE.test(line)) {
    events.push({
      event: 'completion',
      success: false,
      message: line.includes('Session limit') ? 'Session limit reached' : 'Execution failed',
      timestamp,
    });
    return events;
  }

  if (SESSION_ID_CAPTURE.test(line)) {
    const match = line.match(SESSION_ID_CAPTURE);
    if (match) {
      events.push({
        event: 'system_init',
        sessionId: match[1],
        tools: [],
        timestamp,
      });
    }
    return events;
  }

  // Extract JSON from STDOUT marker
  const stdoutMatch = line.match(STDOUT_REGEX);
  if (!stdoutMatch) return events;

  const jsonStr = stdoutMatch[1];

  try {
    const parsed = JSON.parse(jsonStr) as StreamJsonMessage;

    // System init message
    if (parsed.type === 'system' && 'subtype' in parsed && parsed.subtype === 'init') {
      events.push({
        event: 'system_init',
        sessionId: parsed.session_id,
        tools: parsed.tools || [],
        timestamp,
      });
      return events;
    }

    // Assistant messages with tool_use
    if (parsed.type === 'assistant' && 'message' in parsed) {
      const content = parsed.message?.content;
      if (!Array.isArray(content)) return events;

      for (const item of content) {
        if (item.type === 'tool_use') {
          const toolUse = item as StreamJsonToolUse;
          const tool = toolUse.name;
          const activityType = TOOL_TO_ACTIVITY[tool] || 'thinking';

          // Emit tool invocation event
          events.push({
            event: 'tool_invocation',
            tool: tool as ToolName,
            activityType,
            target: extractTarget(toolUse),
            input: toolUse.input,
            timestamp,
          });

          // Emit file change events if applicable
          const fileChanges = extractFileChanges(toolUse, timestamp);
          events.push(...fileChanges);

          // Emit progress update for TodoWrite (planning phase)
          if (tool === TOOL_NAMES.TodoWrite) {
            events.push({
              event: 'progress_update',
              phase: 'planning',
              message: extractTarget(toolUse) || 'Updating task plan',
              timestamp,
            });
          }
        }
      }
    }
  } catch {
    // Not valid JSON — skip silently
  }

  return events;
}

/**
 * Parse multiple raw progress lines into a flat array of structured events.
 * This replaces `parseProgressLines` from activityClassifier.ts as the
 * primary entry point for batch parsing.
 */
export function parseAllProgressLines(lines: string[]): TaskOutputEvent[] {
  const events: TaskOutputEvent[] = [];
  for (const line of lines) {
    events.push(...parseProgressLine(line));
  }
  return events;
}

// ============================================================================
// Event Filtering Utilities
// ============================================================================

/**
 * Extract only tool invocation events (for activity classification).
 */
export function getToolInvocations(events: TaskOutputEvent[]): ToolInvocationEvent[] {
  return events.filter((e): e is ToolInvocationEvent => e.event === 'tool_invocation');
}

/**
 * Extract only file change events (for change manifests).
 */
export function getFileChanges(events: TaskOutputEvent[]): FileChangeEvent[] {
  return events.filter((e): e is FileChangeEvent => e.event === 'file_change');
}

/**
 * Extract completion event if present.
 */
export function getCompletion(events: TaskOutputEvent[]): CompletionEvent | undefined {
  return events.find((e): e is CompletionEvent => e.event === 'completion');
}

/**
 * Extract system init event if present.
 */
export function getSystemInit(events: TaskOutputEvent[]): SystemInitEvent | undefined {
  return events.find((e): e is SystemInitEvent => e.event === 'system_init');
}

/**
 * Build a file change manifest from events.
 */
export function buildFileManifest(events: TaskOutputEvent[]): {
  created: string[];
  modified: string[];
  deleted: string[];
} {
  const manifest = { created: [] as string[], modified: [] as string[], deleted: [] as string[] };

  for (const e of getFileChanges(events)) {
    switch (e.action) {
      case 'create':
        if (!manifest.created.includes(e.filePath)) manifest.created.push(e.filePath);
        break;
      case 'modify':
        if (!manifest.modified.includes(e.filePath)) manifest.modified.push(e.filePath);
        break;
      case 'delete':
        if (!manifest.deleted.includes(e.filePath)) manifest.deleted.push(e.filePath);
        break;
    }
  }

  return manifest;
}
