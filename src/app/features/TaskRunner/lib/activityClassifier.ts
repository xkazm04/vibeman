/**
 * Activity Classifier
 * Parses Claude Code stream-json output to extract tool usage and classify activity
 */

import type {
  ActivityType,
  ActivityEvent,
  TaskActivity,
  StreamJsonMessage,
  StreamJsonToolUse,
} from './activityClassifier.types';

/**
 * Map tool names to activity types
 */
const TOOL_TO_ACTIVITY: Record<string, ActivityType> = {
  'Read': 'reading',
  'Edit': 'editing',
  'Write': 'writing',
  'Grep': 'searching',
  'Glob': 'searching',
  'Bash': 'executing',
  'TodoWrite': 'planning',
  'Task': 'thinking',
  'WebSearch': 'searching',
  'WebFetch': 'reading',
  'LSP': 'reading',
  'NotebookEdit': 'editing',
};

/**
 * Activity icons for display
 */
const ACTIVITY_ICONS: Record<ActivityType, string> = {
  reading: '📖',
  editing: '✏️',
  writing: '📝',
  searching: '🔍',
  executing: '🔧',
  planning: '📋',
  thinking: '💭',
  idle: '⏸️',
};

/**
 * Activity labels for display
 */
const ACTIVITY_LABELS: Record<ActivityType, string> = {
  reading: 'Reading',
  editing: 'Editing',
  writing: 'Writing',
  searching: 'Searching',
  executing: 'Executing',
  planning: 'Planning',
  thinking: 'Analyzing',
  idle: 'Idle',
};

/**
 * Parse a single line from stream-json output
 * Returns an ActivityEvent if a tool_use is detected, null otherwise
 */
export function parseStreamJsonLine(line: string): ActivityEvent | null {
  if (!line.trim()) return null;

  try {
    const parsed = JSON.parse(line) as StreamJsonMessage;

    // Handle assistant messages with tool_use
    if (parsed.type === 'assistant' && 'message' in parsed) {
      const content = parsed.message?.content;
      if (!Array.isArray(content)) return null;

      // Find first tool_use in content
      const toolUse = content.find(
        (item): item is StreamJsonToolUse => item.type === 'tool_use'
      );

      if (toolUse) {
        return createActivityEvent(toolUse);
      }
    }

    return null;
  } catch {
    // Not valid JSON or unexpected format
    return null;
  }
}

/**
 * Create an ActivityEvent from a tool_use object
 */
function createActivityEvent(toolUse: StreamJsonToolUse): ActivityEvent {
  const tool = toolUse.name;
  const type = TOOL_TO_ACTIVITY[tool] || 'thinking';
  const target = extractTarget(toolUse);

  return {
    type,
    tool,
    target,
    timestamp: new Date(),
  };
}

/**
 * Extract the target (file path or command) from tool input
 */
function extractTarget(toolUse: StreamJsonToolUse): string | undefined {
  const input = toolUse.input;
  if (!input || typeof input !== 'object') return undefined;

  // File-based tools
  if ('file_path' in input && typeof input.file_path === 'string') {
    return truncatePath(input.file_path);
  }

  // Grep/Glob pattern
  if ('pattern' in input && typeof input.pattern === 'string') {
    return input.pattern;
  }

  // Bash command
  if ('command' in input && typeof input.command === 'string') {
    return truncateCommand(input.command);
  }

  // TodoWrite - use first todo content
  if ('todos' in input && Array.isArray(input.todos) && input.todos.length > 0) {
    const firstTodo = input.todos[0];
    if (typeof firstTodo === 'object' && firstTodo && 'content' in firstTodo) {
      return String(firstTodo.content).slice(0, 40);
    }
  }

  return undefined;
}

/**
 * Truncate a file path for display (keep last 2 segments)
 */
function truncatePath(path: string): string {
  const segments = path.replace(/\\/g, '/').split('/');
  if (segments.length <= 2) return path;
  return '...' + segments.slice(-2).join('/');
}

/**
 * Truncate a command for display
 */
function truncateCommand(command: string): string {
  const firstLine = command.split('\n')[0];
  if (firstLine.length <= 50) return firstLine;
  return firstLine.slice(0, 47) + '...';
}

/**
 * Parse multiple progress lines and extract activity events
 */
export function parseProgressLines(lines: string[]): ActivityEvent[] {
  const events: ActivityEvent[] = [];

  for (const line of lines) {
    // Extract JSON content from progress line format: [timestamp] [STDOUT] {...}
    const jsonMatch = line.match(/\[STDOUT\]\s*(.+)$/);
    if (jsonMatch) {
      const event = parseStreamJsonLine(jsonMatch[1]);
      if (event) {
        events.push(event);
      }
    }
  }

  return events;
}

/**
 * Classify overall activity from a list of events
 */
export function classifyActivity(events: ActivityEvent[]): TaskActivity {
  const toolCounts: Record<string, number> = {};

  // Count tool usage
  for (const event of events) {
    toolCounts[event.tool] = (toolCounts[event.tool] || 0) + 1;
  }

  // Calculate durations between events
  const eventsWithDuration = events.map((event, index) => {
    if (index === 0) return event;
    const prevEvent = events[index - 1];
    const duration = event.timestamp.getTime() - prevEvent.timestamp.getTime();
    return { ...event, duration };
  });

  // Get current activity (most recent)
  const currentActivity = eventsWithDuration.length > 0
    ? eventsWithDuration[eventsWithDuration.length - 1]
    : null;

  // Get last 5 events for history
  const activityHistory = eventsWithDuration.slice(-5);

  // Determine phase based on recent activity patterns
  const phase = determinePhase(eventsWithDuration.slice(-10));

  return {
    currentActivity,
    activityHistory,
    toolCounts,
    phase,
  };
}

/**
 * Determine the current phase of execution based on recent activity
 */
function determinePhase(recentEvents: ActivityEvent[]): TaskActivity['phase'] {
  if (recentEvents.length === 0) return 'idle';

  // Count activity types in recent events
  const typeCounts: Record<ActivityType, number> = {
    reading: 0,
    editing: 0,
    writing: 0,
    searching: 0,
    executing: 0,
    planning: 0,
    thinking: 0,
    idle: 0,
  };

  for (const event of recentEvents) {
    typeCounts[event.type]++;
  }

  // Determine phase based on dominant activity
  if (typeCounts.planning > 0 && typeCounts.editing === 0) {
    return 'planning';
  }
  if (typeCounts.executing > typeCounts.editing) {
    return 'validating';
  }
  if (typeCounts.editing > 0 || typeCounts.writing > 0) {
    return 'implementing';
  }
  if (typeCounts.reading > 0 || typeCounts.searching > 0) {
    return 'analyzing';
  }

  return 'idle';
}

/**
 * Get the icon for an activity type
 */
export function getActivityIcon(type: ActivityType): string {
  return ACTIVITY_ICONS[type] || '❓';
}

/**
 * Get the label for an activity type
 */
export function getActivityLabel(type: ActivityType): string {
  return ACTIVITY_LABELS[type] || 'Unknown';
}

/**
 * Format an activity event for display
 */
export function formatActivityEvent(event: ActivityEvent): string {
  const icon = getActivityIcon(event.type);
  const label = getActivityLabel(event.type);
  const target = event.target ? ` ${event.target}` : '';
  return `${icon} ${label}${target}`;
}

/**
 * Get phase icon
 */
export function getPhaseIcon(phase: TaskActivity['phase']): string {
  switch (phase) {
    case 'analyzing': return '🔍';
    case 'planning': return '📋';
    case 'implementing': return '🔨';
    case 'validating': return '✅';
    case 'idle': return '⏸️';
    default: return '❓';
  }
}

/**
 * Get phase label
 */
export function getPhaseLabel(phase: TaskActivity['phase']): string {
  switch (phase) {
    case 'analyzing': return 'Analyzing';
    case 'planning': return 'Planning';
    case 'implementing': return 'Implementing';
    case 'validating': return 'Validating';
    case 'idle': return 'Idle';
    default: return 'Unknown';
  }
}
